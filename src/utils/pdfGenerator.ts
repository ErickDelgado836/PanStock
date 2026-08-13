import jsPDF from 'jspdf';
import { MovementRecord } from '../types';
import { DEFAULT_WAREHOUSES } from '../data/seedData';
import { formatVE } from './movementSearch';

let cachedLogoImage: HTMLImageElement | null = null;

function sanitizePdfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/➔/g, '->')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/•/g, '-')
    .replace(/…/g, '...')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/[^\x00-\xFF]/g, '');
}

function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  const clean = sanitizePdfText(str);
  if (clean.length <= maxLength) return clean;
  return clean.substring(0, maxLength - 2) + '..';
}

function getLogoImage(): Promise<HTMLImageElement | null> {
  if (cachedLogoImage) return Promise.resolve(cachedLogoImage);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = '/espanola.png';
    img.onload = () => {
      cachedLogoImage = img;
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
  });
}

export async function generateMovementPDF(movement: MovementRecord) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const sourceWarehouse = DEFAULT_WAREHOUSES.find((w) => w.id === movement.sourceWarehouseId);
  const targetWarehouse = DEFAULT_WAREHOUSES.find((w) => w.id === movement.targetWarehouseId);

  let docTitle = 'NOTA DE MOVIMIENTO DE INVENTARIO';
  if (movement.type === 'ENTRADA') docTitle = 'NOTA DE INGRESO / ENTRADA DE ALMACÉN';
  if (movement.type === 'TRASLADO') docTitle = 'NOTA DE ENTREGA Y TRASLADO';
  if (movement.type === 'DESCARGO') docTitle = 'NOTA DE DESCARGO / SALIDA DE INVENTARIO';
  if (movement.type === 'VENTA') docTitle = 'COMPROBANTE DE SALIDA POR VENTA';
  if (movement.type === 'AJUSTE_INVENTARIO') docTitle = 'COMPROBANTE DE AJUSTE DE INVENTARIO';
  if (movement.type === 'EDICION_VENCIMIENTO') docTitle = 'COMPROBANTE DE MODIFICACIÓN DE VENCIMIENTO';

  // Primary Header Colors (Panadería Española palette: Warm Red & Navy)
  doc.setFillColor(180, 20, 20); // Bakery Red
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFillColor(20, 30, 60); // Dark Navy
  doc.rect(0, 24, 210, 3, 'F');

  // Add Logo in Top-Right Corner
  const logo = await getLogoImage();
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(172, 2, 24, 20, 2, 2, 'F');
    doc.addImage(logo, 'PNG', 173.5, 3, 21, 18);
  }

  // Header Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PANADERÍA ESPAÑOLA C.A', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RIF: J-070054034  -  PanStock Control de Inventarios', 14, 18);

  // Document Badge
  doc.setTextColor(20, 30, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(sanitizePdfText(docTitle), 14, 36);

  // Metadata Grid Box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(14, 42, 182, 32, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Nº Movimiento:', 17, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateString(movement.movementNumber, 22), 45, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Doc. Referencia:', 17, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateString(movement.docRef || 'N/A', 22), 45, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha y Hora:', 17, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateString(movement.date, 22), 45, 60);

  doc.setFont('helvetica', 'bold');
  doc.text('Responsable:', 17, 66);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateString(movement.responsibleUser, 22), 45, 66);

  // Warehouses (Right Column - x from 105 to 192)
  const srcWhStr = sourceWarehouse ? `${sourceWarehouse.code} - ${sourceWarehouse.name}` : 'N/A (Externa)';
  const tgtWhStr = targetWarehouse
    ? `${targetWarehouse.code} - ${targetWarehouse.name}`
    : (movement.type === 'VENTA' ? (movement.targetWarehouseId || 'Cliente Final') : 'N/A (Salida)');

  doc.setFont('helvetica', 'bold');
  doc.text('Almacén Origen:', 105, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateString(srcWhStr, 25), 135, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Almacén Destino:', 105, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateString(tgtWhStr, 25), 135, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Tipo Operación:', 105, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateString(sanitizePdfText(movement.type), 25), 135, 60);

  // Items Table Header
  const startY = 82;
  let currentY = startY;

  const drawTableHeader = (y: number) => {
    doc.setFillColor(20, 30, 60);
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('#', 17, y + 5.5);
    doc.text('Código', 25, y + 5.5);
    doc.text('Descripción del Producto', 58, y + 5.5);
    doc.text('Cantidad', 145, y + 5.5);
    doc.text('Unidad', 172, y + 5.5);
  };

  drawTableHeader(currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  movement.items.forEach((item, index) => {
    const hasExpDetails = Boolean(
      item.previousExpirationDate || item.newExpirationDate || item.expirationDate || item.lotNumber
    );
    const rowHeight = hasExpDetails ? 11 : 7;

    if (currentY + rowHeight > 265) {
      doc.addPage();
      currentY = 20;
      drawTableHeader(currentY);
      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
    }

    if (index % 2 === 0) {
      doc.setFillColor(242, 244, 248);
      doc.rect(14, currentY, 182, rowHeight, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);

    doc.text(String(index + 1), 17, currentY + 5);
    doc.text(truncateString(item.productCode, 14), 25, currentY + 5);

    doc.text(truncateString(item.productName, 34), 58, currentY + 5);
    doc.text(String(item.quantity), 145, currentY + 5);
    doc.text(truncateString(item.unit, 10), 172, currentY + 5);

    if (hasExpDetails) {
      doc.setFontSize(7.5);
      doc.setTextColor(90, 90, 90);
      let expInfo = '';
      if (item.lotNumber) expInfo += `Lote: ${item.lotNumber} | `;
      if (item.previousExpirationDate || item.newExpirationDate) {
        expInfo += `Ant: ${item.previousExpirationDate || 'Sin Fecha'} -> Nue: ${item.newExpirationDate || 'Sin Fecha'}`;
      } else if (item.expirationDate) {
        expInfo += `Vence: ${item.expirationDate}`;
      }
      doc.text(truncateString(expInfo, 48), 58, currentY + 9);
    }

    currentY += rowHeight;
  });

  doc.setDrawColor(200, 200, 200);

  // Dynamic Notes Box
  const rawNotes = movement.notes || 'Sin observaciones registradas.';
  const cleanNotes = sanitizePdfText(rawNotes);

  // Set font properties BEFORE calling splitTextToSize so line wrap calculations are 100% accurate!
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  const splitNotes = doc.splitTextToSize(cleanNotes, 170);
  const lineSpacing = 4.2;
  const boxHeight = Math.max(14, splitNotes.length * lineSpacing + 6);

  if (currentY + boxHeight + 10 > 270) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 30, 60);
  doc.text('Observaciones y Notas:', 14, currentY);

  currentY += 3.5;
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(14, currentY, 182, boxHeight, 1, 1, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(splitNotes, 18, currentY + 5);

  currentY += boxHeight;

  // Signatures Section
  if (currentY + 28 > 270) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 20;
  }

  doc.setDrawColor(180, 180, 180);
  doc.line(25, currentY, 85, currentY);
  doc.line(125, currentY, 185, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Firma y Sello - Entregado por', 30, currentY + 5);
  doc.text('Firma y Sello - Recibido por', 130, currentY + 5);

  // Multi-page Footers with Page Numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Documento generado automáticamente por PanStock Española C.A | Fecha: ${formatVE(new Date())}`,
      14,
      287
    );
    doc.text(`Página ${i} de ${pageCount}`, 165, 287);
  }

  // Save PDF
  doc.save(`${movement.type}_${movement.docRef || movement.movementNumber}.pdf`);
}

