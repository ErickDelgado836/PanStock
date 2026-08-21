import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { EspañolaFullLogo } from './Logos';
import { SupabaseModal } from './SupabaseModal';
import { checkIsSupabaseConfigured } from '../lib/supabase';
import {
  LogOut,
  User,
  LayoutGrid,
  Building2,
  PackageSearch,
  Clock,
  ClipboardList,
  Settings,
  Wheat,
  Database,
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  const tabs = [
    { id: 'INICIO', label: 'Inicio', icon: LayoutGrid },
  ];

  if (currentUser.isAdmin || (currentUser.permissions.allowedWarehouses && currentUser.permissions.allowedWarehouses.length > 0)) {
    tabs.push({ id: 'ALMACENES', label: 'Almacenes', icon: Building2 });
  }

  if (currentUser.isAdmin || currentUser.permissions.canSales) {
    tabs.push({ id: 'VENTAS', label: 'Ventas', icon: PackageSearch });
  }

  if (currentUser.isAdmin || currentUser.permissions.canExpiry) {
    tabs.push({ id: 'VENCIMIENTO', label: 'Vencimientos', icon: Clock });
  }

  tabs.push({ id: 'NOTAS', label: 'Notas (Auditoría)', icon: ClipboardList });

  if (currentUser.isAdmin) {
    tabs.push({ id: 'ADMIN', label: 'Panel Admin', icon: Settings });
  }

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        {/* Top Banner Bar with RIF & Status */}
        <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold tracking-wide">PanStock Española C.A</span>
            <span className="text-slate-500">•</span>
            <span>RIF: <strong className="text-white">J-070054034</strong></span>
          </div>

          <div className="flex items-center gap-4">
            {/* Supabase Cloud Connection Indicator */}
            {(() => {
              const isConfigured = checkIsSupabaseConfigured();
              return (
                <button
                  onClick={() => setShowSupabaseModal(true)}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border transition-all cursor-pointer ${
                    isConfigured
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/90'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:bg-amber-900/90'
                  }`}
                  title="Ver estado de conexión con Supabase"
                >
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span>{isConfigured ? 'Supabase Conectado' : 'Supabase SQL'}</span>
                </button>
              );
            })()}

            <div className="flex items-center gap-1.5 text-slate-300">
              <User className="w-3.5 h-3.5 text-red-400" />
              <span>Usuario: <strong className="text-white">{currentUser.username}</strong> ({currentUser.roleName})</span>
            </div>
          </div>
        </div>

        {/* Main Navbar Header */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo & Slogan */}
          <div className="flex items-center gap-4">
            <img
              src="/espanola.png"
              alt="Panadería Española - El Secreto del Mejor Pan!"
              className="h-11 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                const fallbackEl = document.getElementById('header-logo-fallback');
                if (fallbackEl) fallbackEl.style.display = 'block';
              }}
            />
            <div id="header-logo-fallback" style={{ display: 'none' }}>
              <EspañolaFullLogo width={120} height={50} />
            </div>

            {/* Slogan Divider & Professional Badge */}
            <div className="hidden md:flex items-center gap-2.5 border-l-2 border-amber-500/40 pl-4 py-0.5">
              <Wheat className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-black tracking-wide text-slate-900 italic">
                  "¡El Secreto del Mejor Pan!"
                </p>
                <p className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                  Panadería Española • EXCELENTE CALIDAD
                </p>
              </div>
            </div>
          </div>

          {/* Center Decorative Badge (visible on lg screens) */}
          <div className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 border border-blue-800/50 px-4 py-1.5 rounded-full text-white text-xs font-black shadow-md tracking-wide">
            <span>Sistema de Gestión de Inventario</span>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-red-200 shadow-2xs"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </motion.button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 overflow-x-auto scrollbar-none scrollbar-hide touch-auto">
          <div className="max-w-7xl mx-auto flex gap-1 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap shrink-0 relative ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                      : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Supabase Status and Setup Modal */}
      <SupabaseModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        currentUser={currentUser}
      />
    </>
  );
};


