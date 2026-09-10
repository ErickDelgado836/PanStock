import * as XLSX from 'xlsx';
import { MovementRecord, Product, Category, Warehouse, WarehouseCategoryLastAudit } from '../types';
import { DEFAULT_WAREHOUSES } from '../data/seedData';
import {
  AuditReportExportSummary,
  AuditReportExportItem,
  ExpiryReportPDFSummary,
  ExpiryReportPDFItem,
} from './pdfGenerator';

/**
 * Format a string for safe and clear file naming
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
 * EXPORT 1: Auditoría Física / Estado Real de Conteos en Almacén
 */
export function exportAuditReportToExcel(
  summary: AuditReportExportSummary,
  items: AuditReportExportItem[]
) {
  const wb = XLSX.utils.book_new();

  const data: (string | number | null | undefined)[][] = [
    ['PANADERÍA ESPAÑOLA C.A. - RIF: J-070054034'],
    ['REPORTE GENERAL DE ESTADO REAL DE CONTEOS FÍSICOS EN ALMACÉN'],
    ['Fecha de Emisión:', new Date().toLocaleString('es-VE'), 'Filtro de Fechas:', summary.dateRangeText],
    ['Almacén Evaluado:', summary.warehouseName, 'Categoría / Subgrupo:', summary.categoryName],
    [],
    ['--- RESUMEN EJECUTIVO DE AUDITORÍA ---'],
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
    [],
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

  ws['!cols'] = [
    { wch: 14 }, // Código
    { wch: 36 }, // Producto
    { wch: 22 }, // Categoría
    { wch: 14 }, // Almacén Código
    { wch: 26 }, // Almacén Nombre
    { wch: 18 }, // Existencia Actual
    { wch: 18 }, // Existencia Auditoría
    { wch: 18 }, // Conteo Físico
    { wch: 16 }, // Diferencia
    { wch: 24 }, // Diagnóstico
    { wch: 10 }, // Unidad
    { wch: 22 }, // Fecha
    { wch: 24 }, // Responsable
    { wch: 20 }, // Movs Post
    { wch: 20 }, // Físico Estimado
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Auditoria_Fisica');
  const filename = `Auditoria_Fisica_PanStock_${getTimestampSuffix()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * EXPORT 2: Comprobante Individual de Movimiento (Nota de Entrega, Ingreso, Descargo, Venta)
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
    ['PANADERÍA ESPAÑOLA C.A. - RIF: J-070054034'],
    [`COMPROBANTE OFICIAL DE ${typeLabel}`],
    ['N° Documento / Control:', movement.docRef || movement.movementNumber, 'N° Movimiento Interno:', movement.movementNumber],
    ['Fecha y Hora:', movement.date, 'Tipo Operación:', movement.type],
    ['Almacén Origen:', sourceWh ? `${sourceWh.code} - ${sourceWh.name}` : 'N/A', 'Destino / Receptor:', destinationOrClient],
    ['Responsable Registro:', movement.responsibleUser, 'Observaciones / Notas:', movement.notes || 'Sin observaciones'],
    [],
    ['--- DETALLE DE PRODUCTOS ---'],
    ['N°', 'Código', 'Descripción del Producto', 'Cantidad', 'Unidad', 'Lote Asignado', 'Fecha Vencimiento'],
  ];

  let totalUnits = 0;
  movement.items.forEach((item, idx) => {
    totalUnits += item.quantity;
    const expDate = item.newExpirationDate || item.expirationDate || item.previousExpirationDate || 'N/A';
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

  data.push([]);
  data.push(['TOTALES', '', 'TOTAL PRODUCTOS: ' + movement.items.length, totalUnits, 'Unidades Registradas', '', '']);
  data.push([]);
  data.push(['FIRMAS Y CONFORMIDAD:']);
  data.push(['Despachado / Procesado por:', movement.responsibleUser, '', 'Recibido Conforme (Firma):', '____________________']);

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 8 },  // N°
    { wch: 14 }, // Código
    { wch: 38 }, // Descripción
    { wch: 14 }, // Cantidad
    { wch: 12 }, // Unidad
    { wch: 18 }, // Lote
    { wch: 18 }, // Vencimiento
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Comprobante');
  const cleanDoc = (movement.docRef || movement.movementNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${movement.type}_${cleanDoc}_PanStock.xlsx`;
  XLSX.writeFile(wb, filename);
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
    ['PANADERÍA ESPAÑOLA C.A. - RIF: J-070054034'],
    ['HISTORIAL GENERAL DE MOVIMIENTOS Y NOTAS DE ENTREGA'],
    ['Fecha de Generación:', new Date().toLocaleString('es-VE'), 'Total Movimientos:', movements.length],
    ['Filtro Tipo:', filterInfo?.selectedType || 'Todos', 'Búsqueda:', filterInfo?.searchQuery || 'Ninguna'],
    [],
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

  ws['!cols'] = [
    { wch: 16 }, // N° Movimiento
    { wch: 18 }, // N° Documento
    { wch: 16 }, // Tipo
    { wch: 20 }, // Fecha
    { wch: 26 }, // Origen
    { wch: 28 }, // Destino
    { wch: 14 }, // Ítems
    { wch: 14 }, // Total Unidades
    { wch: 22 }, // Responsable
    { wch: 32 }, // Observaciones
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  const filename = `Historial_Movimientos_PanStock_${getTimestampSuffix()}.xlsx`;
  XLSX.writeFile(wb, filename);
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
    ['PANADERÍA ESPAÑOLA C.A. - RIF: J-070054034'],
    ['REPORTE OFICIAL DE CONTROL DE VENCIMIENTOS Y LOTES'],
    ['Fecha de Emisión:', new Date().toLocaleString('es-VE'), 'Almacén Evaluado:', summary.warehouseName],
    ['Condición de Lotes:', summary.filterStatusLabel, 'Total Lotes Evaluados:', summary.totalLotsCount],
    [],
    ['--- RESUMEN POR ESTADO DE VENCIMIENTO ---'],
    ['Lotes Vencidos', 'Lotes Próximos a Vencer (≤45 días)', 'Lotes Óptimos / En Fecha'],
    [summary.expiredCount, summary.nearCount, summary.safeCount],
    [],
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

  items.forEach((item) => {
    let statusName = 'ÓPTIMO / EN FECHA';
    if (item.status === 'EXPIRED') statusName = 'VENCIDO';
    else if (item.status === 'NEAR') statusName = 'PRÓXIMO A VENCER';

    const whDist = item.warehouseBreakdown
      .map((w) => `${w.whCode}: ${w.qty}`)
      .join(', ');

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

  ws['!cols'] = [
    { wch: 14 }, // Código
    { wch: 38 }, // Producto
    { wch: 18 }, // Lote
    { wch: 18 }, // Vencimiento
    { wch: 16 }, // Días Restantes
    { wch: 24 }, // Alerta
    { wch: 14 }, // Cantidad
    { wch: 10 }, // Unidad
    { wch: 35 }, // Distribución
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Vencimientos_Lotes');
  const filename = `Control_Vencimientos_PanStock_${getTimestampSuffix()}.xlsx`;
  XLSX.writeFile(wb, filename);
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
    ['PANADERÍA ESPAÑOLA C.A. - RIF: J-070054034'],
    [`INVENTARIO OFICIAL DE EXISTENCIAS - ${warehouse.code} (${warehouse.name.toUpperCase()})`],
    ['Fecha de Emisión:', new Date().toLocaleString('es-VE'), 'Total Artículos Registrados:', products.length],
    ['Descripción del Almacén:', warehouse.description],
    [],
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

  products.forEach((prod) => {
    const cat = categories.find((c) => c.id === prod.categoryId);
    const whStock = prod.stockByWarehouse[warehouse.id] || 0;
    const totalStock = Object.values(prod.stockByWarehouse).reduce((a, b) => a + b, 0);
    
    // Check category audit key
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

  ws['!cols'] = [
    { wch: 14 }, // Código
    { wch: 38 }, // Descripción
    { wch: 24 }, // Categoría
    { wch: 18 }, // Existencia Almacén
    { wch: 12 }, // Unidad
    { wch: 18 }, // Total Sistema
    { wch: 18 }, // Conteo Físico
    { wch: 16 }, // Diferencia
    { wch: 22 }, // Fecha Auditoría
  ];

  XLSX.utils.book_append_sheet(wb, ws, `${warehouse.code}_Inventario`);
  const filename = `Inventario_${warehouse.code}_PanStock_${getTimestampSuffix()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