export interface AuditReportExportItem {
  productCode: string;
  productName: string;
  categoryName: string;
  warehouseCode: string;
  warehouseName: string;
  unit: string;
  systemStock: number;
  physicalStock: number | null;
  difference: number | null;
  status: 'PENDING' | 'CORRECT' | 'MISSING' | 'SURPLUS';
  lastAuditDate?: string;
  responsibleUser?: string;
}

export interface AuditReportExportSummary {
  warehouseName: string;
  categoryName: string;
  dateRangeText: string;
  totalItems: number;
  auditedItems: number;
  pendingItems: number;
  correctItems: number;
  missingItems: number;
  surplusItems: number;
}

export async function generateAuditReportPDF(
  summary: AuditReportExportSummary,
  items: AuditReportExportItem[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Primary Header
  doc.setFillColor(180, 20, 20); // Bakery Red
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFillColor(20, 30, 60); // Dark Navy
  doc.rect(0, 24, 210, 3, 'F');

  // Add Logo in Top-Right Corner
  const logo = await getLogoImage();
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(172, 2, 24, 20, 2, 2, 'F');
    doc.addImage(logo, 'PNG', 173.5, 3, 21, 18);
  }

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PANADERÍA ESPAÑOLA C.A', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('RIF: J-070054034  •  Reporte de Auditoría e Inventario Físico', 14, 18);

  // Document Badge
  doc.setTextColor(20, 30, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('REPORTE GENERAL DE INVENTARIO FÍSICO Y AUDITORÍA', 14, 34);

  // Metadata Grid Box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(14, 38, 182, 28, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Almacén:', 18, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(summary.warehouseName, 54, 44);

  doc.setFont('helvetica', 'bold');
  doc.text('Categoría / Subgrupo:', 18, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(summary.categoryName, 54, 50);

  doc.setFont('helvetica', 'bold');
  doc.text('Rango de Fechas:', 18, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(summary.dateRangeText, 54, 56);

  // Summary Metrics Right Side
  doc.setFont('helvetica', 'bold');
  doc.text('Total Productos:', 115, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.totalItems} (${summary.auditedItems} Con Auditoría / ${summary.pendingItems} Sin Conteo)`, 145, 44);

  doc.setFont('helvetica', 'bold');
  doc.text('Resultados:', 115, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.correctItems} Correctos | ${summary.missingItems} Faltantes | ${summary.surplusItems} Sobrantes`, 145, 50);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha Emisión:', 115, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(formatVE(new Date()), 145, 56);

  // Items Table Header
  const startY = 72;
  doc.setFillColor(20, 30, 60);
  doc.rect(14, startY, 182, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Código', 16, startY + 5);
  doc.text('Producto', 34, startY + 5);
  doc.text('Almacén', 84, startY + 5);
  doc.text('Exist. Sistema', 106, startY + 5);
  doc.text('Conteo Físico', 130, startY + 5);
  doc.text('Diferencia / Estado', 154, startY + 5);

  let currentY = startY + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  items.forEach((item, index) => {
    // Check page overflow
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
      // Header on new page
      doc.setFillColor(20, 30, 60);
      doc.rect(14, currentY, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Código', 16, currentY + 5);
      doc.text('Producto', 34, currentY + 5);
      doc.text('Almacén', 84, currentY + 5);
      doc.text('Exist. Sistema', 106, currentY + 5);
      doc.text('Conteo Físico', 130, currentY + 5);
      doc.text('Diferencia / Estado', 154, currentY + 5);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
    }

    if (index % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(14, currentY, 182, 6.5, 'F');
    }

    doc.setTextColor(40, 40, 40);
    doc.text(item.productCode, 16, currentY + 4.5);
    
    // Truncate name if too long to fit in 48mm
    const shortName = item.productName.length > 25 ? item.productName.substring(0, 23) + '...' : item.productName;
    doc.text(shortName, 34, currentY + 4.5);
    doc.text(item.warehouseCode, 84, currentY + 4.5);
    doc.text(`${item.systemStock} ${item.unit}`, 106, currentY + 4.5);

    if (item.status === 'PENDING') {
      doc.setTextColor(120, 120, 120);
      doc.text('Sin Conteo', 130, currentY + 4.5);
      doc.text('PENDIENTE', 154, currentY + 4.5);
    } else {
      doc.text(`${item.physicalStock} ${item.unit}`, 130, currentY + 4.5);

      if (item.status === 'MISSING') {
        doc.setTextColor(180, 20, 20);
        const diffText = `${item.difference?.toFixed(2)} FALTANTE`;
        doc.text(diffText, 154, currentY + 4.5);
      } else if (item.status === 'SURPLUS') {
        doc.setTextColor(20, 140, 60);
        const diffText = `+${item.difference?.toFixed(2)} SOBRANTE`;
        doc.text(diffText, 154, currentY + 4.5);
      } else {
        doc.setTextColor(50, 50, 50);
        doc.text('0.00 (CORRECTO)', 154, currentY + 4.5);
      }
    }

    currentY += 6.5;
  });

  // Border around table
  doc.setDrawColor(200, 200, 200);
  doc.rect(14, startY, 182, Math.min(currentY - startY, 255));

  // Multi-page Footers with Page Numbers
  const totalAuditPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalAuditPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Reporte generado por PanStock | Panadería Española C.A | Fecha: ${formatVE(new Date())}`,
      14,
      287
    );
    doc.text(`Página ${i} de ${totalAuditPages}`, 180, 287);
  }

  doc.save(`Reporte_Inventario_Fisico_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export interface ExpiryReportPDFWarehouseStock {
  whCode: string;
  whName: string;
  qty: number;
}

export interface ExpiryReportPDFItem {
  productCode: string;
  productName: string;
  lotNumber: string;
  expirationDate: string;
  daysLeft: number;
  status: 'EXPIRED' | 'NEAR' | 'SAFE';
  totalQuantity: number;
  unit: string;
  warehouseBreakdown: ExpiryReportPDFWarehouseStock[];
}

export interface ExpiryReportPDFSummary {
  warehouseName: string;
  filterStatusLabel: string;
  searchQuery?: string;
  totalLotsCount: number;
  expiredCount: number;
  nearCount: number;
  safeCount: number;
  generatedBy?: string;
}

export async function generateExpiryReportPDF(
  summary: ExpiryReportPDFSummary,
  items: ExpiryReportPDFItem[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Primary Header Colors (Panadería Española palette: Warm Red & Navy)
  doc.setFillColor(180, 20, 20); // Bakery Red
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFillColor(20, 30, 60); // Dark Navy
  doc.rect(0, 24, 210, 3, 'F');

  // Add Logo in Top-Right Corner
  const logo = await getLogoImage();
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(172, 2, 24, 20, 2, 2, 'F');
    doc.addImage(logo, 'PNG', 173.5, 3, 21, 18);
  }

  // Header Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PANADERÍA ESPAÑOLA C.A', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RIF: J-070054034  -  PanStock Control de Inventarios', 14, 18);

  // Document Badge / Title
  doc.setTextColor(20, 30, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REPORTE DETALLADO DE CONTROL DE VENCIMIENTOS Y CADUCIDAD POR LOTE', 14, 34);

  // Metadata Grid Box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(14, 38, 182, 30, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);

  // Left Column
  doc.text('Almacén:', 17, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateString(summary.warehouseName, 38), 40, 44);

  doc.setFont('helvetica', 'bold');
  doc.text('Filtro Estado:', 17, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateString(summary.filterStatusLabel, 38), 40, 50);

  doc.setFont('helvetica', 'bold');
  doc.text('Búsqueda:', 17, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(summary.searchQuery ? `"${truncateString(summary.searchQuery, 32)}"` : 'Ninguna (Todos los resultados)', 40, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('Generado por:', 17, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(sanitizePdfText(summary.generatedBy || 'Usuario del Sistema'), 40, 62);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha Emisión:', 115, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(formatVE(new Date()), 145, 44);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Lotes:', 115, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.totalLotsCount} lotes filtrados`, 145, 50);

  doc.setFont('helvetica', 'bold');
  doc.text('Resumen Estados:', 115, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.expiredCount} Vencidos | ${summary.nearCount} Próximos | ${summary.safeCount} Vigentes`, 145, 56);

  const formatShortUnit = (u: string) => {
    if (!u) return 'u.';
    const lower = u.trim().toLowerCase();
    if (lower.startsWith('unidad') || lower.startsWith('unid') || lower === 'un' || lower === 'u') {
      return 'u.';
    }
    return u;
  };

  // Items Table Header
  const startY = 74;
  const drawTableHeader = (y: number) => {
    doc.setFillColor(20, 30, 60);
    doc.rect(14, y, 182, 7.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Código', 15, y + 5);
    doc.text('Producto', 30, y + 5);
    doc.text('Nº Lote', 65, y + 5);
    doc.text('F. Vencim.', 83, y + 5);
    doc.text('Estado', 101, y + 5);
    doc.text('Cant. Total', 125, y + 5);
    doc.text('Ubicación (Stock por Almacén)', 143, y + 5);
  };

  drawTableHeader(startY);

  let currentY = startY + 7.5;
  doc.setFontSize(7.5);

  items.forEach((item, index) => {
    const whCount = Math.max(1, item.warehouseBreakdown ? item.warehouseBreakdown.length : 1);
    const rowHeight = Math.max(7.5, 3.8 + whCount * 3.8);

    if (currentY + rowHeight > 275) {
      doc.addPage();
      currentY = 20;
      drawTableHeader(currentY);
      currentY += 7.5;
    }

    if (index % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(14, currentY, 182, rowHeight, 'F');
    }

    // Border line below row
    doc.setDrawColor(230, 230, 230);
    doc.line(14, currentY + rowHeight, 196, currentY + rowHeight);

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');

    const unitAbbrev = formatShortUnit(item.unit);

    // Code
    doc.text(truncateString(item.productCode, 9), 15, currentY + 4.8);

    // Product Name
    doc.text(truncateString(item.productName, 20), 30, currentY + 4.8);

    // Lot Number
    doc.setFont('helvetica', 'bold');
    doc.text(truncateString(item.lotNumber, 9), 65, currentY + 4.8);

    // Expiration Date
    doc.setFont('helvetica', 'normal');
    doc.text(item.expirationDate || 'Sin Fecha', 83, currentY + 4.8);

    // Status / Days
    if (item.status === 'EXPIRED') {
      doc.setTextColor(180, 20, 20);
      doc.setFont('helvetica', 'bold');
      const daysText = item.daysLeft === -1 ? 'VENCIDO (-1d)' : `VENCIDO (${item.daysLeft}d)`;
      doc.text(daysText, 101, currentY + 4.8);
    } else if (item.status === 'NEAR') {
      doc.setTextColor(190, 100, 0);
      doc.setFont('helvetica', 'bold');
      const daysText = item.daysLeft === 0 ? 'VENCE HOY' : `PRÓXIMO (${item.daysLeft}d)`;
      doc.text(daysText, 101, currentY + 4.8);
    } else {
      doc.setTextColor(20, 120, 50);
      doc.setFont('helvetica', 'bold');
      doc.text(`VIGENTE (${item.daysLeft}d)`, 101, currentY + 4.8);
    }

    // Total Quantity
    doc.setTextColor(20, 30, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.totalQuantity} ${unitAbbrev}`, 125, currentY + 4.8);

    // Location Breakdown with Full Details (Warehouse Code, Name, and Quantity)
    doc.setTextColor(40, 40, 40);

    if (!item.warehouseBreakdown || item.warehouseBreakdown.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.text('Sin Stock', 143, currentY + 4.8);
    } else {
      item.warehouseBreakdown.forEach((wh, whIdx) => {
        const whY = currentY + 4.8 + whIdx * 3.8;
        doc.setFont('helvetica', 'bold');
        doc.text(`${wh.whCode}`, 143, whY);

        doc.setFont('helvetica', 'normal');
        doc.text(`- ${truncateString(wh.whName, 14)}:`, 149, whY);

        doc.setFont('helvetica', 'bold');
        doc.text(`${wh.qty} ${unitAbbrev}`, 178, whY);
      });
    }

    currentY += rowHeight;
  });

  // Border around table
  doc.setDrawColor(180, 180, 180);
  doc.rect(14, startY, 182, Math.min(currentY - startY, 255));

  // Multi-page Footers with Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Reporte de Control de Vencimientos | PanStock - Panadería Española C.A | Fecha: ${formatVE(new Date())}`,
      14,
      287
    );
    doc.text(`Página ${i} de ${totalPages}`, 180, 287);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`Reporte_Vencimientos_Lotes_${dateStr}.pdf`);
}

