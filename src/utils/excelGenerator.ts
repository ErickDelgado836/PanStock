import XLSX from 'xlsx-js-style';
import { MovementRecord, Product, Category, Warehouse, WarehouseCategoryLastAudit } from '../types';
import { DEFAULT_WAREHOUSES } from '../data/seedData';
import {
  AuditReportExportSummary,
  AuditReportExportItem,
  ExpiryReportPDFSummary,
  ExpiryReportPDFItem,
} from './pdfGenerator';

/**
 * Format timestamp suffix for consistent, readable file naming
 */
function getTimestampSuffix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${mins}`;
}

/**
 * Enterprise Palette for Excel (Hex strings without '#')
 */
const COLORS = {
  headerBg: '1E293B', // Slate 800 (Table Headers)
  headerText: 'FFFFFF', // White
  bannerPrimaryBg: '0F172A', // Slate 900 (Main Title Banner)
  bannerPrimaryText: 'FFFFFF',
  bannerSecondaryBg: 'E2E8F0', // Slate 200 (Sub-banner)
  bannerSecondaryText: '0F172A',
  sectionBg: 'FEF3C7', // Amber 100 (Section header)
  sectionText: '78350F', // Amber 900
  metaKeyBg: 'F1F5F9', // Slate 100
  metaKeyText: '334155', // Slate 700
  metaValBg: 'FFFFFF',
  metaValText: '0F172A',
  zebraEven: 'FFFFFF',
  zebraOdd: 'F8FAFC', // Slate 50
  border: 'CBD5E1', // Slate 300 (Crisp gridlines)
  borderDark: '94A3B8', // Slate 400
  totalBg: 'FEF3C7', // Warm Amber (Totals)
  totalText: '78350F',
  dangerBg: 'FEE2E2', // Red 100
  dangerText: '991B1B', // Red 800
  warningBg: 'FEF3C7', // Amber 100
  warningText: '92400E', // Amber 800
  successBg: 'DCFCE7', // Emerald 100
  successText: '166534', // Emerald 800
};

/**
 * Standard Cell Borders
 */
const thinBorder = {
  top: { style: 'thin', color: { rgb: COLORS.border } },
  bottom: { style: 'thin', color: { rgb: COLORS.border } },
  left: { style: 'thin', color: { rgb: COLORS.border } },
  right: { style: 'thin', color: { rgb: COLORS.border } },
};

const headerBorder = {
  top: { style: 'medium', color: { rgb: '0F172A' } },
  bottom: { style: 'medium', color: { rgb: '0F172A' } },
  left: { style: 'thin', color: { rgb: '475569' } },
  right: { style: 'thin', color: { rgb: '475569' } },
};

const totalBorder = {
  top: { style: 'thin', color: { rgb: COLORS.borderDark } },
  bottom: { style: 'double', color: { rgb: '0F172A' } },
  left: { style: 'thin', color: { rgb: COLORS.border } },
  right: { style: 'thin', color: { rgb: COLORS.border } },
};

/**
 * Automatically fits column widths to their widest content so no cell text is clipped.
 */
function autoFitColumns(
  data: (string | number | null | undefined)[][],
  minWidths?: Record<number, number>,
  maxWidth = 60
): { wch: number }[] {
  const colWidths: number[] = [];

  data.forEach((row, rowIndex) => {
    // Avoid wide full-row banners from expanding column A
    const isMergedBanner =
      row.length > 0 &&
      (row[1] === '' || row[1] === undefined || row[1] === null) &&
      row[0] !== '' &&
      row[0] !== undefined;

    row.forEach((cell, colIndex) => {
      if (colIndex === 0 && isMergedBanner) return;
      if (cell === null || cell === undefined) return;

      const str = String(cell);
      const lines = str.split('\n');
      const maxLineLen = Math.max(...lines.map((l) => l.length));

      const currentMax = colWidths[colIndex] || 0;
      if (maxLineLen > currentMax) {
        colWidths[colIndex] = maxLineLen;
      }
    });
  });

  return colWidths.map((len, idx) => {
    const min = minWidths?.[idx] || 14;
    // Add 4 characters padding for optimal visual comfort
    const calculated = Math.max(len + 4, min);
    return { wch: Math.min(calculated, maxWidth) };
  });
}

/**
 * Universal browser-safe workbook file downloader.
 */
function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
  try {
    XLSX.writeFile(wb, filename);
  } catch {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }
}

/**
 * EXPORT 1: Comprobante Individual de Movimiento (Nota de Ingreso, Traslado, Descargo, Venta)
 */
export function exportMovementToExcel(movement: MovementRecord) {
  const wb = XLSX.utils.book_new();

  const sourceWh = DEFAULT_WAREHOUSES.find((w) => w.id === movement.sourceWarehouseId);
  const targetWh = DEFAULT_WAREHOUSES.find((w) => w.id === movement.targetWarehouseId);

  let typeLabel = 'MOVIMIENTO DE INVENTARIO';
  if (movement.type === 'ENTRADA') typeLabel = 'NOTA DE INGRESO / ENTRADA';
  if (movement.type === 'TRASLADO') typeLabel = 'NOTA DE TRASLADO ENTRE ALMACENES';
  if (movement.type === 'DESCARGO') typeLabel = 'NOTA DE DESCARGO / SALIDA';
  if (movement.type === 'VENTA') typeLabel = 'COMPROBANTE DE SALIDA POR VENTA';
  if (movement.type === 'AJUSTE_INVENTARIO') typeLabel = 'AJUSTE DE INVENTARIO';
  if (movement.type === 'EDICION_VENCIMIENTO') typeLabel = 'MODIFICACIÓN DE VENCIMIENTO';

  let destinationOrClient = targetWh ? `${targetWh.code} - ${targetWh.name}` : 'N/A';
  if (movement.type === 'VENTA') {
    destinationOrClient = movement.targetWarehouseId || 'Cliente Mostrador';
  }

  const data: (string | number | null | undefined)[][] = [
    // Row 0: Company Banner
    ['PANADERÍA ESPAÑOLA C.A. - RIF: J-070054034', '', '', '', '', '', ''],
    // Row 1: Document Subtitle Banner
    [`COMPROBANTE OFICIAL DE ${typeLabel}`, '', '', '', '', '', ''],
    // Rows 2-5: Key-Value Information Card
    [
      'N° Documento / Control:',
      movement.docRef || movement.movementNumber,
      'N° Movimiento Interno:',
      movement.movementNumber,
      '',
      '',
      '',
    ],
    ['Fecha y Hora:', movement.date, 'Tipo Operación:', movement.type, '', '', ''],
    [
      'Almacén Origen:',
      sourceWh ? `${sourceWh.code} - ${sourceWh.name}` : 'N/A',
      'Destino / Receptor:',
      destinationOrClient,
      '',
      '',
      '',
    ],
    [
      'Responsable Registro:',
      movement.responsibleUser,
      'Observaciones / Notas:',
      movement.notes || 'Sin observaciones',
      '',
      '',
      '',
    ],
    // Row 6: Empty spacer
    ['', '', '', '', '', '', ''],
    // Row 7: Section Header Banner
    ['--- DETALLE DE PRODUCTOS ---', '', '', '', '', '', ''],
    // Row 8: Table Column Headers
    ['N°', 'Código', 'Descripción del Producto', 'Cantidad', 'Unidad', 'Lote Asignado', 'Fecha Vencimiento'],
  ];

  const tableStartRow = 9;
  let totalUnits = 0;

  movement.items.forEach((item, idx) => {
    totalUnits += item.quantity;
    const expDate =
      item.newExpirationDate || item.expirationDate || item.previousExpirationDate || 'N/A';
    data.push([
      idx + 1,
      item.productCode,
      item.productName,
      item.quantity,
      item.unit,
      item.lotNumber || 'Sin Lote',
      expDate,
    ]);
  });

  const tableEndRow = tableStartRow + movement.items.length - 1;

  // Spacer & Totals
  data.push(['', '', '', '', '', '', '']);
  const totalsRowIdx = data.length;
  data.push([
    'TOTALES',
    '',
    `TOTAL PRODUCTOS: ${movement.items.length}`,
    totalUnits,
    'Unidades Registradas',
    '',
    '',
  ]);

  // Spacer & Signatures
  data.push(['', '', '', '', '', '', '']);
  const signHeaderIdx = data.length;
  data.push(['FIRMAS Y CONFORMIDAD:', '', '', '', '', '', '']);
  const signDataIdx = data.length;
  data.push([
    'Despachado / Procesado por:',
    movement.responsibleUser,
    '',
    'Recibido Conforme (Firma):',
    '____________________',
    '',
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Define Cell Merges
  ws['!merges'] = [
    // Header banners
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    // Metadata row right values spanning cols D to G
    { s: { r: 2, c: 3 }, e: { r: 2, c: 6 } },
    { s: { r: 3, c: 3 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 3 }, e: { r: 4, c: 6 } },
    { s: { r: 5, c: 3 }, e: { r: 5, c: 6 } },
    // Section banner
    { s: { r: 7, c: 0 }, e: { r: 7, c: 6 } },
    // Totals title
    { s: { r: totalsRowIdx, c: 0 }, e: { r: totalsRowIdx, c: 1 } },
    // Signatures header
    { s: { r: signHeaderIdx, c: 0 }, e: { r: signHeaderIdx, c: 6 } },
    // Signatures row
    { s: { r: signDataIdx, c: 1 }, e: { r: signDataIdx, c: 2 } },
    { s: { r: signDataIdx, c: 4 }, e: { r: signDataIdx, c: 6 } },
  ];

  // Apply Full Professional Cell Styles & Grid Borders
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:G20');

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };

      if (R === 0) {
        // Main Company Header
        ws[addr].s = {
          font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: COLORS.bannerPrimaryText } },
          fill: { fgColor: { rgb: COLORS.bannerPrimaryBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 1) {
        // Subtitle Document Type
        ws[addr].s = {
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: COLORS.bannerSecondaryText } },
          fill: { fgColor: { rgb: COLORS.bannerSecondaryBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R >= 2 && R <= 5) {
        // Metadata Card
        const isKey = C === 0 || C === 2;
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: isKey, color: { rgb: isKey ? COLORS.metaKeyText : COLORS.metaValText } },
          fill: { fgColor: { rgb: isKey ? COLORS.metaKeyBg : COLORS.metaValBg } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: thinBorder,
        };
      } else if (R === 7) {
        // Section Banner
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.sectionText } },
          fill: { fgColor: { rgb: COLORS.sectionBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 8) {
        // Table Column Headers
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.headerText } },
          fill: { fgColor: { rgb: COLORS.headerBg } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          border: headerBorder,
        };
      } else if (R >= tableStartRow && R <= tableEndRow) {
        // Table Data Rows
        const isOdd = (R - tableStartRow) % 2 === 1;
        const alignH = C === 3 ? 'right' : C === 2 ? 'left' : 'center';
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: C === 1 || C === 3, color: { rgb: '0F172A' } },
          fill: { fgColor: { rgb: isOdd ? COLORS.zebraOdd : COLORS.zebraEven } },
          alignment: { vertical: 'center', horizontal: alignH },
          border: thinBorder,
        };
      } else if (R === totalsRowIdx) {
        // Totals Row
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.totalText } },
          fill: { fgColor: { rgb: COLORS.totalBg } },
          alignment: { vertical: 'center', horizontal: C === 3 ? 'right' : 'center' },
          border: totalBorder,
        };
      } else if (R === signHeaderIdx) {
        // Signatures Section Header
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.metaKeyText } },
          fill: { fgColor: { rgb: COLORS.metaKeyBg } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: thinBorder,
        };
      } else if (R === signDataIdx) {
        // Signatures Data
        const isLabel = C === 0 || C === 3;
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: isLabel, color: { rgb: isLabel ? COLORS.metaKeyText : COLORS.metaValText } },
          fill: { fgColor: { rgb: isLabel ? COLORS.metaKeyBg : COLORS.metaValBg } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: thinBorder,
        };
      }
    }
  }

  // Auto-fit Column Widths with Generous Minimums to prevent any truncation
  ws['!cols'] = autoFitColumns(data, {
    0: 26, // N° Documento / Control / N°
    1: 22, // Reference Code / Dates
    2: 38, // Product Description / Labels
    3: 26, // Destination / Quantity
    4: 22, // Unit / Registered units
    5: 20, // Lot
    6: 20, // Expiration
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Comprobante');
  const cleanDoc = (movement.docRef || movement.movementNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${movement.type}_${cleanDoc}_PanStock.xlsx`;
  saveWorkbook(wb, filename);
}

