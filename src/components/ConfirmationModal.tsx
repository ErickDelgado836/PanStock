import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2, ArrowRightLeft, ArrowUpRight, ArrowDownLeft, ShoppingCart, RefreshCw } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'ENTRADA' | 'TRASLADO' | 'DESCARGO' | 'VENTA' | 'AUDIT' | 'DELETE';
  confirmText?: string;
  isProcessing?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'ENTRADA',
  confirmText = 'Sí, Procesar',
  isProcessing = false,
}) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'ENTRADA':
        return <ArrowDownLeft className="w-8 h-8 text-emerald-600" />;
      case 'TRASLADO':
        return <ArrowRightLeft className="w-8 h-8 text-amber-600" />;
      case 'DESCARGO':
        return <ArrowUpRight className="w-8 h-8 text-rose-600" />;
      case 'VENTA':
        return <ShoppingCart className="w-8 h-8 text-blue-600" />;
      case 'DELETE':
        return <AlertTriangle className="w-8 h-8 text-red-600" />;
      default:
        return <CheckCircle2 className="w-8 h-8 text-slate-600" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'ENTRADA':
        return 'bg-emerald-50 border-emerald-100 text-emerald-900';
      case 'TRASLADO':
        return 'bg-amber-50 border-amber-100 text-amber-900';
      case 'DESCARGO':
        return 'bg-rose-50 border-rose-100 text-rose-900';
      case 'VENTA':
        return 'bg-blue-50 border-blue-100 text-blue-900';
      case 'DELETE':
        return 'bg-red-50 border-red-100 text-red-900';
      default:
        return 'bg-slate-50 border-slate-100 text-slate-900';
    }
  };

  const getBtnBg = () => {
    switch (type) {
      case 'ENTRADA':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'TRASLADO':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      case 'DESCARGO':
        return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'VENTA':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'DELETE':
        return 'bg-red-600 hover:bg-red-700 text-white';
      default:
        return 'bg-slate-900 hover:bg-slate-800 text-white';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-950/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className={`p-6 text-center border-b ${getHeaderBg()}`}>
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm mx-auto flex items-center justify-center mb-3">
                {getTypeIcon()}
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
            </div>

            <div className="p-6 text-center">
              <p className="text-slate-700 font-medium text-base mb-6 leading-relaxed">
                {message}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all border border-slate-200 active:scale-[0.98] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isProcessing}
                  className={`w-full py-3 px-4 font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 ${getBtnBg()}`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
