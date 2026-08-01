import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X } from 'lucide-react';

interface PermissionGuardProps {
  hasPermission: boolean;
  moduleName?: string;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  hasPermission,
  moduleName = 'este módulo',
  children,
}) => {
  if (!hasPermission) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-red-100 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Acceso Restringido</h2>
        <p className="text-sm font-bold text-red-700 mt-1">Actualmente no está habilitado para esta función</p>

        <p className="text-xs text-slate-600 my-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          No cuenta con los permisos necesarios para acceder a <strong>{moduleName}</strong>.
          Solicite la habilitación al Administrador del sistema.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

interface PermissionGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export const PermissionGuardModal: React.FC<PermissionGuardModalProps> = ({
  isOpen,
  onClose,
  message = 'Actualmente no está habilitado para esta función.',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-red-100"
          >
            <div className="bg-red-50 p-6 flex flex-col items-center text-center relative border-b border-red-100">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-red-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-3 shadow-inner">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Acceso Restringido</h3>
              <p className="text-sm text-red-700 font-medium mt-1">Permisos Insuficientes</p>
            </div>

            <div className="p-6 text-center">
              <p className="text-slate-700 font-medium text-base mb-6 leading-relaxed">
                {message}
              </p>
              <p className="text-xs text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                Contacte al perfil de Administrador para solicitar la habilitación de este permiso o almacén.
              </p>

              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
