import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { EspañolaFullLogo } from './Logos';
import { getWarehouses } from '../services/storage';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Building2,
  Wheat,
  Warehouse as WarehouseIcon,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  currentUser,
  onClose,
}) => {
  const [isWarehousesExpanded, setIsWarehousesExpanded] = useState(false);

  const allWarehouses = getWarehouses();
  const allowedWarehouseIds = currentUser.permissions?.allowedWarehouses || [];
  const allowedWarehousesList = currentUser.isAdmin
    ? allWarehouses
    : allWarehouses.filter((w) => allowedWarehouseIds.includes(w.id));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 flex min-h-full items-center justify-center">
          {/* Full-screen Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-950/70"
            onClick={onClose}
          />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 text-slate-900 max-h-[92vh] flex flex-col my-auto"
        >
          {/* Top Banner with Dark Gradient & Logo */}
          <div className="relative bg-gradient-to-br from-[#1c130d] via-[#2a1a10] to-[#170e08] p-4 sm:p-5 text-center text-white overflow-hidden border-b border-amber-900/30 shrink-0">
            {/* Background Decorative Wheat Motif */}
            <div className="absolute -left-6 -top-6 text-amber-500/10 pointer-events-none">
              <Wheat className="w-28 h-28" />
            </div>
            <div className="absolute -right-6 -bottom-6 text-amber-500/10 pointer-events-none">
              <Wheat className="w-28 h-28" />
            </div>

            {/* Sparkles / System Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/20 text-white text-[11px] font-black uppercase tracking-wider mb-2.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
              <span className="text-white font-extrabold">PanStock • Panadería Española C.A</span>
            </div>

            {/* Main Featured Logo Box (YEYE NUEVO LOGO) */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xl border border-amber-100 relative flex flex-col items-center justify-center transform transition-transform hover:scale-[1.01]">
              <img
                src="/YEYE NUEVO LOGO.png"
                alt="Panadería Española - El Secreto del Mejor Pan!"
                className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-md"
                onError={(e) => {
                  // Fallback to espanola.png if YEYE NUEVO LOGO fails
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('YEYE')) {
                    target.src = '/espanola.png';
                  } else {
                    target.style.display = 'none';
                    const fallbackEl = document.getElementById('welcome-logo-fallback');
                    if (fallbackEl) fallbackEl.style.display = 'block';
                  }
                }}
              />
              <div id="welcome-logo-fallback" style={{ display: 'none' }}>
                <EspañolaFullLogo width={160} height={70} />
              </div>
            </div>
          </div>

          {/* Welcome Body Content */}
          <div className="p-5 sm:p-6 space-y-4 text-center overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 font-black shadow-inner mb-0.5">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ¡Bienvenido/a, <span className="text-red-600 underline decoration-amber-500/50 underline-offset-4">{currentUser.username}</span>!
              </h2>

              <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-sm mx-auto leading-relaxed">
                Has iniciado sesión exitosamente en el sistema de gestión e inventario de <strong className="text-slate-800">Panadería Española C.A.</strong>
              </p>
            </div>

            {/* User Access Profile Details Card */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 text-left space-y-3 text-xs shadow-inner">
              {/* Profile & Role Header */}
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-extrabold text-slate-600 uppercase text-[10px] tracking-wider">Perfil de Acceso:</span>
                </div>
                <span className="font-black px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-md border border-amber-200 text-xs">
                  {currentUser.roleName}
                </span>
              </div>

              {/* Section 1: Almacenes Autorizados (Desplegable) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <WarehouseIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Almacenes Autorizados:
                  </span>
                  <span className="text-slate-800 font-black">
                    {currentUser.isAdmin ? `Todos los Almacenes (${allWarehouses.length})` : `${allowedWarehousesList.length} Almacén(es)`}
                  </span>
                </div>

                {/* Botón para Desplegar / Ocultar Almacenes */}
                <button
                  type="button"
                  onClick={() => setIsWarehousesExpanded(!isWarehousesExpanded)}
                  className="w-full py-2 px-3 bg-slate-200/60 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-300/70 text-xs flex items-center justify-between transition-all active:scale-[0.99] shadow-2xs"
                >
                  <span className="text-[11px] font-extrabold">
                    {isWarehousesExpanded
                      ? 'Ocultar lista de almacenes'
                      : `Ver los ${allowedWarehousesList.length} almacenes habilitados`}
                  </span>
                  {isWarehousesExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                </button>

                {/* Lista Desplegable con Animación Smooth */}
                <AnimatePresence>
                  {isWarehousesExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 pb-1 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {allowedWarehousesList.map((wh) => (
                          <span
                            key={wh.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 text-slate-800 font-bold rounded-lg text-[10px] border border-slate-300/80 shadow-2xs"
                          >
                            <span className="text-amber-800 font-black bg-amber-100 px-1.5 py-0.2 rounded text-[9px]">{wh.code}</span>
                            <span className="truncate max-w-[160px]">{wh.name}</span>
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Section 2: Movimientos / Operaciones Permitidas */}
              <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Movimientos de Inventario Permitidos:
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {currentUser.permissions.canEntries && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-md border border-emerald-200/80 text-[10px]">
                      <ArrowDownLeft className="w-3 h-3 text-emerald-600 shrink-0" /> Entradas (Ingreso)
                    </span>
                  )}
                  {currentUser.permissions.canExits && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 font-bold rounded-md border border-rose-200/80 text-[10px]">
                      <ArrowUpRight className="w-3 h-3 text-rose-600 shrink-0" /> Descargos (Salidas)
                    </span>
                  )}
                  {currentUser.permissions.canTransfers && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 font-bold rounded-md border border-amber-200/80 text-[10px]">
                      <RefreshCw className="w-3 h-3 text-amber-600 shrink-0" /> Traslados de Stock
                    </span>
                  )}
                  {currentUser.isAdmin && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-800 font-bold rounded-md border border-purple-200/80 text-[10px]">
                      <Shield className="w-3 h-3 text-purple-600 shrink-0" /> Gestión Total de Administración
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Primary CTA Button to Enter App */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-red-600 via-amber-600 to-red-700 hover:from-red-700 hover:to-amber-700 text-white font-black rounded-2xl shadow-lg shadow-red-600/30 hover:shadow-red-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm sm:text-base group"
            >
              <span>Empezar a utilizar PanStock</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform shrink-0" />
            </button>

            {/* Footer Note */}
            <p className="text-[11px] font-bold text-slate-400">
              Panadería Española C.A. • RIF J-070054034
            </p>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
