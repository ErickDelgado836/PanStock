import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { subscribeToToasts, ToastMessage } from '../../utils/toast';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        removeToast(newToast.id);
      }, newToast.duration || 4000);

      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2.5 w-[92vw] max-w-md pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success' || !toast.type;
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          let bgClass = 'bg-slate-900 text-white border-slate-800';
          let iconBg = 'bg-emerald-500/20 text-emerald-400';
          let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;

          if (isSuccess) {
            bgClass = 'bg-slate-900/95 backdrop-blur-md text-white border-emerald-500/30 shadow-xl shadow-emerald-950/20';
            iconBg = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          } else if (isError) {
            bgClass = 'bg-slate-900/95 backdrop-blur-md text-white border-rose-500/30 shadow-xl shadow-rose-950/20';
            iconBg = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          } else if (isWarning) {
            bgClass = 'bg-slate-900/95 backdrop-blur-md text-white border-amber-500/30 shadow-xl shadow-amber-950/20';
            iconBg = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          } else {
            bgClass = 'bg-slate-900/95 backdrop-blur-md text-white border-blue-500/30 shadow-xl shadow-blue-950/20';
            iconBg = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
            icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`pointer-events-auto w-full p-4 rounded-2xl border ${bgClass} flex items-start gap-3.5 relative overflow-hidden`}
            >
              <div className={`p-2 rounded-xl ${iconBg} shrink-0 mt-0.5`}>
                {icon}
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <h4 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 leading-snug">
                  {toast.title}
                </h4>
                <p className="text-xs text-slate-300 font-medium mt-0.5 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                title="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
