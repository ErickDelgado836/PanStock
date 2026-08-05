import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Warehouse, Category, MovementRecord } from '../types';
import {
  getProducts,
  getWarehouses,
  getCategories,
  getMovements,
  calculateTotalStock,
  subscribeToStorage,
} from '../services/storage';
import { CustomSelect } from './Common/CustomSelect';
import { parseAnyDate } from '../utils/movementSearch';
import {
  X,
  PackageSearch,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  Boxes,
  Info,
  PackageCheck,
  PackageX,
  FileSpreadsheet,
  SlidersHorizontal,
} from 'lucide-react';

interface GlobalProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWarehouseId?: string;
  initialCategoryId?: string;
}

type StockFilterType = 'ALL' | 'WITH_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK';
type SortOptionType =
  | 'LAST_ENTRY_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'CODE_ASC'
  | 'STOCK_DESC'
  | 'STOCK_ASC'
  | 'DATE_ASC';

export const GlobalProductCatalogModal: React.FC<GlobalProductCatalogModalProps> = ({
  isOpen,
  onClose,
  initialWarehouseId = 'ALL',
  initialCategoryId = 'ALL',
}) => {
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses);
  const [categories, setCategories] = useState<Category[]>(getCategories);
  const [movements, setMovements] = useState<MovementRecord[]>(getMovements);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(initialWarehouseId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId);
  const [stockFilter, setStockFilter] = useState<StockFilterType>('ALL');
  const [sortBy, setSortBy] = useState<SortOptionType>('LAST_ENTRY_DESC');
  const [onlyInSelectedWarehouse, setOnlyInSelectedWarehouse] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim() !== '') count++;
    if (selectedWarehouseId !== 'ALL') count++;
    if (selectedCategoryId !== 'ALL') count++;
    if (stockFilter !== 'ALL') count++;
    return count;
  }, [searchTerm, selectedWarehouseId, selectedCategoryId, stockFilter]);

  // Expanded product IDs set
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  const loadData = () => {
    setProducts(getProducts());
    setWarehouses(getWarehouses());
    setCategories(getCategories());
    setMovements(getMovements());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (initialWarehouseId) {
        setSelectedWarehouseId(initialWarehouseId);
      }
      if (initialCategoryId) {
        setSelectedCategoryId(initialCategoryId);
      }
    }
  }, [isOpen, initialWarehouseId, initialCategoryId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    return subscribeToStorage(loadData);
  }, []);

  const formatSpanishDate = (dateStr?: string) => {
    if (!dateStr) return 'Sin fecha';
    const parsed = parseAnyDate(dateStr);
    if (!parsed) return dateStr;
    return parsed.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Map product ID to its last movement record date & type
  const productLastMovementMap = useMemo(() => {
    const map = new Map<
      string,
      { dateStr: string; timestamp: number; type: string; docRef: string }
    >();

    movements.forEach((mov) => {
      const movDate = parseAnyDate(mov.date);
      const timestamp = movDate ? movDate.getTime() : 0;

      mov.items.forEach((item) => {
        const existing = map.get(item.productId);
        if (!existing || timestamp > existing.timestamp) {
          map.set(item.productId, {
            dateStr: mov.date,
            timestamp,
            type: mov.type,
            docRef: mov.docRef,
          });
        }
      });
    });

    return map;
  }, [movements]);

  // Category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Warehouse lookup map
  const warehouseMap = useMemo(() => {
    const map = new Map<string, Warehouse>();
    warehouses.forEach((w) => map.set(w.id, w));
    return map;
  }, [warehouses]);

  // Helper to determine effective stock for filter and display
  const getProductStockInContext = (p: Product) => {
    if (selectedWarehouseId !== 'ALL') {
      return Number(p.stockByWarehouse[selectedWarehouseId] || 0);
    }
    return calculateTotalStock(p.stockByWarehouse);
  };

  // Overall Statistics Metrics
  const stats = useMemo(() => {
    let totalItems = products.length;
    let itemsWithStock = 0;
    let itemsOutOfStock = 0;
    let grandUnits = 0;

    products.forEach((p) => {
      const stock = selectedWarehouseId === 'ALL'
        ? calculateTotalStock(p.stockByWarehouse)
        : Number(p.stockByWarehouse[selectedWarehouseId] || 0);

      grandUnits += stock;
      if (stock > 0) {
        itemsWithStock++;
      } else {
        itemsOutOfStock++;
      }
    });

    return { totalItems, itemsWithStock, itemsOutOfStock, grandUnits };
  }, [products, selectedWarehouseId]);

  // Filter & Sort Logic
  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search term filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const cat = categoryMap.get(p.categoryId);
          const catName = cat ? cat.name.toLowerCase() : '';

          const matchCode = p.code.toLowerCase().includes(term);
          const matchName = p.name.toLowerCase().includes(term);
          const matchCat = catName.includes(term);
          const matchNotes = p.notes ? p.notes.toLowerCase().includes(term) : false;

          if (!matchCode && !matchName && !matchCat && !matchNotes) {
            return false;
          }
        }

        // Category filter
        if (selectedCategoryId !== 'ALL' && p.categoryId !== selectedCategoryId) {
          return false;
        }

        const effectiveStock = getProductStockInContext(p);

        // Warehouse filter check
        if (selectedWarehouseId !== 'ALL') {
          const stockInWh = Number(p.stockByWarehouse[selectedWarehouseId] || 0);
          if (onlyInSelectedWarehouse && stockInWh <= 0) {
            return false;
          }
        }

        // Stock status filter
        if (stockFilter === 'WITH_STOCK' && effectiveStock <= 0) {
          return false;
        }
        if (stockFilter === 'OUT_OF_STOCK' && effectiveStock > 0) {
          return false;
        }
        if (stockFilter === 'LOW_STOCK') {
          const minAlert = p.minStockAlert || 10;
          if (effectiveStock <= 0 || effectiveStock > minAlert) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const totalStockA = calculateTotalStock(a.stockByWarehouse);
        const totalStockB = calculateTotalStock(b.stockByWarehouse);

        const lastMovA = productLastMovementMap.get(a.id);
        const lastMovB = productLastMovementMap.get(b.id);

        const entryTimestampA =
          lastMovA?.timestamp || parseAnyDate(a.entryDate)?.getTime() || 0;
        const entryTimestampB =
          lastMovB?.timestamp || parseAnyDate(b.entryDate)?.getTime() || 0;

        switch (sortBy) {
          case 'LAST_ENTRY_DESC':
            return entryTimestampB - entryTimestampA;
          case 'DATE_ASC':
            return entryTimestampA - entryTimestampB;
          case 'NAME_ASC':
            return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
          case 'NAME_DESC':
            return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
          case 'CODE_ASC':
            return a.code.localeCompare(b.code, 'es', { numeric: true });
          case 'STOCK_DESC':
            return totalStockB - totalStockA;
          case 'STOCK_ASC':
            return totalStockA - totalStockB;
          default:
            return 0;
        }
      });
  }, [
    products,
    searchTerm,
    selectedWarehouseId,
    selectedCategoryId,
    stockFilter,
    sortBy,
    onlyInSelectedWarehouse,
    categoryMap,
    productLastMovementMap,
  ]);

  // Toggle single product expansion
  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Expand / Collapse all
  const expandAll = () => {
    const allIds = new Set(filteredAndSortedProducts.map((p) => p.id));
    setExpandedProductIds(allIds);
  };

  const collapseAll = () => {
    setExpandedProductIds(new Set());
  };

  if (!isOpen) return null;

  // Options for Dropdowns
  const warehouseOptions = [
    { value: 'ALL', label: 'Todos los Depósitos / Almacenes (10)' },
    ...warehouses.map((w) => ({
      value: w.id,
      label: `${w.code} - ${w.name}`,
      badge: w.code,
    })),
  ];

  const categoryOptions = [
    { value: 'ALL', label: 'Todas las Categorías / Subgrupos' },
    ...categories.map((c) => ({
      value: c.id,
      label: c.name,
      badge: c.codePrefix,
    })),
  ];

  const stockFilterOptions = [
    { value: 'ALL', label: `Todos (Con y Sin Existencia) [${stats.totalItems}]` },
    { value: 'WITH_STOCK', label: `Solo Con Existencia (> 0) [${stats.itemsWithStock}]` },
    { value: 'OUT_OF_STOCK', label: `Solo Sin Existencia (= 0) [${stats.itemsOutOfStock}]` },
    { value: 'LOW_STOCK', label: 'Alerta Bajo Stock Mínimo' },
  ];

  const sortOptions = [
    { value: 'LAST_ENTRY_DESC', label: 'Última Actividad / Ingreso (Más Reciente)' },
    { value: 'NAME_ASC', label: 'Orden Alfabético (A - Z)' },
    { value: 'NAME_DESC', label: 'Orden Alfabético (Z - A)' },
    { value: 'CODE_ASC', label: 'Código de Producto' },
    { value: 'STOCK_DESC', label: 'Mayor Existencia Total' },
    { value: 'STOCK_ASC', label: 'Menor Existencia Total' },
    { value: 'DATE_ASC', label: 'Fecha de Registro (Más Antiguo)' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Modal Container - Generous, well-balanced & Mobile-Ready */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="relative z-10 w-full max-w-5xl lg:max-w-5xl 2xl:max-w-6xl bg-slate-50 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/90 max-h-[92dvh] sm:max-h-[87vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-3.5 sm:p-5 md:p-6 border-b border-slate-800 shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 sm:p-3 bg-red-600 rounded-xl sm:rounded-2xl shadow-md text-white shrink-0">
                <PackageSearch className="w-5.5 h-5.5 sm:w-7 sm:h-7" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-2xl font-black tracking-tight leading-tight">
                    Artículos de Inventario y Servicios
                  </h2>
                  <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold shrink-0">
                    {stats.totalItems} Items
                  </span>
                </div>
                <p className="text-slate-300 text-[10px] sm:text-sm mt-0.5 leading-snug">
                  Consolidado total de artículos y servicios en red con desglose detallado por depósitos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm font-bold border ${
                  showFilters
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-750'
                    : 'bg-red-600 text-white border-transparent hover:bg-red-500 shadow-md'
                }`}
                title={showFilters ? "Ocultar filtros de búsqueda" : "Mostrar filtros de búsqueda"}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                </span>
                {activeFiltersCount > 0 && !showFilters && (
                  <span className="bg-white text-red-600 font-extrabold px-1.5 py-0.5 rounded-full text-[10px] shadow-xs ml-1 leading-none">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg sm:rounded-xl transition-all cursor-pointer shrink-0"
                title="Cerrar Artículos y Servicios"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* KPI Summary Bar / Interactive Filter Buttons */}
          <div className="bg-white px-3 py-2 sm:py-3 sm:px-6 border-b border-slate-200/80 shrink-0 flex overflow-x-auto sm:grid sm:grid-cols-4 gap-2 sm:gap-3.5 pb-2.5 sm:pb-3 scrollbar-none snap-x touch-pan-x">
            {/* KPI 1: Total Productos */}
            <button
              type="button"
              onClick={() => setStockFilter('ALL')}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 group select-none shrink-0 w-[145px] sm:w-auto snap-start ${
                stockFilter === 'ALL'
                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/30 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/90 hover:border-slate-300'
              }`}
              title="Ver todos los productos registrados"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`p-1.5 sm:p-2 rounded-lg shrink-0 transition-colors ${
                    stockFilter === 'ALL'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-700 group-hover:bg-blue-200'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                    Total Productos
                  </span>
                  <span className="text-xs sm:text-base font-black text-slate-900 block truncate">
                    {stats.totalItems}
                  </span>
                </div>
              </div>
              {stockFilter === 'ALL' && (
                <span className="hidden md:inline-flex px-1.5 py-0.5 bg-blue-200/80 text-blue-900 text-[9px] font-black rounded-md shrink-0">
                  Activo
                </span>
              )}
            </button>

            {/* KPI 2: Con Existencia */}
            <button
              type="button"
              onClick={() =>
                setStockFilter(stockFilter === 'WITH_STOCK' ? 'ALL' : 'WITH_STOCK')
              }
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 group select-none shrink-0 w-[145px] sm:w-auto snap-start ${
                stockFilter === 'WITH_STOCK'
                  ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/90 hover:border-slate-300'
              }`}
              title="Filtrar solo productos con existencia disponible"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`p-1.5 sm:p-2 rounded-lg shrink-0 transition-colors ${
                    stockFilter === 'WITH_STOCK'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                    Con Existencia
                  </span>
                  <span className="text-xs sm:text-base font-black text-emerald-700 block truncate">
                    {stats.itemsWithStock}
                  </span>
                </div>
              </div>
              {stockFilter === 'WITH_STOCK' && (
                <span className="hidden md:inline-flex px-1.5 py-0.5 bg-emerald-200/80 text-emerald-900 text-[9px] font-black rounded-md shrink-0">
                  Activo
                </span>
              )}
            </button>

            {/* KPI 3: Sin Existencia */}
            <button
              type="button"
              onClick={() =>
                setStockFilter(stockFilter === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK')
              }
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 group select-none shrink-0 w-[145px] sm:w-auto snap-start ${
                stockFilter === 'OUT_OF_STOCK'
                  ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-500/30 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/90 hover:border-slate-300'
              }`}
              title="Filtrar solo productos sin existencia (0 unidades)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`p-1.5 sm:p-2 rounded-lg shrink-0 transition-colors ${
                    stockFilter === 'OUT_OF_STOCK'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-100 text-rose-700 group-hover:bg-rose-200'
                  }`}
                >
                  <PackageX className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                    Sin Existencia
                  </span>
                  <span
                    className={`text-xs sm:text-base font-black block truncate ${
                      stats.itemsOutOfStock > 0 ? 'text-rose-700' : 'text-slate-700'
                    }`}
                  >
                    {stats.itemsOutOfStock}
                  </span>
                </div>
              </div>
              {stockFilter === 'OUT_OF_STOCK' && (
                <span className="hidden md:inline-flex px-1.5 py-0.5 bg-rose-200/80 text-rose-900 text-[9px] font-black rounded-md shrink-0">
                  Activo
                </span>
              )}
            </button>

            {/* KPI 4: Total Unidades */}
            <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200/80 flex items-center gap-2 shrink-0 w-[145px] sm:w-auto snap-start">
              <div className="p-1.5 sm:p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                <Layers className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                  Total Unidades
                </span>
                <span className="text-xs sm:text-base font-black text-slate-900 block truncate">
                  {stats.grandUnits.toLocaleString()} u.
                </span>
              </div>
            </div>
          </div>

          {/* Collapsible Toolbar: Search, Filters & Controls */}
          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                animate={{
                  height: 'auto',
                  opacity: 1,
                  transitionEnd: { overflow: 'visible' },
                }}
                exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="bg-slate-100/90 border-b border-slate-200 shrink-0 relative z-30"
              >
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  {/* Search Input Row */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por código, nombre o descripción..."
                      className="w-full pl-9 pr-9 py-2 sm:py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-xs transition-all"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Filters Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {/* Warehouse Filter */}
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-600 mb-0.5 sm:mb-1 block flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-red-600" />
                        <span className="truncate">Depósito:</span>
                      </label>
                      <CustomSelect
                        value={selectedWarehouseId}
                        onChange={(val) => setSelectedWarehouseId(val)}
                        options={warehouseOptions}
                        accentColor="rose"
                        label="Filtrar por Depósito"
                        icon={<Building2 className="w-4 h-4 text-red-600" />}
                      />
                    </div>

                    {/* Subgroup / Category Filter */}
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-600 mb-0.5 sm:mb-1 block flex items-center gap-1">
                        <Tag className="w-3 h-3 text-blue-600" />
                        <span className="truncate">Subgrupo:</span>
                      </label>
                      <CustomSelect
                        value={selectedCategoryId}
                        onChange={(val) => setSelectedCategoryId(val)}
                        options={categoryOptions}
                        accentColor="blue"
                        label="Filtrar por Subgrupo"
                        icon={<Tag className="w-4 h-4 text-blue-600" />}
                      />
                    </div>

                    {/* Stock Status Filter */}
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-600 mb-0.5 sm:mb-1 block flex items-center gap-1">
                        <Filter className="w-3 h-3 text-emerald-600" />
                        <span className="truncate">Existencia:</span>
                      </label>
                      <CustomSelect
                        value={stockFilter}
                        onChange={(val) => setStockFilter(val as StockFilterType)}
                        options={stockFilterOptions}
                        accentColor="emerald"
                        label="Filtrar por Existencia"
                        icon={<Filter className="w-4 h-4 text-emerald-600" />}
                      />
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-600 mb-0.5 sm:mb-1 block flex items-center gap-1">
                        <ArrowUpDown className="w-3 h-3 text-amber-600" />
                        <span className="truncate">Ordenar:</span>
                      </label>
                      <CustomSelect
                        value={sortBy}
                        onChange={(val) => setSortBy(val as SortOptionType)}
                        options={sortOptions}
                        accentColor="amber"
                        label="Ordenar Productos"
                        icon={<ArrowUpDown className="w-4 h-4 text-amber-600" />}
                      />
                    </div>
                  </div>

                  {/* Sub-options row inside filters */}
                  {selectedWarehouseId !== 'ALL' && (
                    <div className="pt-1 text-xs">
                      <label className="inline-flex items-center gap-2 text-slate-700 font-semibold cursor-pointer select-none bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          checked={onlyInSelectedWarehouse}
                          onChange={(e) => setOnlyInSelectedWarehouse(e.target.checked)}
                          className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                        />
                        <span>Mostrar solo productos con stock en este depósito</span>
                      </label>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Summary Bar (Always Visible) */}
          <div className="bg-slate-50 px-3 py-2 sm:px-4 border-b border-slate-200/80 flex items-center justify-between gap-2 text-[10px] sm:text-xs text-slate-500 font-bold shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Mostrando <strong className="text-slate-800">{filteredAndSortedProducts.length}</strong> de <strong className="text-slate-800">{products.length}</strong> productos
              </span>
              {onlyInSelectedWarehouse && selectedWarehouseId !== 'ALL' && (
                <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-extrabold">
                  Solo con Stock
                </span>
              )}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedWarehouseId('ALL');
                    setSelectedCategoryId('ALL');
                    setStockFilter('ALL');
                    setSortBy('LAST_ENTRY_DESC');
                    setOnlyInSelectedWarehouse(false);
                  }}
                  className="text-red-600 hover:text-red-700 font-black hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
                >
                  (Limpiar Filtros)
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={
                expandedProductIds.size === filteredAndSortedProducts.length
                  ? collapseAll
                  : expandAll
              }
              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-black text-[9px] sm:text-[10px] rounded-lg border border-slate-200 transition-all cursor-pointer shadow-xs shrink-0"
            >
              {expandedProductIds.size === filteredAndSortedProducts.length
                ? 'Plegar Todos'
                : 'Desplegar Todos'}
            </button>
          </div>

          {/* Product Cards List */}
          <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1">
            {filteredAndSortedProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs my-4">
                <PackageSearch className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-extrabold text-slate-800">
                  No se encontraron productos en el catálogo
                </h3>
                <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                  Intenta cambiar el término de búsqueda o ajusta los filtros de depósito, subgrupo o estado de existencia.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedWarehouseId('ALL');
                    setSelectedCategoryId('ALL');
                    setStockFilter('ALL');
                    setSortBy('LAST_ENTRY_DESC');
                    setOnlyInSelectedWarehouse(false);
                  }}
                  className="mt-3 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              filteredAndSortedProducts.map((product) => {
                const totalStock = calculateTotalStock(product.stockByWarehouse);
                const category = categoryMap.get(product.categoryId);
                const lastMov = productLastMovementMap.get(product.id);
                const isExpanded = expandedProductIds.has(product.id);

                const stockInSelectedWh =
                  selectedWarehouseId !== 'ALL'
                    ? product.stockByWarehouse[selectedWarehouseId] || 0
                    : null;

                // Format last movement/entry date and label
                let lastActivityLabel = 'Registro Inicial';
                let lastActivityText = 'Sin registro de movimientos';
                let activityBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

                if (lastMov) {
                  const formatted = formatSpanishDate(lastMov.dateStr);
                  lastActivityText = `${formatted} (${lastMov.docRef || 'S/N'})`;
                  if (lastMov.type === 'ENTRADA') {
                    lastActivityLabel = 'Última Entrada';
                    activityBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  } else if (lastMov.type === 'DESCARGO') {
                    lastActivityLabel = 'Último Descargo';
                    activityBadgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
                  } else if (lastMov.type === 'TRASLADO') {
                    lastActivityLabel = 'Último Traslado';
                    activityBadgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                  } else if (lastMov.type === 'VENTA') {
                    lastActivityLabel = 'Última Venta';
                    activityBadgeColor = 'bg-purple-50 text-purple-800 border-purple-200';
                  } else if (lastMov.type === 'AUDITORIA') {
                    lastActivityLabel = 'Última Auditoría';
                    activityBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  } else {
                    lastActivityLabel = `Último ${lastMov.type}`;
                  }
                } else if (product.entryDate) {
                  const formatted = formatSpanishDate(product.entryDate);
                  lastActivityLabel = 'Registro Inicial';
                  lastActivityText = `${formatted} (Ingreso Inicial)`;
                }

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-xl sm:rounded-2xl border transition-all shadow-xs overflow-hidden ${
                      isExpanded
                        ? 'border-red-400 ring-2 ring-red-500/20'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {/* Primary Product Bar */}
                    <div
                      onClick={() => toggleExpand(product.id)}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                    >
                      {/* Left Details: Code, Name, Subgroup */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg font-mono text-xs font-black shrink-0 shadow-xs">
                          {product.code}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug truncate">
                              {product.name}
                            </h3>

                            {category && (
                              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                                {category.name}
                              </span>
                            )}

                            {totalStock === 0 && (
                              <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0">
                                Sin Existencia
                              </span>
                            )}

                            {totalStock > 0 && totalStock <= (product.minStockAlert || 10) && (
                              <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Bajo Stock
                              </span>
                            )}
                          </div>

                          {/* Last activity / Entry timestamp with dynamic labels */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium flex-wrap">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-700">{lastActivityLabel}:</span>
                            <span className="text-slate-600 truncate">{lastActivityText}</span>
                            {lastMov && (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-black border uppercase tracking-wider ${activityBadgeColor}`}
                              >
                                {lastMov.type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Stock Counters & Expand Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* Warehouse Specific Stock if filter active */}
                        {stockInSelectedWh !== null && (
                          <div className="text-right px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg">
                            <span className="text-[9px] font-bold text-red-600 block uppercase">
                              En dep. {warehouses.find(w => w.id === selectedWarehouseId)?.code || selectedWarehouseId}
                            </span>
                            <span className={`text-xs sm:text-sm font-black ${
                              stockInSelectedWh > 0 ? 'text-red-900' : 'text-slate-400'
                            }`}>
                              {stockInSelectedWh.toLocaleString()} {product.unit}
                            </span>
                          </div>
                        )}

                        {/* Total System Stock Badge */}
                        <div
                          className={`text-right px-3 py-1.5 rounded-xl border transition-colors ${
                            totalStock > 0
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                              : 'bg-rose-50/70 border-rose-200 text-rose-800'
                          }`}
                        >
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider block text-slate-500">
                            Existencia Total Sistema
                          </span>
                          <span
                            className={`text-sm sm:text-base font-black ${
                              totalStock > 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {totalStock.toLocaleString()} {product.unit}
                          </span>
                        </div>

                        {/* Expand Icon Toggle */}
                        <div
                          className={`p-1.5 sm:p-2 rounded-xl transition-all ${
                            isExpanded
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Warehouse Breakdown Section - Compact & Ergonomic */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="border-t border-slate-200 bg-slate-50/70 p-3 sm:p-4"
                        >
                          <div className="mb-2.5 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-red-600" />
                                <span>Distribución por Depósitos ({warehouses.length})</span>
                              </h4>
                              <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                {warehouses.filter((w) => (product.stockByWarehouse[w.id] || 0) > 0).length} con stock
                              </span>
                            </div>

                            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">
                              Unidad: <strong className="text-slate-700 font-bold">{product.unit}</strong>
                            </span>
                          </div>

                          {/* Warehouses Grid: Compact 2 to 5 columns */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
                            {warehouses.map((wh) => {
                              const whStock = product.stockByWarehouse[wh.id] || 0;
                              const percentage =
                                totalStock > 0 ? ((whStock / totalStock) * 100).toFixed(1) : '0';
                              const isSelectedWh = wh.id === selectedWarehouseId;
                              const hasStock = whStock > 0;

                              return (
                                <div
                                  key={wh.id}
                                  className={`p-2 rounded-lg border transition-all flex flex-col justify-between ${
                                    isSelectedWh
                                      ? 'bg-red-50/90 border-red-300 ring-1 ring-red-400'
                                      : hasStock
                                      ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                                      : 'bg-slate-100/50 border-slate-200/50 opacity-40 hover:opacity-80'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-mono text-[9px] font-black bg-slate-200/90 text-slate-700 px-1.5 py-0.2 rounded shrink-0">
                                      {wh.code}
                                    </span>
                                    <span
                                      className={`text-[11px] font-black leading-none ${
                                        hasStock
                                          ? isSelectedWh
                                            ? 'text-red-700'
                                            : 'text-slate-900'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {whStock.toLocaleString()} <span className="text-[9px] font-medium">{product.unit}</span>
                                    </span>
                                  </div>

                                  <div className="min-w-0">
                                    <span
                                      className="text-[10px] font-bold text-slate-700 block truncate leading-tight"
                                      title={wh.name}
                                    >
                                      {wh.name}
                                    </span>
                                  </div>

                                  {/* Progress bar if has stock */}
                                  {totalStock > 0 && hasStock && (
                                    <div className="mt-1.5 flex items-center gap-1">
                                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            isSelectedWh ? 'bg-red-600' : 'bg-emerald-600'
                                          }`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-[8px] font-bold text-slate-400 shrink-0">
                                        {percentage}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Registered Lots if any */}
                          {product.lots && product.lots.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                              <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-amber-600" />
                                <span>Lotes Registrados ({product.lots.length})</span>
                              </h5>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                {product.lots.map((lot) => (
                                  <div
                                    key={lot.id}
                                    className="p-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2"
                                  >
                                    <div>
                                      <span className="font-mono font-bold text-slate-900 text-[11px] block">
                                        Lote: {lot.lotNumber}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium block">
                                        Vence: {lot.expirationDate}
                                      </span>
                                    </div>
                                    <span className="font-black text-slate-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                                      {lot.quantity} {product.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              * Datos actualizados en tiempo real según movimientos registrados.
            </span>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer ml-auto"
            >
              Cerrar Catálogo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
