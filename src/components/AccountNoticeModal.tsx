import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, UserX, AlertTriangle, ArrowRight, Lock } from 'lucide-react';

interface AccountNoticeModalProps {
  isOpen: boolean;
  type: 'SUSPENDED' | 'DELETED' | 'PERMISSIONS_CHANGED';
  username: string;
  reason?: string;
  onClose: () => void;
}

export const AccountNoticeModal: React.FC<AccountNoticeModalProps> = ({
  isOpen,
  type,
  username,
  reason,
  onClose,
}) => {
  if (!isOpen) return null;

  const isSuspended = type === 'SUSPENDED';
  const isDeleted = type === 'DELETED';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-900 selection:bg-red-500 selection:text-white"
        >
          {/* Top Decorative Header */}
          <div
            className={`p-6 text-white text-center relative overflow-hidden ${
              isSuspended
                ? 'bg-gradient-to-br from-red-600 via-red-700 to-rose-900'
                : isDeleted
                ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-black'
                : 'bg-gradient-to-br from-amber-600 to-orange-700'
            }`}
          >
            {/* Background Pattern glow */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="inline-flex p-3.5 rounded-2xl bg-white/15 border border-white/25 shadow-inner mb-3">
              {isSuspended ? (
                <ShieldAlert className="w-9 h-9 text-white animate-pulse" />
              ) : isDeleted ? (
                <UserX className="w-9 h-9 text-rose-300" />
              ) : (
                <Lock className="w-9 h-9 text-white" />
              )}
            </div>

            <h3 className="text-xl font-black tracking-tight">
              {isSuspended
                ? 'Acceso de Cuenta Suspendido'
                : isDeleted
                ? 'Cuenta Desactivada / Eliminada'
                : 'Permisos de Cuenta Actualizados'}
            </h3>

            <p className="text-xs font-semibold text-white/80 mt-1">
              {isSuspended
                ? 'Acción ejecutada en tiempo real por el Administrador'
                : isDeleted
                ? 'El usuario ha sido removido del sistema'
                : 'Modificación aplicada por la administración'}
            </p>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 font-bold uppercase">Usuario Afectado:</span>
                <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {username}
                </span>
              </div>

              <div className="h-px bg-slate-200/60 my-1" />

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {reason ||
                  (isSuspended
                    ? 'Tu cuenta ha sido suspendida por un administrador del sistema. Tu sesión activa ha sido cerrada de forma inmediata.'
                    : isDeleted
                    ? 'Tu cuenta de usuario ha sido eliminada del sistema. Tu sesión ha finalizado.'
                    : 'Tus permisos han sido actualizados. Los cambios han sido aplicados a tu sesión activa.')}
              </p>
            </div>

            {isSuspended && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Si consideras que esto es un error o necesitas reactivar tu acceso, por favor contacta a la gerencia o al administrador de Panadería Española.
                </span>
              </div>
            )}

            {/* Confirmation Action Button */}
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Entendido, Ir al Inicio de Sesión</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
