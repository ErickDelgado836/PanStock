import jsPDF from 'jspdf';
import { MovementRecord } from '../types';
import { DEFAULT_WAREHOUSES } from '../data/seedData';

let cachedLogoImage: HTMLImageElement | null = null;

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
  doc.text('RIF: J-070054034  •  PanStock Control de Inventarios', 14, 18);

  // Document Badge
  doc.setTextColor(20, 30, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(docTitle, 14, 36);

  // Metadata Grid Box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(14, 42, 182, 32, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Nº Movimiento:', 18, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(movement.movementNumber, 50, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Doc. Referencia:', 18, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(movement.docRef || 'N/A', 50, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha y Hora:', 18, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(movement.date, 50, 60);

  doc.setFont('helvetica', 'bold');
  doc.text('Responsable:', 18, 66);
  doc.setFont('helvetica', 'normal');
  doc.text(movement.responsibleUser, 50, 66);

  // Warehouses
  doc.setFont('helvetica', 'bold');
  doc.text('Almacén Origen:', 110, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(sourceWarehouse ? `${sourceWarehouse.code} - ${sourceWarehouse.name}` : 'N/A (Externa)', 140, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Almacén Destino:', 110, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(targetWarehouse ? `${targetWarehouse.code} - ${targetWarehouse.name}` : 'N/A (Salida)', 140, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Tipo Operación:', 110, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(movement.type, 140, 60);

  // Items Table Header
  const startY = 82;
  let currentY = startY;

  const drawTableHeader = (y: number) => {
    doc.setFillColor(20, 30, 60);
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('#', 18, y + 5.5);
    doc.text('Código', 28, y + 5.5);
    doc.text('Descripción del Producto', 65, y + 5.5);
    doc.text('Cantidad', 150, y + 5.5);
    doc.text('Unidad', 178, y + 5.5);
  };

  drawTableHeader(currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  movement.items.forEach((item, index) => {
    // Check if item row would overflow page
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
      drawTableHeader(currentY);
      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
    }

    if (index % 2 === 0) {
      doc.setFillColor(242, 244, 248);
      doc.rect(14, currentY, 182, 7, 'F');
    }
    doc.text(String(index + 1), 18, currentY + 5);
    doc.text(item.productCode, 28, currentY + 5);

    // Truncate name if too long
    const nameStr = item.productName.length > 42 ? item.productName.substring(0, 40) + '...' : item.productName;
    doc.text(nameStr, 65, currentY + 5);

    doc.text(String(item.quantity), 150, currentY + 5);
    doc.text(item.unit, 178, currentY + 5);
    currentY += 7;
  });

  // Border around last table section
  doc.setDrawColor(200, 200, 200);

  // Notes Box
  if (currentY + 25 > 270) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 30, 60);
  doc.text('Observaciones y Notas:', 14, currentY);

  currentY += 3;
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(14, currentY, 182, 16, 1, 1, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  const splitNotes = doc.splitTextToSize(movement.notes || 'Sin observaciones registradas.', 176);
  doc.text(splitNotes, 18, currentY + 5);

  // Signatures Section
  if (currentY + 45 > 275) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 28;
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
      `Documento generado automáticamente por PanStock Española C.A | Fecha: ${new Date().toLocaleString('es-VE')}`,
      14,
      287
    );
    doc.text(`Página ${i} de ${pageCount}`, 180, 287);
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
  doc.text(new Date().toLocaleString('es-VE'), 145, 56);

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
      `Reporte generado por PanStock | Panadería Española C.A | Fecha: ${new Date().toLocaleString('es-VE')}`,
      14,
      287
    );
    doc.text(`Página ${i} de ${totalAuditPages}`, 180, 287);
  }

  doc.save(`Reporte_Inventario_Fisico_${new Date().toISOString().slice(0, 10)}.pdf`);
}
