import React, { useState, useEffect, useMemo } from 'react';
import { Product, Warehouse, Category, UserProfile, MovementRecord } from '../types';
import {
  getCategories,
  getProducts,
  getLastAuditsMap,
  calculateTotalStock,
  subscribeToStorage,
  getMovements,
  getWarehouses,
  getPhysicalAudits,
} from '../services/storage';
import { PhysicalAuditModal } from './PhysicalAuditModal';
import { CustomSelect } from './Common/CustomSelect';
import {
  Search,
  Filter,
  ClipboardCheck,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  PackageCheck,
  PackageMinus,
  Clock,
  Tag,
  FileText,
  Equal,
  Minus,
  Plus,
  X,
  RotateCcw,
  Boxes,
} from 'lucide-react';

interface WarehouseViewProps {
  warehouse: Warehouse;
  currentUser: UserProfile;
  onNavigateToAuditReport?: () => void;
  onOpenGlobalCatalog?: (warehouseId?: string) => void;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  warehouse,
  currentUser,
  onNavigateToAuditReport,
  onOpenGlobalCatalog,
}) => {
  const [categories, setCategories] = useState<Category[]>(getCategories);
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses);
  const [movements, setMovements] = useState<MovementRecord[]>(getMovements);
  const [lastAudits, setLastAudits] = useState(getLastAuditsMap);
  const [audits, setAudits] = useState(getPhysicalAudits);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'ALL' | 'WITH_STOCK' | 'WITHOUT_STOCK'>('ALL');
  const [selectedAuditStatus, setSelectedAuditStatus] = useState<'ALL' | 'EQUAL' | 'DEFICIT' | 'SURPLUS' | 'AUDITED' | 'UNAUDITED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Physical Audit Modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditCategory, setAuditCategory] = useState<Category | null>(null);

  const loadData = () => {
    setCategories(getCategories());
    setProducts(getProducts());
    setWarehouses(getWarehouses());
    setMovements(getMovements());
    setLastAudits(getLastAuditsMap());
    setAudits(getPhysicalAudits());
  };

  useEffect(() => {
    loadData();
    return subscribeToStorage(loadData);
  }, []);

  // Map of productId -> latest audit item in THIS specific warehouse
  const warehouseAuditMap = useMemo(() => {
    const map: {
      [productId: string]: {
        physicalStock: number;
        systemStock: number;
        difference: number;
        date: string;
        responsibleUser: string;
      };
    } = {};

    audits.forEach((audit) => {
      if (audit.warehouseId !== warehouse.id) return;
      audit.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
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
  }, [audits, warehouse.id]);

  const hasActiveFilters =
    selectedCategoryId !== 'ALL' ||
    selectedStockFilter !== 'ALL' ||
    selectedAuditStatus !== 'ALL' ||
    searchQuery.trim() !== '';

  const handleClearFilters = () => {
    setSelectedCategoryId('ALL');
    setSelectedStockFilter('ALL');
    setSelectedAuditStatus('ALL');
    setSearchQuery('');
  };

  // Filter products for search, category, local stock presence & local audit status
  const warehouseProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Category filter
      if (selectedCategoryId !== 'ALL' && p.categoryId !== selectedCategoryId) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = p.code.toLowerCase().includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }

      // 3. Local warehouse stock filter
      const localStock = p.stockByWarehouse[warehouse.id] || 0;
      if (selectedStockFilter === 'WITH_STOCK' && localStock <= 0) {
        return false;
      }
      if (selectedStockFilter === 'WITHOUT_STOCK' && localStock > 0) {
        return false;
      }

      // 4. Local warehouse physical audit status filter
      if (selectedAuditStatus !== 'ALL') {
        const auditItem = warehouseAuditMap[p.id];
        if (selectedAuditStatus === 'UNAUDITED') {
          if (auditItem) return false;
        } else if (selectedAuditStatus === 'AUDITED') {
          if (!auditItem) return false;
        } else if (selectedAuditStatus === 'EQUAL') {
          if (!auditItem || auditItem.difference !== 0) return false;
        } else if (selectedAuditStatus === 'DEFICIT') {
          if (!auditItem || auditItem.difference >= 0) return false;
        } else if (selectedAuditStatus === 'SURPLUS') {
          if (!auditItem || auditItem.difference <= 0) return false;
        }
      }

      return true;
    });
  }, [products, selectedCategoryId, searchQuery, selectedStockFilter, selectedAuditStatus, warehouse.id, warehouseAuditMap]);

  // Helper to get products for physical audit (respecting category and active search query)
  const getAuditProductsForCategory = (cat: Category) => {
    const activeCatIds = new Set(categories.map((c) => c.id));
    let baseList =
      cat.id === '__ORPHAN__'
        ? products.filter((p) => !activeCatIds.has(p.categoryId))
        : products.filter((p) => p.categoryId === cat.id);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return baseList.filter(
        (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );
    }

    return baseList;
  };

  const handleOpenAudit = (cat: Category) => {
    setAuditCategory(cat);
    setAuditModalOpen(true);
  };

  // Helper to find the last movement for a product in this warehouse
  const getLastMovementInfo = (productId: string) => {
    for (const m of movements) {
      const item = m.items.find((i) => i.productId === productId);
      if (!item) continue;

      const isTarget = m.targetWarehouseId === warehouse.id;
      const isSource = m.sourceWarehouseId === warehouse.id;

      if (!isTarget && !isSource) continue;

      const sourceWh = warehouses.find((w) => w.id === m.sourceWarehouseId);
      const targetWh = warehouses.find((w) => w.id === m.targetWarehouseId);

      if (m.type === 'ENTRADA' && isTarget) {
        return {
          typeText: 'Ingreso Entrada',
          qtyText: `+${item.quantity} ${item.unit}`,
          detail: `Doc: ${m.docRef}`,
          date: m.date,
          icon: <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      }

      if (m.type === 'TRASLADO') {
        if (isTarget) {
          return {
            typeText: 'Traslado Recibido',
            qtyText: `+${item.quantity} ${item.unit}`,
            detail: `De: ${sourceWh?.code || 'Almacén'} (${m.docRef})`,
            date: m.date,
            icon: <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
            badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
          };
        } else {
          return {
            typeText: 'Traslado Enviado',
            qtyText: `-${item.quantity} ${item.unit}`,
            detail: `A: ${targetWh?.code || 'Almacén'} (${m.docRef})`,
            date: m.date,
            icon: <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
            badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          };
        }
      }

      if (m.type === 'DESCARGO' && isSource) {
        return {
          typeText: 'Descargo / Salida',
          qtyText: `-${item.quantity} ${item.unit}`,
          detail: `Doc: ${m.docRef}`,
          date: m.date,
          icon: <PackageMinus className="w-3.5 h-3.5 text-purple-600 shrink-0" />,
          badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
        };
      }

      if (m.type === 'VENTA' && isSource) {
        return {
          typeText: 'Venta Despachada',
          qtyText: `-${item.quantity} ${item.unit}`,
          detail: `Doc: ${m.docRef}`,
          date: m.date,
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />,
          badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        };
      }

      if (m.type === 'EDICION_VENCIMIENTO' && (isTarget || isSource)) {
        return {
          typeText: 'Edición Vencimiento',
          qtyText: item.newExpirationDate ? `${item.previousExpirationDate || 'Sin Fecha'} ➔ ${item.newExpirationDate}` : 'Vencimiento',
          detail: `Por: ${m.responsibleUser}`,
          date: m.date,
          icon: <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      }
    }

    return null;
  };

  const categoryOptions = [
    { value: 'ALL', label: 'Todas las Categorías (Subgrupos)', badge: 'Todas' },
    ...categories.map((c) => ({
      value: c.id,
      label: c.name,
      badge: c.codePrefix,
    })),
  ];

  const stockOptions = [
    { value: 'ALL', label: 'Todas las Existencias (Almacén)', badge: 'Todas' },
    { value: 'WITH_STOCK', label: 'Con Existencia en este Almacén', badge: 'Con Stock' },
    { value: 'WITHOUT_STOCK', label: 'Sin Existencia en este Almacén', badge: 'Sin Stock' },
  ];

  const auditStatusOptions = [
    { value: 'ALL', label: 'Todos los Estados de Auditoría', badge: 'Todos' },
    { value: 'EQUAL', label: 'Sin Diferencia (Correctos)', badge: 'Correcto' },
    { value: 'DEFICIT', label: 'Con Faltante Detectado', badge: 'Faltante' },
    { value: 'SURPLUS', label: 'Con Sobrante Detectado', badge: 'Sobrante' },
    { value: 'AUDITED', label: 'Auditados / Con Conteo Físico', badge: 'Con Conteo' },
    { value: 'UNAUDITED', label: 'Sin Conteo / Pendientes', badge: 'Sin Conteo' },
  ];

  return (
    <div className="space-y-6">
      {/* Warehouse Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-2xl p-6 shadow-lg border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-red-600 text-white font-black text-sm rounded-xl tracking-wider shadow-xs">
              {warehouse.code}
            </span>
            <h1 className="text-2xl font-black tracking-tight">{warehouse.name}</h1>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">{warehouse.description}</p>
        </div>

        <div
          onClick={() => onOpenGlobalCatalog && onOpenGlobalCatalog(warehouse.id)}
          className="bg-slate-800/90 hover:bg-slate-800 p-4 rounded-xl border border-slate-700/80 hover:border-amber-400 text-right cursor-pointer transition-all group"
          title="Ver en el Listado de Artículos y Servicios"
        >
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block group-hover:text-amber-300 transition-colors">
            Artículos Registrados (Ver Listado)
          </span>
          <span className="text-2xl font-black text-amber-400">
            {products.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        {/* Responsive Grid for Search + Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer"
                title="Borrar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="w-full">
            <CustomSelect
              value={selectedCategoryId}
              onChange={setSelectedCategoryId}
              accentColor="rose"
              icon={<Tag className="w-4 h-4 text-slate-400" />}
              options={categoryOptions}
            />
          </div>

          {/* Warehouse Stock Filter */}
          <div className="w-full">
            <CustomSelect
              value={selectedStockFilter}
              onChange={(val) => setSelectedStockFilter(val as any)}
              accentColor="emerald"
              icon={<PackageCheck className="w-4 h-4 text-slate-400" />}
              options={stockOptions}
            />
          </div>

          {/* Audit Discrepancy / Status Filter */}
          <div className="w-full">
            <CustomSelect
              value={selectedAuditStatus}
              onChange={(val) => setSelectedAuditStatus(val as any)}
              accentColor="amber"
              icon={<ClipboardCheck className="w-4 h-4 text-slate-400" />}
              options={auditStatusOptions}
            />
          </div>
        </div>

        {/* Counter and Clear Filters Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-medium">
            <span>
              Mostrando <strong className="text-slate-900 font-black">{warehouseProducts.length}</strong> de{' '}
              <strong className="text-slate-700">{products.length}</strong> producto(s) en{' '}
              <strong className="text-red-700 font-bold">{warehouse.name}</strong>
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Filtros aplicados
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 shrink-0">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer select-none w-full sm:w-auto shadow-2xs"
              >
                <X className="w-3.5 h-3.5 text-red-600" />
                <span>Limpiar Filtros</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State when no products match filters */}
      {warehouseProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-800">
            No se encontraron productos con los filtros seleccionados
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
            No hay ningún artículo registrado en {warehouse.name} ({warehouse.code}) que coincida con los criterios de búsqueda y filtros actuales.
          </p>
          {hasActiveFilters && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Filtros</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Categories Sections with Products & Physical Audit Actions */
        <div className="space-y-6">
          {(() => {
            const activeCatIds = new Set(categories.map((c) => c.id));
            const orphanProducts = warehouseProducts.filter((p) => !activeCatIds.has(p.categoryId));

            const displayCategories: Category[] = [...categories];
            if (orphanProducts.length > 0) {
              displayCategories.push({
                id: '__ORPHAN__',
                name: 'PRODUCTOS SIN CATEGORÍA O SUBGRUPO REASIGNADO',
                codePrefix: 'SIN-CAT',
                isDefault: false,
              });
            }

            return displayCategories.map((cat) => {
              if (selectedCategoryId !== 'ALL' && cat.id !== selectedCategoryId && cat.id !== '__ORPHAN__') {
                return null;
              }

              const rawCatProducts =
                cat.id === '__ORPHAN__'
                  ? orphanProducts
                  : warehouseProducts.filter((p) => p.categoryId === cat.id);

              if (rawCatProducts.length === 0) return null;

              // SORTING REQUIREMENT:
              // Products WITH stock in THIS warehouse appear FIRST.
              // Products WITHOUT stock in THIS warehouse appear LAST.
              const catProducts = [...rawCatProducts].sort((a, b) => {
                const stockA = a.stockByWarehouse[warehouse.id] || 0;
                const stockB = b.stockByWarehouse[warehouse.id] || 0;
                const hasStockA = stockA > 0;
                const hasStockB = stockB > 0;

                if (hasStockA && !hasStockB) return -1;
                if (!hasStockA && hasStockB) return 1;

                return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
              });

              const auditKey = `${warehouse.id}_${cat.id}`;
              const lastAuditDate = lastAudits[auditKey];

              return (
                <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {/* Category Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-red-100 text-red-900 text-xs font-black rounded-lg tracking-wider border border-red-200">
                        "{cat.codePrefix}"
                      </span>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base leading-none">
                          {cat.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          {catProducts.length} producto(s) en este subgrupo
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {lastAuditDate && (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-200/60 px-3 py-1 rounded-full flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-600" />
                          <span>Último inventario físico: <strong>{lastAuditDate}</strong></span>
                        </span>
                      )}

                      {onNavigateToAuditReport && (
                        <button
                          onClick={onNavigateToAuditReport}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-300 active:scale-[0.98] cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-red-600" />
                          <span>Ver Reporte de Auditorías</span>
                        </button>
                      )}

                      {currentUser.permissions.canPhysicalInventory && (
                        <button
                          onClick={() => handleOpenAudit(cat)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
                        >
                          <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                          <span>Realizar Inventario en Físico</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Products Table */}
                  {catProducts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs italic">
                      No hay productos registrados bajo la categoría "{cat.name}" para este almacén.
                    </div>
                  ) : (
                    <div className="overflow-x-auto touch-auto scrollbar-none scrollbar-hide">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/80 text-slate-600 font-extrabold uppercase border-b border-slate-200 whitespace-nowrap">
                          <tr>
                            <th className="p-3">Código</th>
                            <th className="p-3 min-w-[180px]">Descripción del Producto</th>
                            <th className="p-3 min-w-[180px]">Última Actividad / Movimiento</th>
                            <th className="p-3 text-center">Fecha Vencimiento</th>
                            <th className="p-3 text-center">Último Conteo Físico Real</th>
                            <th className="p-3 text-right">Existencia Sistema Almacén</th>
                            <th className="p-3 text-right">Existencia Total Sistema</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                          {catProducts.map((prod) => {
                            const whStock = prod.stockByWarehouse[warehouse.id] || 0;
                            const totalStock = calculateTotalStock(prod.stockByWarehouse);
                            const hasStock = whStock > 0;
                            const lastMov = getLastMovementInfo(prod.id);
                            const lastAuditItem = warehouseAuditMap[prod.id];

                            return (
                              <tr
                                key={prod.id}
                                className={`transition-colors ${
                                  hasStock
                                    ? 'bg-white hover:bg-slate-50/80'
                                    : 'bg-slate-50/40 opacity-75 hover:bg-slate-50'
                                }`}
                              >
                                <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded border whitespace-nowrap ${
                                      hasStock
                                        ? 'bg-slate-100 text-slate-800 border-slate-200 font-black'
                                        : 'bg-slate-100/60 text-slate-400 border-slate-200/80 font-normal'
                                    }`}
                                  >
                                    {prod.code}
                                  </span>
                                </td>
                                <td className="p-3 font-bold max-w-[320px] truncate whitespace-normal">
                                  <span className={hasStock ? 'text-slate-900' : 'text-slate-500 font-medium'}>
                                    {prod.name}
                                  </span>
                                  {!hasStock && (
                                    <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-slate-200/60 text-slate-500 rounded font-normal whitespace-nowrap">
                                      Sin stock local
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {lastMov ? (
                                    <div className="space-y-0.5 whitespace-normal">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap ${lastMov.badgeBg}`}
                                        >
                                          {lastMov.icon}
                                          <span>{lastMov.typeText}</span>
                                          <span className="font-mono">({lastMov.qtyText})</span>
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap font-medium">
                                        <span className="flex items-center gap-1 whitespace-nowrap">
                                          <Clock className="w-3 h-3 text-slate-400" />
                                          {lastMov.date}
                                        </span>
                                        <span>•</span>
                                        <span>{lastMov.detail}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-slate-400 font-medium italic whitespace-nowrap">
                                      {prod.entryDate ? `Ingreso General: ${prod.entryDate}` : 'Sin movimientos recientes'}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-center font-medium text-slate-600 whitespace-nowrap">
                                  {(() => {
                                    if (prod.lots && prod.lots.length > 0) {
                                      const currentWhId = warehouse?.id;
                                      const prodStockInWh = Number(prod.stockByWarehouse?.[currentWhId] || 0);

                                      const assignedStockInWh = prod.lots.reduce((acc, l) => {
                                        const qty = Number(l.stockByWarehouse?.[currentWhId] || 0);
                                        return acc + qty;
                                      }, 0);

                                      const unassignedStockInWh = Math.max(0, prodStockInWh - assignedStockInWh);

                                      if (assignedStockInWh > 0 && unassignedStockInWh > 0) {
                                        return (
                                          <div className="flex flex-col items-center gap-0.5 text-[10px]">
                                            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                                              {assignedStockInWh} {prod.unit} ({prod.lots[0]?.expirationDate || 'Varios'})
                                            </span>
                                            <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                                              {unassignedStockInWh} {prod.unit} (Sin Fecha)
                                            </span>
                                          </div>
                                        );
                                      } else if (assignedStockInWh > 0) {
                                        const activeLotsInWh = prod.lots.filter((l) => Number(l.stockByWarehouse?.[currentWhId] || 0) > 0);
                                        return (
                                          <span className="bg-slate-100 px-2 py-0.5 rounded font-mono whitespace-nowrap text-xs font-bold text-slate-800 border border-slate-200">
                                            {activeLotsInWh.length === 1 ? (activeLotsInWh[0].expirationDate || 'Sin Fecha') : `${activeLotsInWh.length} Lotes`}
                                          </span>
                                        );
                                      } else if (unassignedStockInWh > 0) {
                                        return (
                                          <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-mono text-[11px] font-medium">
                                            Sin Fecha ({unassignedStockInWh} {prod.unit})
                                          </span>
                                        );
                                      }
                                    }

                                    return prod.expirationDate ? (
                                      <span className="bg-slate-100 px-2 py-0.5 rounded font-mono whitespace-nowrap text-xs font-bold border border-slate-200">
                                        {prod.expirationDate}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-xs">N/A</span>
                                    );
                                  })()}
                                </td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  {lastAuditItem ? (
                                    <div className="inline-flex flex-col items-center">
                                      <span className="font-extrabold text-slate-900 text-xs whitespace-nowrap">
                                        {lastAuditItem.physicalStock} {prod.unit}
                                      </span>
                                      {lastAuditItem.difference === 0 ? (
                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 rounded border border-emerald-200 whitespace-nowrap">
                                          Correcto
                                        </span>
                                      ) : lastAuditItem.difference < 0 ? (
                                        <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 rounded border border-rose-200 whitespace-nowrap">
                                          Falta {Math.abs(lastAuditItem.difference)} {prod.unit}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-1.5 rounded border border-teal-200 whitespace-nowrap">
                                          Sobra +{lastAuditItem.difference} {prod.unit}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic font-medium whitespace-nowrap">
                                      Sin conteo
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                  <span
                                    className={`font-black text-sm px-2.5 py-1 rounded-lg border inline-flex items-center whitespace-nowrap ${
                                      hasStock
                                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs'
                                        : 'bg-slate-100 text-slate-400 border-slate-200 font-semibold'
                                    }`}
                                  >
                                    {whStock} {prod.unit}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-black text-slate-700 whitespace-nowrap">
                                  {totalStock} {prod.unit}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Audit Modal */}
      {auditCategory && (
        <PhysicalAuditModal
          isOpen={auditModalOpen}
          onClose={() => {
            setAuditModalOpen(false);
            setAuditCategory(null);
          }}
          warehouse={warehouse}
          category={auditCategory}
          products={getAuditProductsForCategory(auditCategory)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};


