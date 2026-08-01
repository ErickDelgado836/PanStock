import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MovementRecord } from '../types';
import { DEFAULT_WAREHOUSES } from '../data/seedData';
import { generateMovementPDF } from '../utils/pdfGenerator';
import { EspañolaFullLogo } from './Logos';
import { X, FileText, Download, Printer, ArrowRight } from 'lucide-react';

interface NotePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: MovementRecord | null;
}

export const NotePDFModal: React.FC<NotePDFModalProps> = ({ isOpen, onClose, movement }) => {
  if (!isOpen || !movement) return null;

  const sourceWh = DEFAULT_WAREHOUSES.find((w) => w.id === movement.sourceWarehouseId);
  const targetWh = DEFAULT_WAREHOUSES.find((w) => w.id === movement.targetWarehouseId);

  const getDocTypeBadge = () => {
    switch (movement.type) {
      case 'ENTRADA':
        return { label: 'NOTA DE INGRESO', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'TRASLADO':
        return { label: 'NOTA DE ENTREGA Y TRASLADO', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'DESCARGO':
        return { label: 'NOTA DE DESCARGO / SALIDA', bg: 'bg-rose-100 text-rose-900 border-rose-300' };
      case 'VENTA':
        return { label: 'COMPROBANTE DE VENTA', bg: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'AJUSTE_INVENTARIO':
        return { label: 'COMPROBANTE DE AJUSTE DE INVENTARIO', bg: 'bg-purple-100 text-purple-900 border-purple-300' };
      default:
        return { label: movement.type || 'COMPROBANTE DE MOVIMIENTO', bg: 'bg-slate-100 text-slate-900 border-slate-300' };
    }
  };

  const badge = getDocTypeBadge();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-hidden">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        >
          {/* Top Bar Controls */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-xs sm:text-sm">Documento de Movimiento de Inventario</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Document Preview Layout (Scrollable Paper View) */}
          <div className="p-4 sm:p-8 bg-slate-50 font-sans flex-1 overflow-y-auto">
            <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              {/* Bakery Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-4">
                <img
                  src="/espanola.png"
                  alt="Panadería Española"
                  className="h-12 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const fallbackEl = document.getElementById('note-logo-fallback');
                    if (fallbackEl) fallbackEl.style.display = 'block';
                  }}
                />
                <div id="note-logo-fallback" style={{ display: 'none' }}>
                  <EspañolaFullLogo width={140} height={50} />
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wide mb-1 ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <p className="text-xs text-slate-500 font-mono">
                    Nº: <strong className="text-slate-900">{movement.movementNumber}</strong>
                  </p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Doc. Referencia</span>
                  <span className="font-mono font-extrabold text-slate-900">{movement.docRef}</span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Fecha / Hora</span>
                  <span className="font-bold text-slate-900">{movement.date}</span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Responsable</span>
                  <span className="font-bold text-slate-900">{movement.responsibleUser}</span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Almacén Origen</span>
                  <span className="font-bold text-slate-900">
                    {sourceWh ? `${sourceWh.code} - ${sourceWh.name}` : 'N/A (Entrada Externa)'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Almacén Destino</span>
                  <span className="font-bold text-slate-900">
                    {movement.type === 'VENTA' 
                      ? (movement.targetWarehouseId || 'Cliente / Consumidor Final')
                      : (targetWh ? `${targetWh.code} - ${targetWh.name}` : 'N/A (Salida / Baja)')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Tipo Operación</span>
                  <span className="font-black text-red-700">{movement.type}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-900 text-white font-extrabold uppercase p-2.5 text-[11px] flex justify-between items-center">
                  <span>Listado de Productos Registrados</span>
                  <span className="bg-red-600 px-2 py-0.5 rounded text-[10px] font-mono">
                    {movement.items.length} producto(s)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Código</th>
                        <th className="p-3">Descripción</th>
                        <th className="p-3 text-right">Cantidad</th>
                        <th className="p-3">Unidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {movement.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{item.productCode}</td>
                          <td className="p-3 font-bold text-slate-800">{item.productName}</td>
                          <td className="p-3 text-right font-black text-slate-900">{item.quantity}</td>
                          <td className="p-3 font-medium text-slate-600">{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Observaciones y Notas:
                </span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs italic text-slate-700">
                  {movement.notes || 'Sin observaciones adicionales.'}
                </div>
              </div>

              {/* Signatures Representation */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
                <div>
                  <div className="border-t border-slate-300 pt-2 font-bold text-slate-700">
                    Entregado por (Firma)
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-300 pt-2 font-bold text-slate-700">
                    Recibido por (Firma)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Control Bar */}
          <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              Comprobante listo para imprimir o descargar
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => generateMovementPDF(movement)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
