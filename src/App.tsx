import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Warehouse } from './types';
import {
  getCurrentUser,
  setCurrentUser,
  getWarehouses,
  subscribeToStorage,
  syncFromSupabase,
} from './services/storage';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { WelcomeModal } from './components/WelcomeModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { ToastContainer } from './components/Common/ToastContainer';
import { Dashboard } from './components/Dashboard';
import { WarehouseView } from './components/WarehouseView';
import { WarehouseTabsBar } from './components/WarehouseTabsBar';
import { SalesModule } from './components/Movements/SalesModule';
import { ExpiryAlerts } from './components/ExpiryAlerts';
import { MovementsHistory } from './components/MovementsHistory';
import { AdminPanel } from './components/AdminPanel';
import { PermissionGuard } from './components/PermissionGuard';

// Modals
import { EntradasModal } from './components/Movements/EntradasModal';
import { TrasladosModal } from './components/Movements/TrasladosModal';
import { DescargosModal } from './components/Movements/DescargosModal';
import { GlobalProductCatalogModal } from './components/GlobalProductCatalogModal';

import { Building2, Plus, ArrowRightLeft, ArrowUpRight, Shield, Layers, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setLocalUser] = useState<UserProfile | null>(getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('INICIO');
  const [isSyncing, setSyncing] = useState(false);

  // Selected warehouse when on ALMACENES tab
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses());
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('00');

  // Modal States
  const [entradasOpen, setEntradasOpen] = useState(false);
  const [trasladosOpen, setTrasladosOpen] = useState(false);
  const [descargosOpen, setDescargosOpen] = useState(false);
  const [globalCatalogOpen, setGlobalCatalogOpen] = useState(false);
  const [catalogWarehouseFilter, setCatalogWarehouseFilter] = useState<string>('ALL');

  const handleOpenGlobalCatalog = (initialWhId: string = 'ALL') => {
    setCatalogWarehouseFilter(initialWhId);
    setGlobalCatalogOpen(true);
  };

  // Welcome & Logout Announcement States
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  useEffect(() => {
    // Check if path or hash includes 'admin'
    if (window.location.hash === '#/admin' || window.location.pathname === '/admin') {
      setActiveTab('ADMIN');
    }

    const unsub = subscribeToStorage(() => {
      setWarehouses(getWarehouses());
    });
    return unsub;
  }, []);

  // Background sync every 20 seconds
  useEffect(() => {
    if (currentUser) {
      const syncInterval = setInterval(() => {
        if (navigator.onLine) {
          syncFromSupabase().catch((err) => console.error('[Background Sync Error]', err));
        }
      }, 20000);
      return () => clearInterval(syncInterval);
    }
  }, [currentUser]);

  // Ensure non-admin users are automatically redirected to INICIO if they land on ADMIN tab
  useEffect(() => {
    if (currentUser && !currentUser.isAdmin && activeTab === 'ADMIN') {
      setActiveTab('INICIO');
      if (window.location.hash === '#/admin') {
        window.location.hash = '';
      }
    }
  }, [currentUser, activeTab]);

  const allowedWarehouses = currentUser ? warehouses.filter((w) =>
    currentUser.permissions.allowedWarehouses.includes(w.id)
  ) : [];

  const selectedWarehouse =
    allowedWarehouses.find((w) => w.id === selectedWarehouseId) || allowedWarehouses[0];

  useEffect(() => {
    if (selectedWarehouse && selectedWarehouse.id !== selectedWarehouseId) {
      setSelectedWarehouseId(selectedWarehouse.id);
    }
  }, [selectedWarehouse, selectedWarehouseId]);

  const handleLoginSuccess = (user: UserProfile) => {
    setLocalUser(user);
    setCurrentUser(user);
    setShowWelcomeModal(true); // Open personalized Welcome Announcement!

    // Non-admin users ALWAYS land on the main menu ('INICIO')
    if (user.isAdmin && (window.location.hash === '#/admin' || window.location.pathname === '/admin')) {
      setActiveTab('ADMIN');
    } else {
      setActiveTab('INICIO');
      if (window.location.hash === '#/admin') {
        window.location.hash = '';
      }
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    setShowWelcomeModal(false);
    setLocalUser(null);
    setCurrentUser(null);
  };

  // If user is not authenticated, show Login Modal
  if (!currentUser) {
    const isCurrentAdminRoute =
      window.location.hash === '#/admin' || window.location.pathname === '/admin';

    return (
      <LoginModal
        isAdminRoute={isCurrentAdminRoute}
        onLoginSuccess={handleLoginSuccess}
        onNavigateToAdmin={() => {
          window.location.hash = '#/admin';
        }}
        onNavigateToApp={() => {
          window.location.hash = '';
        }}
      />
    );
  }

  const isModalOverlayActive = showWelcomeModal || showLogoutConfirm;

  return (
    <>
      <div className={`min-h-screen bg-slate-100/70 font-sans text-slate-900 flex flex-col selection:bg-red-500 selection:text-white transition-all duration-500 ${isModalOverlayActive ? 'filter blur-sm md:blur-md pointer-events-none select-none' : ''}`}>
        {/* Top Header */}
        <Header
          currentUser={currentUser}
          onLogout={() => setShowLogoutConfirm(true)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

      {/* Secondary Quick Access Bar */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 text-xs font-bold shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none scrollbar-hide touch-auto py-1">
            <span className="text-slate-400 font-semibold uppercase text-[10px] shrink-0">
              Accesos Rápidos:
            </span>

            {currentUser.permissions.canEntries && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setEntradasOpen(true)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ingresar (Entrada)</span>
              </motion.button>
            )}

            {currentUser.permissions.canTransfers && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setTrasladosOpen(true)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-xs"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Trasladar Stock</span>
              </motion.button>
            )}

            {currentUser.permissions.canExits && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setDescargosOpen(true)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-xs"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Descargar Stock</span>
              </motion.button>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono flex-wrap">
            <span>Usuario Activo: <strong className="text-white">{currentUser.username}</strong></span>
            <span className="relative flex h-2.5 w-2.5 items-center justify-center mx-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
            </span>
            <span className="text-emerald-400 font-bold tracking-wider mr-1">ONLINE</span>

            <button
              onClick={async () => {
                if (isSyncing) return;
                setSyncing(true);
                try {
                  await syncFromSupabase();
                } catch (e) {
                  console.error('Manual sync failed:', e);
                } finally {
                  setSyncing(false);
                }
              }}
              disabled={isSyncing}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-200 border border-slate-700 rounded-lg font-bold text-[10px] flex items-center gap-1.5 transition-all select-none disabled:opacity-50"
              title="Sincronizar datos con la nube de Supabase"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 pb-16 relative">
        <AnimatePresence mode="wait">
          {activeTab === 'INICIO' && (
            <motion.div
              key="INICIO"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Dashboard
                currentUser={currentUser}
                onOpenEntradas={() => setEntradasOpen(true)}
                onOpenTraslados={() => setTrasladosOpen(true)}
                onOpenDescargos={() => setDescargosOpen(true)}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onOpenGlobalCatalog={() => handleOpenGlobalCatalog('ALL')}
              />
            </motion.div>
          )}

          {activeTab === 'ALMACENES' && (
            <motion.div
              key="ALMACENES"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="max-w-7xl mx-auto px-4 py-8 space-y-6"
            >
              {/* Warehouse Switcher Navigation Bar with Desktop Scroll Controls & Quick Dropdown */}
              <WarehouseTabsBar
                warehouses={warehouses}
                selectedWarehouseId={selectedWarehouseId}
                onSelectWarehouse={setSelectedWarehouseId}
                allowedWarehouseIds={currentUser.permissions.allowedWarehouses}
              />

              {/* Warehouse View Content with Smooth Fluid Transition */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedWarehouseId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {selectedWarehouse ? (
                    <WarehouseView
                      warehouse={selectedWarehouse}
                      currentUser={currentUser}
                      onNavigateToAuditReport={() => setActiveTab('NOTAS')}
                      onOpenGlobalCatalog={(whId) => handleOpenGlobalCatalog(whId || selectedWarehouse.id)}
                    />
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs font-bold bg-white rounded-2xl border border-slate-200">
                      No tiene permisos asignados para visualizar ningún almacén.
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'VENTAS' && (
            <motion.div
              key="VENTAS"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <PermissionGuard
                hasPermission={currentUser.permissions.canSales}
                moduleName="Módulo de Productos Vendidos"
              >
                <SalesModule currentUser={currentUser} />
              </PermissionGuard>
            </motion.div>
          )}

          {activeTab === 'VENCIMIENTO' && (
            <motion.div
              key="VENCIMIENTO"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <ExpiryAlerts />
            </motion.div>
          )}

          {activeTab === 'NOTAS' && (
            <motion.div
              key="NOTAS"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <MovementsHistory />
            </motion.div>
          )}

          {activeTab === 'ADMIN' && (
            <motion.div
              key="ADMIN"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <PermissionGuard
                hasPermission={currentUser.isAdmin}
                moduleName="Panel de Administración del Sistema"
              >
                <AdminPanel currentUser={currentUser} />
              </PermissionGuard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <p className="font-semibold">
            &copy; {new Date().getFullYear()} PanStock — Panadería Española C.A (RIF: J-070054034). Todos los derechos reservados.
          </p>
          <span className="text-[11px] font-mono bg-slate-800 px-3 py-1 rounded-full text-amber-400">
            Sincronización Local v1.0 • Vercel Ready
          </span>
        </div>
      </footer>

      {/* Transaction Modals */}
      <EntradasModal
        isOpen={entradasOpen}
        onClose={() => setEntradasOpen(false)}
        currentUser={currentUser}
      />

      <TrasladosModal
        isOpen={trasladosOpen}
        onClose={() => setTrasladosOpen(false)}
        currentUser={currentUser}
      />

      <DescargosModal
        isOpen={descargosOpen}
        onClose={() => setDescargosOpen(false)}
        currentUser={currentUser}
      />

      <GlobalProductCatalogModal
        isOpen={globalCatalogOpen}
        onClose={() => setGlobalCatalogOpen(false)}
        initialWarehouseId={catalogWarehouseFilter}
      />
    </div>

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Welcome Announcement Modal with Background Blur */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        currentUser={currentUser}
        onClose={() => setShowWelcomeModal(false)}
      />

      {/* Logout Confirmation Modal with Background Blur */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        currentUser={currentUser}
        onConfirmLogout={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