/**
 * EXPORT 2: Auditoría Física / Estado Real de Conteos en Almacén
 */
export function exportAuditReportToExcel(
  summary: AuditReportExportSummary,
  items: AuditReportExportItem[]
) {
  const wb = XLSX.utils.book_new();

  const data: (string | number | null | undefined)[][] = [
    ['PANADERÍA ESPAÑOLA C.A. - RIF: J-070054034', '', '', '', '', ''],
    ['REPORTE GENERAL DE ESTADO REAL DE CONTEOS FÍSICOS EN ALMACÉN', '', '', '', '', ''],
    ['Fecha de Emisión:', new Date().toLocaleString('es-VE'), 'Filtro de Fechas:', summary.dateRangeText, '', ''],
    ['Almacén Evaluado:', summary.warehouseName, 'Categoría / Subgrupo:', summary.categoryName, '', ''],
    ['', '', '', '', '', ''],
    ['--- RESUMEN EJECUTIVO DE AUDITORÍA ---', '', '', '', '', ''],
    [
      'Total Ítems Evaluados',
      'Auditados (Con Conteo)',
      'Pendientes (Sin Conteo)',
      'Correctos (Sin Diferencia)',
      'Con Faltante Detectado',
      'Con Sobrante Detectado',
    ],
    [
      summary.totalItems,
      summary.auditedItems,
      summary.pendingItems,
      summary.correctItems,
      summary.missingItems,
      summary.surplusItems,
    ],
    ['', '', '', '', '', ''],
    [
      'Código',
      'Descripción del Producto',
      'Categoría',
      'Almacén Código',
      'Nombre Almacén',
      'Existencia Sistema Actual',
      'Existencia al Momento Conteo',
      'Conteo Físico Verificado',
      'Diferencia Numérica',
      'Diagnóstico / Estado',
      'Unidad',
      'Fecha Última Auditoría',
      'Auditor / Responsable',
      'Movimientos Post-Auditoría',
      'Físico Estimado Actual',
    ],
  ];

  const tableHeaderRow = 9;

  items.forEach((item) => {
    let statusLabel = 'Pendiente / Sin Conteo';
    if (item.status === 'CORRECT') statusLabel = 'Correcto (Sin diferencia)';
    if (item.status === 'MISSING') statusLabel = 'Faltante Detectado';
    if (item.status === 'SURPLUS') statusLabel = 'Sobrante Detectado';

    data.push([
      item.productCode,
      item.productName,
      item.categoryName,
      item.warehouseCode,
      item.warehouseName,
      item.systemStock,
      item.auditSystemStock !== null && item.auditSystemStock !== undefined ? item.auditSystemStock : 'N/A',
      item.physicalStock !== null && item.physicalStock !== undefined ? item.physicalStock : 'Sin Conteo',
      item.difference !== null && item.difference !== undefined ? item.difference : 'N/A',
      statusLabel,
      item.unit,
      item.lastAuditDate || 'Sin Registro',
      item.responsibleUser || 'N/A',
      item.movementsSinceAudit ?? 0,
      item.estimatedCurrentPhysical !== undefined ? item.estimatedCurrentPhysical : item.systemStock,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } },
  ];

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:O30');

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };

      if (R === 0) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: COLORS.bannerPrimaryText } },
          fill: { fgColor: { rgb: COLORS.bannerPrimaryBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 1) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: COLORS.bannerSecondaryText } },
          fill: { fgColor: { rgb: COLORS.bannerSecondaryBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 2 || R === 3) {
        const isKey = C === 0 || C === 2;
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: isKey, color: { rgb: isKey ? COLORS.metaKeyText : COLORS.metaValText } },
          fill: { fgColor: { rgb: isKey ? COLORS.metaKeyBg : COLORS.metaValBg } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: thinBorder,
        };
      } else if (R === 5) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.sectionText } },
          fill: { fgColor: { rgb: COLORS.sectionBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 6) {
        // Summary Cards Header
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.headerText } },
          fill: { fgColor: { rgb: COLORS.headerBg } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          border: headerBorder,
        };
      } else if (R === 7) {
        // Summary Cards Value
        ws[addr].s = {
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
          fill: { fgColor: { rgb: COLORS.metaKeyBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === tableHeaderRow) {
        // Main Table Header
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.headerText } },
          fill: { fgColor: { rgb: COLORS.headerBg } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          border: headerBorder,
        };
      } else if (R > tableHeaderRow) {
        // Data Rows
        const isOdd = (R - tableHeaderRow) % 2 === 1;
        const alignH =
          C === 5 || C === 6 || C === 7 || C === 8 || C === 13 || C === 14
            ? 'right'
            : C === 0 || C === 3 || C === 10 || C === 11
            ? 'center'
            : 'left';

        // Highlight Diagnosis status cell
        let cellBg = isOdd ? COLORS.zebraOdd : COLORS.zebraEven;
        let cellColor = '0F172A';
        if (C === 9) {
          const val = String(ws[addr]?.v || '');
          if (val.includes('Correcto')) {
            cellBg = COLORS.successBg;
            cellColor = COLORS.successText;
          } else if (val.includes('Faltante')) {
            cellBg = COLORS.dangerBg;
            cellColor = COLORS.dangerText;
          } else if (val.includes('Sobrante')) {
            cellBg = COLORS.warningBg;
            cellColor = COLORS.warningText;
          }
        }

        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: C === 0 || C === 9, color: { rgb: cellColor } },
          fill: { fgColor: { rgb: cellBg } },
          alignment: { vertical: 'center', horizontal: alignH },
          border: thinBorder,
        };
      }
    }
  }

  // Column Auto-fit
  ws['!cols'] = autoFitColumns(data, {
    0: 16, // Código
    1: 36, // Descripción
    2: 24, // Categoría
    3: 16, // Almacén Código
    4: 28, // Nombre Almacén
    5: 20, // Existencia Sistema
    6: 20, // Existencia Conteo
    7: 20, // Conteo Físico
    8: 18, // Diferencia
    9: 26, // Diagnóstico
    10: 12, // Unidad
    11: 22, // Fecha
    12: 24, // Responsable
    13: 20, // Movimientos Post
    14: 20, // Físico Estimado
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Auditoria_Fisica');
  const filename = `Auditoria_Fisica_PanStock_${getTimestampSuffix()}.xlsx`;
  saveWorkbook(wb, filename);
}

/**
 * EXPORT 3: Historial General de Movimientos (lista filtrada)
 */
export function exportMovementsHistoryToExcel(
  movements: MovementRecord[],
  filterInfo?: { searchQuery?: string; selectedType?: string; totalCount?: number }
) {
  const wb = XLSX.utils.book_new();

  const data: (string | number | null | undefined)[][] = [
    ['PANADERÍA ESPAÑOLA C.A. - RIF: J-070054034', '', '', '', '', '', '', '', '', ''],
    ['HISTORIAL GENERAL DE MOVIMIENTOS Y NOTAS DE ENTREGA', '', '', '', '', '', '', '', '', ''],
    [
      'Fecha de Generación:',
      new Date().toLocaleString('es-VE'),
      'Total Movimientos:',
      movements.length,
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      'Filtro Tipo:',
      filterInfo?.selectedType || 'Todos',
      'Búsqueda:',
      filterInfo?.searchQuery || 'Ninguna',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    ['', '', '', '', '', '', '', '', '', ''],
    [
      'N° Movimiento',
      'N° Documento',
      'Tipo de Operación',
      'Fecha y Hora',
      'Almacén Origen',
      'Almacén Destino / Receptor',
      'Cant. Ítems Distintos',
      'Total Unidades',
      'Responsable',
      'Notas / Observaciones',
    ],
  ];

  const tableHeaderRow = 5;

  movements.forEach((mov) => {
    const sourceWh = DEFAULT_WAREHOUSES.find((w) => w.id === mov.sourceWarehouseId);
    const targetWh = DEFAULT_WAREHOUSES.find((w) => w.id === mov.targetWarehouseId);
    const totalQty = mov.items.reduce((sum, item) => sum + item.quantity, 0);

    let destination = targetWh ? `${targetWh.code} - ${targetWh.name}` : 'N/A';
    if (mov.type === 'VENTA' && mov.targetWarehouseId) {
      destination = mov.targetWarehouseId;
    }

    data.push([
      mov.movementNumber,
      mov.docRef || 'N/A',
      mov.type,
      mov.date,
      sourceWh ? `${sourceWh.code} - ${sourceWh.name}` : 'N/A',
      destination,
      mov.items.length,
      totalQty,
      mov.responsibleUser,
      mov.notes || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
  ];

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:J20');

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };

      if (R === 0) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: COLORS.bannerPrimaryText } },
          fill: { fgColor: { rgb: COLORS.bannerPrimaryBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 1) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: COLORS.bannerSecondaryText } },
          fill: { fgColor: { rgb: COLORS.bannerSecondaryBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 2 || R === 3) {
        const isKey = C === 0 || C === 2;
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: isKey, color: { rgb: isKey ? COLORS.metaKeyText : COLORS.metaValText } },
          fill: { fgColor: { rgb: isKey ? COLORS.metaKeyBg : COLORS.metaValBg } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: thinBorder,
        };
      } else if (R === tableHeaderRow) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.headerText } },
          fill: { fgColor: { rgb: COLORS.headerBg } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          border: headerBorder,
        };
      } else if (R > tableHeaderRow) {
        const isOdd = (R - tableHeaderRow) % 2 === 1;
        const alignH = C === 6 || C === 7 ? 'right' : C === 0 || C === 1 || C === 2 || C === 3 ? 'center' : 'left';
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: C === 0 || C === 7, color: { rgb: '0F172A' } },
          fill: { fgColor: { rgb: isOdd ? COLORS.zebraOdd : COLORS.zebraEven } },
          alignment: { vertical: 'center', horizontal: alignH },
          border: thinBorder,
        };
      }
    }
  }

  // Auto-fit Columns
  ws['!cols'] = autoFitColumns(data, {
    0: 18, // N° Movimiento
    1: 20, // N° Documento
    2: 18, // Tipo
    3: 22, // Fecha y Hora
    4: 28, // Origen
    5: 30, // Destino
    6: 16, // Cant. Ítems
    7: 16, // Total Unidades
    8: 24, // Responsable
    9: 34, // Observaciones
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  const filename = `Historial_Movimientos_PanStock_${getTimestampSuffix()}.xlsx`;
  saveWorkbook(wb, filename);
}

/**
 * EXPORT 4: Control de Vencimientos y Lotes
 */
export function exportExpiryAlertsToExcel(
  summary: ExpiryReportPDFSummary,
  items: ExpiryReportPDFItem[]
) {
  const wb = XLSX.utils.book_new();

  const data: (string | number | null | undefined)[][] = [
    ['PANADERÍA ESPAÑOLA C.A. - RIF: J-070054034', '', '', ''],
    ['REPORTE OFICIAL DE CONTROL DE VENCIMIENTOS Y LOTES', '', '', ''],
    ['Fecha de Emisión:', new Date().toLocaleString('es-VE'), 'Almacén Evaluado:', summary.warehouseName],
    ['Condición de Lotes:', summary.filterStatusLabel, 'Total Lotes Evaluados:', summary.totalLotsCount],
    ['', '', '', ''],
    ['--- RESUMEN POR ESTADO DE VENCIMIENTO ---', '', '', ''],
    ['Lotes Vencidos', 'Lotes Próximos a Vencer (≤45 días)', 'Lotes Óptimos / En Fecha', ''],
    [summary.expiredCount, summary.nearCount, summary.safeCount, ''],
    ['', '', '', ''],
    [
      'Código Producto',
      'Descripción del Producto',
      'N° de Lote',
      'Fecha de Vencimiento',
      'Días Restantes',
      'Estado de Alerta',
      'Stock Total en Lote',
      'Unidad',
      'Distribución por Almacén',
    ],
  ];

  const tableHeaderRow = 9;

  items.forEach((item) => {
    let statusName = 'ÓPTIMO / EN FECHA';
    if (item.status === 'EXPIRED') statusName = 'VENCIDO';
    else if (item.status === 'NEAR') statusName = 'PRÓXIMO A VENCER';

    const whDist = item.warehouseBreakdown.map((w) => `${w.whCode}: ${w.qty}`).join(', ');

    data.push([
      item.productCode,
      item.productName,
      item.lotNumber,
      item.expirationDate,
      item.daysLeft < 0 ? `Vencido hace ${Math.abs(item.daysLeft)} d` : `${item.daysLeft} días`,
      statusName,
      item.totalQuantity,
      item.unit,
      whDist || 'Sin asignación',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } },
  ];

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:I25');

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };

      if (R === 0) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: COLORS.bannerPrimaryText } },
          fill: { fgColor: { rgb: COLORS.bannerPrimaryBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 1) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: COLORS.bannerSecondaryText } },
          fill: { fgColor: { rgb: COLORS.bannerSecondaryBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 2 || R === 3) {
        const isKey = C === 0 || C === 2;
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: isKey, color: { rgb: isKey ? COLORS.metaKeyText : COLORS.metaValText } },
          fill: { fgColor: { rgb: isKey ? COLORS.metaKeyBg : COLORS.metaValBg } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: thinBorder,
        };
      } else if (R === 5) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.sectionText } },
          fill: { fgColor: { rgb: COLORS.sectionBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 6) {
        // Summary Header Cards
        let bg = COLORS.headerBg;
        if (C === 0) bg = '991B1B'; // Red
        if (C === 1) bg = 'B45309'; // Amber
        if (C === 2) bg = '15803D'; // Green
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: bg } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          border: headerBorder,
        };
      } else if (R === 7) {
        // Summary Counts
        let valBg = COLORS.zebraEven;
        let fontColor = '0F172A';
        if (C === 0) {
          valBg = COLORS.dangerBg;
          fontColor = COLORS.dangerText;
        } else if (C === 1) {
          valBg = COLORS.warningBg;
          fontColor = COLORS.warningText;
        } else if (C === 2) {
          valBg = COLORS.successBg;
          fontColor = COLORS.successText;
        }
        ws[addr].s = {
          font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: fontColor } },
          fill: { fgColor: { rgb: valBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === tableHeaderRow) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.headerText } },
          fill: { fgColor: { rgb: COLORS.headerBg } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          border: headerBorder,
        };
      } else if (R > tableHeaderRow) {
        const isOdd = (R - tableHeaderRow) % 2 === 1;
        const alignH = C === 4 || C === 6 ? 'right' : C === 0 || C === 2 || C === 3 || C === 5 || C === 7 ? 'center' : 'left';

        let statusBg = isOdd ? COLORS.zebraOdd : COLORS.zebraEven;
        let statusColor = '0F172A';
        if (C === 5) {
          const val = String(ws[addr]?.v || '');
          if (val.includes('VENCIDO')) {
            statusBg = COLORS.dangerBg;
            statusColor = COLORS.dangerText;
          } else if (val.includes('PRÓXIMO')) {
            statusBg = COLORS.warningBg;
            statusColor = COLORS.warningText;
          } else {
            statusBg = COLORS.successBg;
            statusColor = COLORS.successText;
          }
        }

        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: C === 0 || C === 5 || C === 6, color: { rgb: statusColor } },
          fill: { fgColor: { rgb: statusBg } },
          alignment: { vertical: 'center', horizontal: alignH },
          border: thinBorder,
        };
      }
    }
  }

  // Auto-fit Columns
  ws['!cols'] = autoFitColumns(data, {
    0: 16, // Código
    1: 38, // Descripción
    2: 20, // Lote
    3: 20, // Vencimiento
    4: 18, // Días
    5: 24, // Alerta
    6: 18, // Stock
    7: 12, // Unidad
    8: 36, // Distribución
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Vencimientos_Lotes');
  const filename = `Control_Vencimientos_PanStock_${getTimestampSuffix()}.xlsx`;
  saveWorkbook(wb, filename);
}

/**
 * EXPORT 5: Inventario por Almacén
 */
export function exportWarehouseInventoryToExcel(
  warehouse: Warehouse,
  categories: Category[],
  products: Product[],
  warehouseAuditMap?: WarehouseCategoryLastAudit | Record<string, any>
) {
  const wb = XLSX.utils.book_new();

  const data: (string | number | null | undefined)[][] = [
    ['PANADERÍA ESPAÑOLA C.A. - RIF: J-070054034', '', '', ''],
    [`INVENTARIO OFICIAL DE EXISTENCIAS - ${warehouse.code} (${warehouse.name.toUpperCase()})`, '', '', ''],
    ['Fecha de Emisión:', new Date().toLocaleString('es-VE'), 'Total Artículos Registrados:', products.length],
    ['Descripción del Almacén:', warehouse.description, '', ''],
    ['', '', '', ''],
    [
      'Código',
      'Descripción del Producto',
      'Categoría / Subgrupo',
      `Existencia en ${warehouse.code}`,
      'Unidad de Medida',
      'Total en Todo el Sistema',
      'Última Auditoría de Categoría',
    ],
  ];

  const tableHeaderRow = 5;

  products.forEach((prod) => {
    const cat = categories.find((c) => c.id === prod.categoryId);
    const whStock = prod.stockByWarehouse[warehouse.id] || 0;
    const totalStock = Object.values(prod.stockByWarehouse).reduce((a, b) => a + b, 0);

    let auditDate = 'Sin Conteo Reciente';
    if (warehouseAuditMap) {
      const catKey = `${warehouse.id}_${prod.categoryId}`;
      if (typeof warehouseAuditMap[catKey] === 'string') {
        auditDate = warehouseAuditMap[catKey];
      } else if (warehouseAuditMap[prod.id]) {
        auditDate = warehouseAuditMap[prod.id]?.date || 'Auditado';
      }
    }

    data.push([
      prod.code,
      prod.name,
      cat ? cat.name : 'General',
      whStock,
      prod.unit,
      totalStock,
      auditDate,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
  ];

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:G25');

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };

      if (R === 0) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: COLORS.bannerPrimaryText } },
          fill: { fgColor: { rgb: COLORS.bannerPrimaryBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 1) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: COLORS.bannerSecondaryText } },
          fill: { fgColor: { rgb: COLORS.bannerSecondaryBg } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: thinBorder,
        };
      } else if (R === 2 || R === 3) {
        const isKey = C === 0 || C === 2;
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: isKey, color: { rgb: isKey ? COLORS.metaKeyText : COLORS.metaValText } },
          fill: { fgColor: { rgb: isKey ? COLORS.metaKeyBg : COLORS.metaValBg } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: thinBorder,
        };
      } else if (R === tableHeaderRow) {
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.headerText } },
          fill: { fgColor: { rgb: COLORS.headerBg } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          border: headerBorder,
        };
      } else if (R > tableHeaderRow) {
        const isOdd = (R - tableHeaderRow) % 2 === 1;
        const alignH = C === 3 || C === 5 ? 'right' : C === 0 || C === 4 || C === 6 ? 'center' : 'left';
        ws[addr].s = {
          font: { name: 'Calibri', sz: 10, bold: C === 0 || C === 3, color: { rgb: '0F172A' } },
          fill: { fgColor: { rgb: isOdd ? COLORS.zebraOdd : COLORS.zebraEven } },
          alignment: { vertical: 'center', horizontal: alignH },
          border: thinBorder,
        };
      }
    }
  }

  // Auto-fit Columns
  ws['!cols'] = autoFitColumns(data, {
    0: 16, // Código
    1: 38, // Descripción
    2: 24, // Categoría
    3: 20, // Existencia Almacén
    4: 14, // Unidad
    5: 20, // Total Sistema
    6: 26, // Última Auditoría
  });

  XLSX.utils.book_append_sheet(wb, ws, `${warehouse.code}_Inventario`);
  const filename = `Inventario_${warehouse.code}_PanStock_${getTimestampSuffix()}.xlsx`;
  saveWorkbook(wb, filename);
}
