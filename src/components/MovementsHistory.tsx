import React, { useState, useEffect } from 'react';
import { MovementRecord, Warehouse } from '../types';
import { getMovements, getWarehouses, subscribeToStorage } from '../services/storage';
import { matchesMovementSearch, parseAnyDate } from '../utils/movementSearch';
import { NotePDFModal } from './NotePDFModal';
import { generateMovementPDF } from '../utils/pdfGenerator';
import { PhysicalAuditReport } from './PhysicalAuditReport';

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
import {
  FileText,
  Search,
  Filter,
  Download,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ShoppingCart,
  Calendar,
  User,
  ClipboardCheck,
  History,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Building2,
  CalendarRange,
  X,
  SlidersHorizontal,
} from 'lucide-react';

export const MovementsHistory: React.FC = () => {
  const [subTab, setSubTab] = useState<'AUDIT_REPORT' | 'MOVEMENTS_LOG'>('AUDIT_REPORT');
  const [movements, setMovements] = useState<MovementRecord[]>(getMovements);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('ALL');
  const [filterUser, setFilterUser] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [selectedMovement, setSelectedMovement] = useState<MovementRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = () => {
    setMovements(getMovements());
    setWarehouses(getWarehouses());
  };

  useEffect(() => {
    loadData();
    return subscribeToStorage(loadData);
  }, []);

  // Handle Preset Date Quick Switch
  const handlePresetChange = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = getLocalDateString(now);

    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'TODAY') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'WEEK') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setDateFrom(getLocalDateString(past));
      setDateTo(todayStr);
    } else if (preset === 'MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(getLocalDateString(firstDay));
      setDateTo(todayStr);
    }
  };

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterWarehouse, filterUser, dateFrom, dateTo, itemsPerPage]);

  const distinctUsers = Array.from(
    new Set(movements.map((m) => m.responsibleUser).filter((u): u is string => Boolean(u)))
  ).sort();

  const filteredMovements = movements.filter((m) => {
    // 1. Filter by Operation Type
    if (filterType !== 'ALL' && m.type !== filterType) return false;

    // 2. Filter by Warehouse
    if (filterWarehouse !== 'ALL') {
      const matchWh =
        m.sourceWarehouseId === filterWarehouse || m.targetWarehouseId === filterWarehouse;
      if (!matchWh) return false;
    }

    // 3. Filter by Responsible User
    if (filterUser !== 'ALL') {
      if (m.responsibleUser !== filterUser) return false;
    }

    // 4. Filter by Date Range (Using robust parseAnyDate)
    if (dateFrom || dateTo) {
      const mDate = parseAnyDate(m.date);
      if (mDate) {
        if (dateFrom) {
          const fromDate = new Date(dateFrom + 'T00:00:00');
          if (mDate < fromDate) return false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo + 'T23:59:59');
          if (mDate > toDate) return false;
        }
      } else {
        // If date string cannot be parsed, exclude it when date filter is applied
        return false;
      }
    }

    // 5. Advanced free text search (multi-token date, operation, codes, user, etc.)
    return matchesMovementSearch(m, searchQuery, warehouses);
  });

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (filterType !== 'ALL' ? 1 : 0) +
    (filterWarehouse !== 'ALL' ? 1 : 0) +
    (filterUser !== 'ALL' ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterType('ALL');
    setFilterWarehouse('ALL');
    setFilterUser('ALL');
    setDatePreset('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const totalItems = filteredMovements.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ENTRADA':
        return {
          label: 'ENTRADA (INGRESO)',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          icon: <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'TRASLADO':
        return {
          label: 'TRASLADO INTERNO',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'DESCARGO':
        return {
          label: 'DESCARGO (SALIDA)',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />,
        };
      case 'VENTA':
        return {
          label: 'VENTA REALIZADA',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          icon: <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'AJUSTE_INVENTARIO':
        return {
          label: 'AJUSTE DE INVENTARIO',
          bg: 'bg-purple-100 text-purple-900 border-purple-300',
          icon: <ClipboardCheck className="w-3.5 h-3.5 text-purple-600" />,
        };
      default:
        return {
          label: type,
          bg: 'bg-slate-100 text-slate-800',
          icon: <FileText className="w-3.5 h-3.5" />,
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Sub-tab Navigation Switcher */}
      <div className="bg-white p-2 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap gap-2">
        <button
          onClick={() => setSubTab('AUDIT_REPORT')}
          className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 ${
            subTab === 'AUDIT_REPORT'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Reporte General de Inventarios Físicos (Auditorías)</span>
        </button>

        <button
          onClick={() => setSubTab('MOVEMENTS_LOG')}
          className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 ${
            subTab === 'MOVEMENTS_LOG'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial de Comprobantes y Movimientos</span>
        </button>
      </div>

      {subTab === 'AUDIT_REPORT' ? (
        <PhysicalAuditReport />
      ) : (
        <>
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>HISTÓRICO DE COMPROBANTES Y NOTAS DE ENTREGA</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight">Registro General de Movimientos</h1>
              <p className="text-xs text-slate-300 mt-1">
                Consulte, visualice o descargue en PDF las Notas de Entrega, Ingresos, Descargos y Ventas de la empresa.
              </p>
            </div>
          </div>

      {/* Professional Advanced Toolbar & Filters for Movements */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        {/* Header row with Title & Clear Filters Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-red-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Filtros Avanzados de Búsqueda
            </h2>
            {activeFilterCount > 0 && (
              <span className="bg-red-100 text-red-700 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-red-200">
                {activeFilterCount} {activeFilterCount === 1 ? 'filtro activo' : 'filtros activos'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-semibold">
              Resultados: <strong className="text-slate-900 font-extrabold">{totalItems}</strong> de {movements.length}
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition-all border border-red-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 1: Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por fecha (ej: 17/07, 31/7), tipo (ej: tras, ent), responsable, comprobante, almacén o producto..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Row 2: Select Filters (Tipo, Almacén, Responsable) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tipo de Operación */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-red-500" />
              <span>Tipo de Operación</span>
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="ALL">Todos los Tipos de Operación</option>
              <option value="ENTRADA">Entradas (Ingresos)</option>
              <option value="TRASLADO">Traslados Internos</option>
              <option value="DESCARGO">Descargos (Salidas)</option>
              <option value="VENTA">Ventas Realizadas</option>
              <option value="AJUSTE_INVENTARIO">Ajustes de Inventario (Auditorías)</option>
            </select>
          </div>

          {/* Almacén */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-amber-500" />
              <span>Almacén Afectado</span>
            </label>
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="ALL">Todos los Almacenes</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Responsable */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-blue-500" />
              <span>Usuario Responsable</span>
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="ALL">Todos los Usuarios Responsables</option>
              {distinctUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Date Filtering (Presets & Date Pickers) */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Presets */}
          <div className="lg:col-span-6 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1 flex items-center gap-1">
              <CalendarRange className="w-3 h-3 text-emerald-500" />
              <span>Rango Rápido:</span>
            </span>
            {(
              [
                { id: 'ALL', label: 'Todo el Historial' },
                { id: 'TODAY', label: 'Hoy' },
                { id: 'WEEK', label: 'Últimos 7 días' },
                { id: 'MONTH', label: 'Este Mes' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetChange(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  datePreset === preset.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <div className="lg:col-span-6 flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Desde:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <span className="text-slate-400 font-bold mt-3">-</span>

            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Hasta:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {totalItems === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic">
            No hay comprobantes o movimientos registrados que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-none scrollbar-hide touch-pan-x">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-extrabold uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Nº Comprobante</th>
                    <th className="p-3.5">Tipo Operación</th>
                    <th className="p-3.5">Doc. Referencia</th>
                    <th className="p-3.5">Fecha / Hora</th>
                    <th className="p-3.5">Responsable</th>
                    <th className="p-3.5 text-center">Items</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedMovements.map((mov) => {
                    const badge = getTypeBadge(mov.type);

                    return (
                      <tr
                        key={mov.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedMovement(mov);
                          setModalOpen(true);
                        }}
                      >
                        <td className="p-3.5 font-mono font-black text-slate-900">{mov.movementNumber}</td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-black text-[10px] border ${badge.bg}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-700">{mov.docRef}</td>
                        <td className="p-3.5 text-slate-600 font-medium">{mov.date}</td>
                        <td className="p-3.5 font-bold text-slate-900">{mov.responsibleUser}</td>
                        <td className="p-3.5 text-center font-extrabold text-slate-800">
                          {mov.items.length} item(s)
                        </td>
                        <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => generateMovementPDF(mov)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 ml-auto transition-all"
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-3">
                <span>
                  Mostrando <strong className="text-slate-900">{startIndex + 1}</strong> a{' '}
                  <strong className="text-slate-900">{endIndex}</strong> de{' '}
                  <strong className="text-slate-900">{totalItems}</strong> registros
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-slate-500 font-medium">Por página:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-500"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* First page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white rounded-lg transition-colors"
                  title="Primera página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white rounded-lg transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>

                <span className="px-3 py-1 bg-red-600 text-white font-black rounded-lg">
                  {currentPage} / {totalPages}
                </span>

                {/* Next page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white rounded-lg transition-colors"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* PDF / Document View Modal */}
      <NotePDFModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedMovement(null);
        }}
        movement={selectedMovement}
      />
        </>
      )}
    </div>
  );
};
