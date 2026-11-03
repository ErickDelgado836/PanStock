import React from 'react';
import { FifoAllocation } from '../../utils/lotUtils';
import { Layers, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface FifoDistributionPreviewProps {
  allocations: FifoAllocation[];
  unit: string;
  requestedQty: number;
  availableStock: number;
  isAutoFifo: boolean;
  accentColor?: 'amber' | 'rose' | 'blue';
}

export const FifoDistributionPreview: React.FC<FifoDistributionPreviewProps> = ({
  allocations,
  unit,
  requestedQty,
  availableStock,
  isAutoFifo,
  accentColor = 'amber',
}) => {
  if (requestedQty <= 0) return null;

  const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0);
  const isComplete = totalAllocated >= requestedQty;

  const colorStyles = {
    amber: {
      bg: 'bg-amber-50/95',
      border: 'border-amber-300',
      headerText: 'text-amber-950',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-900',
      badgeBorder: 'border-amber-200',
      iconText: 'text-amber-600',
      rowBorder: 'border-amber-200/70',
      pillBg: 'bg-amber-100/80',
      pillText: 'text-amber-950',
    },
    rose: {
      bg: 'bg-rose-50/95',
      border: 'border-rose-300',
      headerText: 'text-rose-950',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-900',
      badgeBorder: 'border-rose-200',
      iconText: 'text-rose-600',
      rowBorder: 'border-rose-200/70',
      pillBg: 'bg-rose-100/80',
      pillText: 'text-rose-950',
    },
    blue: {
      bg: 'bg-blue-50/95',
      border: 'border-blue-300',
      headerText: 'text-blue-950',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-900',
      badgeBorder: 'border-blue-200',
      iconText: 'text-blue-600',
      rowBorder: 'border-blue-200/70',
      pillBg: 'bg-blue-100/80',
      pillText: 'text-blue-950',
    },
  }[accentColor];

  return (
    <div className={`p-3.5 rounded-2xl border ${colorStyles.border} ${colorStyles.bg} space-y-2.5 shadow-xs transition-all`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className={`w-4 h-4 shrink-0 ${colorStyles.iconText}`} />
          <span className={`text-xs font-black uppercase tracking-wider truncate ${colorStyles.headerText}`}>
            {isAutoFifo ? 'Desglose Automático FIFO por Fecha' : 'Lote Específico Seleccionado'}
          </span>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${colorStyles.badgeBg} ${colorStyles.badgeText} ${colorStyles.badgeBorder}`}>
          {allocations.length} {allocations.length === 1 ? 'partición' : 'particiones'}
        </span>
      </div>

      <div className="space-y-1.5">
        {allocations.map((alloc, idx) => (
          <div
            key={idx}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 bg-white/90 rounded-xl border ${colorStyles.rowBorder} shadow-2xs text-xs font-bold text-slate-800`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`px-2 py-0.5 rounded-md font-black text-xs shrink-0 ${colorStyles.pillBg} ${colorStyles.pillText}`}>
                {alloc.quantity.toLocaleString('es-ES')} {unit}
              </span>
              <span className="font-extrabold text-slate-900 truncate">
                Lote: <span className="font-mono text-slate-950">{alloc.lotNumber}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
              {alloc.expirationDate ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Calendar className="w-3 h-3 text-amber-600" />
                  Vence: {alloc.expirationDate}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  Sin Fecha de Vencimiento
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isComplete && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 p-2 rounded-xl border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>
            Solo hay {totalAllocated.toLocaleString('es-ES')} {unit} disponibles en lotes. Faltan {(requestedQty - totalAllocated).toLocaleString('es-ES')} {unit} para completar la cantidad solicitada.
          </span>
        </div>
      )}

      {isComplete && allocations.length > 1 && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/80">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Auto FIFO tomará automáticamente las unidades de las fechas más próximas a vencer ({allocations.length} lotes).
          </span>
        </div>
      )}
    </div>
  );
};
