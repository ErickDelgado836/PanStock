import React, { useState, useEffect } from 'react';
import { Product, Warehouse, Category, PhysicalAuditRecord } from '../types';
import {
  getProducts,
  getWarehouses,
  getCategories,
  getPhysicalAudits,
  subscribeToStorage,
  syncFromSupabase,
} from '../services/storage';
import { generateAuditReportPDF } from '../utils/pdfGenerator';
import { CustomSelect } from './Common/CustomSelect';
import {
  ClipboardCheck,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Minus,
  Equal,
  HelpCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  X,
} from 'lucide-react';

export const PhysicalAuditReport: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [audits, setAudits] = useState<PhysicalAuditRecord[]>([]);
  const [isSyncing, setSyncing] = useState(false);

  // Filter States
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedStock, setSelectedStock] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  const loadData = () => {
    setProducts(getProducts());
    setWarehouses(getWarehouses());
    setCategories(getCategories());
    setAudits(getPhysicalAudits());
  };

  useEffect(() => {
    loadData();
    return subscribeToStorage(loadData);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedWarehouseId,
    selectedCategoryId,
    selectedStatus,
    selectedStock,
    searchQuery,
    startDate,
    endDate,
    itemsPerPage,
  ]);

  const hasActiveFilters =
    selectedWarehouseId !== 'ALL' ||
    selectedCategoryId !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedStock !== 'ALL' ||
    searchQuery.trim() !== '' ||
    startDate !== '' ||
    endDate !== '';

  const handleClearAllFilters = () => {
    setSelectedWarehouseId('ALL');
    setSelectedCategoryId('ALL');
    setSelectedStatus('ALL');
    setSelectedStock('ALL');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  // Map latest physical audit per (productId, warehouseId) within optional date range
  const getLatestAuditMap = () => {
    const map: {
      [key: string]: {
        physicalStock: number;
        systemStock: number;
        difference: number;
        date: string;
        responsibleUser: string;
      };
    } = {};

    // Audits are already sorted newest first in storage
    audits.forEach((audit) => {
      // Date range filtering on audit timestamp
      if (startDate || endDate) {
        // Parse audit date string e.g. "29/7/2026, 10:02:56 a. m." or standard date
        const parts = audit.date.split(',');
        let auditTime = 0;
        if (parts.length > 0) {
          const dateParts = parts[0].trim().split('/');
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);
            auditTime = new Date(year, month, day).getTime();
          }
        }

        if (startDate) {
          const startMs = new Date(startDate).getTime();
          if (auditTime < startMs) return;
        }

        if (endDate) {
          const endMs = new Date(endDate).getTime() + 86400000; // end of day
          if (auditTime > endMs) return;
        }
      }

      audit.items.forEach((item) => {
        const key = `${item.productId}_${audit.warehouseId}`;
        // If not added yet (since newest first), save it
        if (!map[key]) {
          map[key] = {
            physicalStock: item.physicalStock,
            systemStock: item.systemStock,
            difference: item.difference,
            date: audit.date,
            responsibleUser: audit.responsibleUser,
          };
        }
      });
    });

    return map;
  };

  const auditMap = getLatestAuditMap();

  // Build full inventory audit matrix: Product + Warehouse combinations
  const buildAuditRows = () => {
    const rows: {
      product: Product;
      warehouse: Warehouse;
      category: Category | undefined;
      systemStock: number;
      auditInfo?: {
        physicalStock: number;
        systemStock: number;
        difference: number;
        date: string;
        responsibleUser: string;
      };
      status: 'PENDING' | 'CORRECT' | 'MISSING' | 'SURPLUS';
    }[] = [];

    const activeWarehouses =
      selectedWarehouseId === 'ALL'
        ? warehouses
        : warehouses.filter((w) => w.id === selectedWarehouseId);

    products.forEach((prod) => {
      if (selectedCategoryId !== 'ALL' && prod.categoryId !== selectedCategoryId) return;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = prod.code.toLowerCase().includes(q);
        const matchName = prod.name.toLowerCase().includes(q);
        if (!matchCode && !matchName) return;
      }

      const cat = categories.find((c) => c.id === prod.categoryId);

      activeWarehouses.forEach((wh) => {
        const sysStock = prod.stockByWarehouse[wh.id] || 0;

        // Stock presence filter
        if (selectedStock === 'WITH_STOCK' && sysStock <= 0) return;
        if (selectedStock === 'WITHOUT_STOCK' && sysStock > 0) return;

        const key = `${prod.id}_${wh.id}`;
        const auditInfo = auditMap[key];

        let status: 'PENDING' | 'CORRECT' | 'MISSING' | 'SURPLUS' = 'PENDING';
        if (auditInfo) {
          if (auditInfo.difference < 0) status = 'MISSING';
          else if (auditInfo.difference > 0) status = 'SURPLUS';
          else status = 'CORRECT';
        }

        if (selectedStatus !== 'ALL' && status !== selectedStatus) return;

        rows.push({
          product: prod,
          warehouse: wh,
          category: cat,
          systemStock: sysStock,
          auditInfo,
          status,
        });
      });
    });

    return rows;
  };

  const rows = buildAuditRows();

  // Pagination calculations
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedRows = rows.slice(startIndex, endIndex);

  // Calculate Metrics
  const totalCount = rows.length;
  const auditedCount = rows.filter((r) => r.status !== 'PENDING').length;
  const pendingCount = rows.filter((r) => r.status === 'PENDING').length;
  const correctCount = rows.filter((r) => r.status === 'CORRECT').length;
  const missingRows = rows.filter((r) => r.status === 'MISSING');
  const surplusRows = rows.filter((r) => r.status === 'SURPLUS');

  const missingCount = missingRows.length;
  const surplusCount = surplusRows.length;

  const handleExportPDF = () => {
    const targetWh = warehouses.find((w) => w.id === selectedWarehouseId);
    const targetCat = categories.find((c) => c.id === selectedCategoryId);

    let dateRangeText = 'Todas las fechas';
    if (startDate && endDate) dateRangeText = `Desde ${startDate} hasta ${endDate}`;
    else if (startDate) dateRangeText = `Desde ${startDate}`;
    else if (endDate) dateRangeText = `Hasta ${endDate}`;

    const pdfSummary = {
      warehouseName: targetWh ? `${targetWh.code} - ${targetWh.name}` : 'Todos los Almacenes',
      categoryName: targetCat ? targetCat.name : 'Todas las Categorías',
      dateRangeText,
      totalItems: totalCount,
      auditedItems: auditedCount,
      pendingItems: pendingCount,
      correctItems: correctCount,
      missingItems: missingCount,
      surplusItems: surplusCount,
    };

    const pdfItems = rows.map((r) => ({
      productCode: r.product.code,
      productName: r.product.name,
      categoryName: r.category?.name || 'General',
      warehouseCode: r.warehouse.code,
      warehouseName: r.warehouse.name,
      unit: r.product.unit,
      systemStock: r.systemStock,
      physicalStock: r.auditInfo ? r.auditInfo.physicalStock : null,
      difference: r.auditInfo ? r.auditInfo.difference : null,
      status: r.status,
      lastAuditDate: r.auditInfo?.date,
      responsibleUser: r.auditInfo?.responsibleUser,
    }));

    generateAuditReportPDF(pdfSummary, pdfItems);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>REPORTE GENERAL DE AUDITORÍA E INVENTARIOS FÍSICOS</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Estado Real de Conteos en Almacén</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Compare la existencia física verificada contra el sistema. Visualice en tiempo real los faltantes, sobrantes y productos pendientes de conteo por almacén o categoría.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
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
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 select-none"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Actualizar Datos'}</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all shrink-0 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Reporte PDF</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Ítems</span>
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <p className="text-[10px] text-slate-500 font-medium">Evaluados en filtro</p>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Con Auditoría</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950">{auditedCount}</div>
          <p className="text-[10px] text-emerald-700 font-medium">
            {totalCount > 0 ? `${((auditedCount / totalCount) * 100).toFixed(0)}% del total` : '0%'}
          </p>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Sin Conteo</span>
            <HelpCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950">{pendingCount}</div>
          <p className="text-[10px] text-amber-800 font-medium">Pendiente de física</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Correctos</span>
            <Equal className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{correctCount}</div>
          <p className="text-[10px] text-slate-500 font-medium">Sin diferencia</p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Con Faltante</span>
            <Minus className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-950">{missingCount}</div>
          <p className="text-[10px] text-rose-700 font-medium">Faltan productos</p>
        </div>

        <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-teal-800">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Con Sobrante</span>
            <Plus className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-950">{surplusCount}</div>
          <p className="text-[10px] text-teal-800 font-medium">Sobran productos</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Warehouse Filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
              Almacén
            </label>
            <CustomSelect
              value={selectedWarehouseId}
              onChange={setSelectedWarehouseId}
              accentColor="rose"
              options={[
                { value: 'ALL', label: 'Todos los Almacenes' },
                ...warehouses.map((w) => ({
                  value: w.id,
                  label: w.name,
                  badge: w.code,
                })),
              ]}
            />
          </div>

          {/* Subgroup / Category Filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
              Subgrupo / Categoría
            </label>
            <CustomSelect
              value={selectedCategoryId}
              onChange={setSelectedCategoryId}
              accentColor="rose"
              options={[
                { value: 'ALL', label: 'Todas las Categorías' },
                ...categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  badge: c.codePrefix,
                })),
              ]}
            />
          </div>

          {/* Audit Status Filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
              Estado Auditoría
            </label>
            <CustomSelect
              value={selectedStatus}
              onChange={setSelectedStatus}
              accentColor="rose"
              options={[
                { value: 'ALL', label: 'Todos los Estados' },
                { value: 'PENDING', label: 'Sin Conteo (Pendiente)' },
                { value: 'CORRECT', label: 'Correcto (Sin Diferencia)' },
                { value: 'MISSING', label: 'Con Faltante (-)' },
                { value: 'SURPLUS', label: 'Con Sobrante (+)' },
              ]}
            />
          </div>

          {/* Stock Presence Filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
              Existencia
            </label>
            <CustomSelect
              value={selectedStock}
              onChange={setSelectedStock}
              accentColor="rose"
              options={[
                { value: 'ALL', label: 'Todas' },
                { value: 'WITH_STOCK', label: 'Con Existencia' },
                { value: 'WITHOUT_STOCK', label: 'Sin Existencia' },
              ]}
            />
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
              Búsqueda Rápida
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Código o nombre de producto..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-extrabold text-slate-700">Rango de Fechas:</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-500"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-md"
              >
                Limpiar Fechas
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3.5 flex-wrap w-full sm:w-auto">
            {hasActiveFilters && (
              <button
                onClick={handleClearAllFilters}
                className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 select-none shrink-0"
              >
                <X className="w-3.5 h-3.5 text-red-600" />
                <span>Limpiar Filtros</span>
              </button>
            )}
            <div className="text-[11px] text-slate-500 font-medium shrink-0">
              Mostrando <strong className="text-slate-900">{rows.length}</strong> registro(s)
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Notice Banner if Date Range active and no audits in range */}
      {(startDate || endDate) && Object.keys(auditMap).length === 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-extrabold text-xs uppercase tracking-wide">
              Sin conteos de inventario físico en las fechas seleccionadas
            </div>
            <div className="text-xs text-amber-800 mt-0.5">
              No se han realizado auditorías o conteos en el período ingresado (
              {startDate || 'Inicio'} al {endDate || 'Fin'}). Todos los productos se muestran como 
              <strong> "Sin Hacer Inventario"</strong> para ese rango de fechas.
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {totalItems === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-extrabold text-slate-700">
              No se encontraron registros de inventario
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No existen productos o conteos físicos que coincidan con los filtros seleccionados (
              {startDate || endDate ? 'Rango de fechas' : 'Almacén / Categoría / Estado'}). Intente cambiar el período de fechas o limpiar los filtros.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-extrabold uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Código</th>
                    <th className="p-3.5">Producto</th>
                    <th className="p-3.5">Almacén</th>
                    <th className="p-3.5 text-right">Existencia Sistema</th>
                    <th className="p-3.5 text-right">Conteo Físico Real</th>
                    <th className="p-3.5 text-center">Diferencia</th>
                    <th className="p-3.5 text-center">Estado Auditoría</th>
                    <th className="p-3.5 text-right">Último Conteo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((r, idx) => {
                    return (
                      <tr key={`${r.product.id}_${r.warehouse.id}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-black">
                            {r.product.code}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          <div>{r.product.name}</div>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {r.category?.name || 'Subgrupo'}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-700 max-w-[200px]">
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className="font-mono text-[10px] bg-red-100 text-red-900 border border-red-200 px-1.5 py-0.5 rounded font-black">
                              {r.warehouse.code}
                            </span>
                            <span className="text-slate-800 font-bold text-[11px] leading-tight break-words">
                              {r.warehouse.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900">
                          {r.systemStock} {r.product.unit}
                        </td>
                        <td className="p-3.5 text-right font-black">
                          {r.auditInfo ? (
                            <span className="text-slate-900">
                              {r.auditInfo.physicalStock} {r.product.unit}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">Sin conteo</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {r.status === 'PENDING' ? (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-md font-bold text-[11px]">
                              N/A
                            </span>
                          ) : r.status === 'CORRECT' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-black text-[11px] border border-slate-200">
                              <Equal className="w-3 h-3 text-slate-500" />
                              <span>0.00 (Correcto)</span>
                            </span>
                          ) : r.status === 'MISSING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-800 rounded-md font-black text-[11px] border border-rose-200">
                              <Minus className="w-3 h-3 text-rose-600" />
                              <span>{r.auditInfo?.difference.toFixed(2)} {r.product.unit}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-800 rounded-md font-black text-[11px] border border-teal-200">
                              <Plus className="w-3 h-3 text-teal-600" />
                              <span>+{r.auditInfo?.difference.toFixed(2)} {r.product.unit}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {r.status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Sin Hacer Inventario</span>
                            </span>
                          ) : r.status === 'CORRECT' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Inventario Correcto</span>
                            </span>
                          ) : r.status === 'MISSING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Faltante Detectado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-900 border border-teal-300">
                              <Plus className="w-3 h-3 text-teal-600" />
                              <span>Sobrante Detectado</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right text-slate-500 font-medium">
                          {r.auditInfo ? (
                            <div>
                              <div className="font-bold text-slate-800">{r.auditInfo.date}</div>
                              <div className="text-[10px] text-slate-400">Por: {r.auditInfo.responsibleUser}</div>
                            </div>
                          ) : (
                            <span className="italic text-slate-400">Nunca</span>
                          )}
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
    </div>
  );
};
