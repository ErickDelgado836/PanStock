import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { LogOut, AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onConfirmLogout: () => void;
  onCancel: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  currentUser,
  onConfirmLogout,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Fullscreen Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-950/75"
            onClick={onCancel}
          />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 text-slate-900"
        >
          {/* Header Bar */}
          <div className="relative bg-gradient-to-r from-red-900 via-amber-950 to-red-950 p-6 text-white text-center border-b border-amber-950/40">
            <button
              onClick={onCancel}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-all"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 mb-3 shadow-inner">
              <LogOut className="w-7 h-7 text-red-400" />
            </div>

            <h3 className="text-xl font-black tracking-tight text-white">
              Cerrar Sesión del Sistema
            </h3>
            <p className="text-xs font-bold text-amber-200/80 mt-1 uppercase tracking-wider">
              PanStock • Panadería Española C.A.
            </p>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-base font-extrabold text-slate-800">
                ¡Hola, <span className="text-red-600 font-black">{currentUser.username}</span>!
              </p>
              <p className="text-sm font-semibold text-slate-600 leading-relaxed">
                ¿Estás seguro que deseas salir de <strong className="text-slate-900">PanStock</strong>?
              </p>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center gap-3 text-left text-xs font-bold text-amber-900">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Para volver a ingresar tendrás que introducir nuevamente tu usuario y contraseña.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-2xl border border-slate-300/80 transition-all active:scale-[0.98] text-xs sm:text-sm"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={onConfirmLogout}
                className="flex-1 py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl shadow-lg shadow-red-600/30 transition-all active:scale-[0.98] text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sí, Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
