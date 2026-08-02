import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface WarehouseViewProps {
  warehouse: Warehouse;
  currentUser: UserProfile;
  onNavigateToAuditReport?: () => void;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  warehouse,
  currentUser,
  onNavigateToAuditReport,
}) => {
  const [categories, setCategories] = useState<Category[]>(getCategories);
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses);
  const [movements, setMovements] = useState<MovementRecord[]>(getMovements);
  const [lastAudits, setLastAudits] = useState(getLastAuditsMap);
  const [audits, setAudits] = useState(getPhysicalAudits);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
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

  // Filter products for search & selected category
  const warehouseProducts = products.filter((p) => {
    if (selectedCategoryId !== 'ALL' && p.categoryId !== selectedCategoryId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    }

    return true;
  });

  // Helper to get products for physical audit (respecting category)
  const getAuditProductsForCategory = (cat: Category) => {
    const activeCatIds = new Set(categories.map((c) => c.id));
    if (cat.id === '__ORPHAN__') {
      return products.filter((p) => !activeCatIds.has(p.categoryId));
    }
    return products.filter((p) => p.categoryId === cat.id);
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
    }

    return null;
  };

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

        <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700/80 text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            Items Registrados
          </span>
          <span className="text-2xl font-black text-amber-400">
            {warehouseProducts.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto por código o descripción..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[220px]">
          <CustomSelect
            value={selectedCategoryId}
            onChange={setSelectedCategoryId}
            accentColor="rose"
            icon={<Filter className="w-4 h-4 text-slate-400" />}
            options={[
              { value: 'ALL', label: 'Todas las Categorías (Subgrupos)' },
              ...categories.map((c) => ({
                value: c.id,
                label: c.name,
                badge: c.codePrefix,
              })),
            ]}
          />
        </div>
      </div>

      {/* Categories Sections with Products & Physical Audit Actions */}
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

            if (searchQuery.trim() && rawCatProducts.length === 0) return null;
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
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-300 active:scale-[0.98]"
                    >
                      <FileText className="w-4 h-4 text-red-600" />
                      <span>Ver Reporte de Auditorías</span>
                    </button>
                  )}

                  {currentUser.permissions.canPhysicalInventory && (
                    <button
                      onClick={() => handleOpenAudit(cat)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-[0.98]"
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

                        // Find latest audit item for this product in this warehouse
                        let lastAuditItem = null;
                        for (const a of audits) {
                          if (a.warehouseId === warehouse.id) {
                            const item = a.items.find((i) => i.productId === prod.id);
                            if (item) {
                              lastAuditItem = item;
                              break;
                            }
                          }
                        }

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
                              {prod.expirationDate ? (
                                <span className="bg-slate-100 px-2 py-0.5 rounded font-mono whitespace-nowrap">
                                  {prod.expirationDate}
                                </span>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
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

