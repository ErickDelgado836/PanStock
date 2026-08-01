import React, { useState, useEffect, useMemo } from 'react';
import { Product, Warehouse } from '../types';
import { getProducts, getWarehouses, saveProducts, subscribeToStorage } from '../services/storage';
import { LotManagementModal } from './LotManagementModal';
import { ConfirmationModal } from './ConfirmationModal';
import { CustomSelect } from './Common/CustomSelect';
import {
  AlertTriangle,
  ShieldCheck,
  Clock,
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
} from 'lucide-react';

const getDaysUntilExpiry = (expiryStr?: string) => {
  if (!expiryStr) return null;
  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const parts = expiryStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const expZero = new Date(year, month, day).getTime();
  const diffTime = expZero - todayZero;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

interface ExpiringLotItem {
  product: Product;
  lotId?: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number | null;
  warehouseId: string;
  daysLeft: number;
  status: 'EXPIRED' | 'NEAR' | 'SAFE';
}

export const ExpiryAlerts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'EXPIRED' | 'NEAR'>('ALL');
  const [filterWarehouseId, setFilterWarehouseId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalInitialWhId, setModalInitialWhId] = useState<string | undefined>(undefined);
  const [modalInitialProdId, setModalInitialProdId] = useState<string | undefined>(undefined);
  const [modalInitialLotId, setModalInitialLotId] = useState<string | undefined>(undefined);

  // Delete Confirmation State
  const [lotToDeleteTarget, setLotToDeleteTarget] = useState<{
    prodId: string;
    lotId?: string;
    prodName: string;
    lotNumber: string;
  } | null>(null);

  const loadData = () => {
    setProducts(getProducts());
    setWarehouses(getWarehouses());
  };

  useEffect(() => {
    return subscribeToStorage(loadData);
  }, []);

  const openModalForNewLot = (whId?: string, prodId?: string) => {
    setModalInitialWhId(whId);
    setModalInitialProdId(prodId);
    setModalInitialLotId(undefined);
    setIsModalOpen(true);
  };

  const openModalForEditLot = (whId: string, prodId: string, lotId?: string) => {
    setModalInitialWhId(whId);
    setModalInitialProdId(prodId);
    setModalInitialLotId(lotId);
    setIsModalOpen(true);
  };

  const promptDeleteLotDirectly = (prodId: string, lotId: string | undefined, prodName: string, lotNumber: string) => {
    setLotToDeleteTarget({ prodId, lotId, prodName, lotNumber });
  };

  const confirmDeleteLotDirectly = () => {
    if (!lotToDeleteTarget) return;

    const allProducts = getProducts();
    const targetIdx = allProducts.findIndex((p) => p.id === lotToDeleteTarget.prodId);
    if (targetIdx !== -1) {
      const targetProd = allProducts[targetIdx];
      if (lotToDeleteTarget.lotId) {
        targetProd.lots = (targetProd.lots || []).filter((l) => l.id !== lotToDeleteTarget.lotId);
        if (targetProd.lots.length === 0) {
          delete targetProd.expirationDate;
        }
      } else {
        delete targetProd.expirationDate;
        targetProd.lots = [];
      }
      saveProducts(allProducts);
      loadData();
    }
    setLotToDeleteTarget(null);
  };

  // Compile list of expiring lots with full metadata
  const expiringLotsList = useMemo(() => {
    const list: ExpiringLotItem[] = [];

    products.forEach((p) => {
      if (p.lots && p.lots.length > 0) {
        p.lots.forEach((lot) => {
          const days = getDaysUntilExpiry(lot.expirationDate);
          if (days === null) return;
          let status: 'EXPIRED' | 'NEAR' | 'SAFE' = 'SAFE';
          if (days < 0) status = 'EXPIRED';
          else if (days <= 30) status = 'NEAR';

          list.push({
            product: p,
            lotId: lot.id,
            lotNumber: lot.lotNumber,
            expirationDate: lot.expirationDate,
            quantity: lot.quantity,
            warehouseId: lot.warehouseId || '00',
            daysLeft: days,
            status,
          });
        });
      } else if (p.expirationDate) {
        const days = getDaysUntilExpiry(p.expirationDate);
        if (days !== null) {
          let status: 'EXPIRED' | 'NEAR' | 'SAFE' = 'SAFE';
          if (days < 0) status = 'EXPIRED';
          else if (days <= 30) status = 'NEAR';

          const whEntries = Object.entries(p.stockByWarehouse).filter(([, qty]) => Number(qty) > 0);
          if (whEntries.length > 0) {
            whEntries.forEach(([whId, qty]) => {
              list.push({
                product: p,
                lotNumber: 'Lote General (Sin Código)',
                expirationDate: p.expirationDate!,
                quantity: Number(qty),
                warehouseId: whId,
                daysLeft: days,
                status,
              });
            });
          } else {
            list.push({
              product: p,
              lotNumber: 'Lote General (Sin Código)',
              expirationDate: p.expirationDate!,
              quantity: null,
              warehouseId: '00',
              daysLeft: days,
              status,
            });
          }
        }
      }
    });

    return list;
  }, [products]);

  // Filter lots by Status, Warehouse, and Search Query
  const filteredLots = useMemo(() => {
    return expiringLotsList
      .filter((item) => {
        if (filterStatus === 'EXPIRED' && item.status !== 'EXPIRED') return false;
        if (filterStatus === 'NEAR' && item.status !== 'NEAR') return false;

        if (filterWarehouseId !== 'ALL' && item.warehouseId !== filterWarehouseId) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = item.product.name.toLowerCase().includes(q);
          const matchesCode = item.product.code.toLowerCase().includes(q);
          const matchesLot = item.lotNumber.toLowerCase().includes(q);
          if (!matchesName && !matchesCode && !matchesLot) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.daysLeft !== b.daysLeft) {
          return a.daysLeft - b.daysLeft;
        }
        if (a.expirationDate !== b.expirationDate) {
          return a.expirationDate.localeCompare(b.expirationDate);
        }
        return a.product.name.localeCompare(b.product.name);
      });
  }, [expiringLotsList, filterStatus, filterWarehouseId, searchQuery]);

  const totalAlertsCount = expiringLotsList.length;
  const expiredCount = useMemo(() => expiringLotsList.filter((l) => l.status === 'EXPIRED').length, [expiringLotsList]);
  const nearCount = useMemo(() => expiringLotsList.filter((l) => l.status === 'NEAR').length, [expiringLotsList]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-red-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-amber-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>CONTROL DE CALIDAD & CADUCIDAD</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Control de Fechas de Vencimiento por Lote</h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Gestione lotes específicos con sus fechas de caducidad por almacén, asegurando la trazabilidad, rotación de inventario y validación estricta contra la existencia real.
          </p>
        </div>

        <button
          onClick={() => openModalForNewLot(filterWarehouseId !== 'ALL' ? filterWarehouseId : undefined)}
          className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl shadow-xl transition-all flex items-center gap-2 shrink-0 hover:scale-105 active:scale-95 text-xs md:text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>+ Asignar / Controlar Lote</span>
        </button>
      </div>

      {/* Control Bar: Warehouse Select, Status Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Row 1: Warehouse selector & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Warehouse Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <CustomSelect
              value={filterWarehouseId}
              onChange={setFilterWarehouseId}
              accentColor="rose"
              icon={<Building2 className="w-4 h-4 text-red-600" />}
              options={[
                { value: 'ALL', label: `Todos los Almacenes (${warehouses.length})` },
                ...warehouses.map((w) => ({
                  value: w.id,
                  label: w.name,
                  badge: w.code,
                })),
              ]}
            />
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por producto, código o lote..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs text-slate-900 focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Row 2: Status Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto touch-pan-x max-w-full w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                filterStatus === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos los Lotes ({totalAlertsCount})
            </button>
            <button
              onClick={() => setFilterStatus('NEAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                filterStatus === 'NEAR'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Próximos &le; 30 días ({nearCount})</span>
            </button>
            <button
              onClick={() => setFilterStatus('EXPIRED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                filterStatus === 'EXPIRED'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-red-700 hover:bg-red-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Vencidos ({expiredCount})</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-semibold shrink-0">
            Mostrando <strong className="text-slate-900">{filteredLots.length}</strong> resultado(s)
          </div>
        </div>
      </div>

      {/* Grid of Expiring Lots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLots.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-3">
            <ShieldCheck className="w-14 h-14 mx-auto text-emerald-500" />
            <p className="font-extrabold text-slate-800 text-lg">No se encontraron lotes para este filtro</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No hay alertas de vencimiento que coincidan con los criterios seleccionados. Puede hacer clic en el botón superior para registrar nuevos lotes por almacén.
            </p>
            <button
              onClick={() => openModalForNewLot(filterWarehouseId !== 'ALL' ? filterWarehouseId : undefined)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-red-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Registrar Lote Ahora</span>
            </button>
          </div>
        ) : (
          filteredLots.map((item, idx) => {
            const p = item.product;
            const wh = warehouses.find((w) => w.id === item.warehouseId);
            const isExpired = item.status === 'EXPIRED';
            const isNear = item.status === 'NEAR';

            const stockInWh = Number(p.stockByWarehouse[item.warehouseId] || 0);

            return (
              <div
                key={`${p.id}-${item.lotId || idx}`}
                className={`p-5 bg-white rounded-3xl border shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md ${
                  isExpired
                    ? 'border-red-300 bg-red-50/20'
                    : isNear
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {p.code}
                      </span>
                      <span className="text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-red-600" />
                        <span>{wh ? wh.code : item.warehouseId}</span>
                      </span>
                    </div>

                    {isExpired ? (
                      <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <AlertTriangle className="w-3 h-3" />
                        <span>
                          {item.daysLeft === -1
                            ? 'VENCIDO (HACE 1 DÍA)'
                            : `VENCIDO (HACE ${Math.abs(item.daysLeft)} DÍAS)`}
                        </span>
                      </span>
                    ) : item.daysLeft === 0 ? (
                      <span className="bg-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                        <Clock className="w-3 h-3 text-amber-200" />
                        <span>VENCE HOY</span>
                      </span>
                    ) : isNear ? (
                      <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <Clock className="w-3 h-3" />
                        <span>
                          VENCE EN {item.daysLeft} {item.daysLeft === 1 ? 'DÍA' : 'DÍAS'}
                        </span>
                      </span>
                    ) : (
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>VIGENTE ({item.daysLeft} DÍAS)</span>
                      </span>
                    )}
                  </div>

                  {/* Product Title & Lot Info */}
                  <div>
                    <h3 className="font-black text-slate-900 text-base leading-snug">{p.name}</h3>
                    <div className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Identificador de Lote:</span>
                        <strong className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {item.lotNumber}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Cantidad en Lote:</span>
                        <strong className="font-extrabold text-red-700">
                          {item.quantity !== null ? `${item.quantity} ${p.unit}` : 'Lote Único'}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Fecha de Caducidad:</span>
                        <strong className="font-mono font-bold text-slate-900">{item.expirationDate}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Context & Quick Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Existencia en Almacén {wh?.code}:</span>
                    <span className="font-extrabold text-slate-900">
                      {stockInWh} {p.unit}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => openModalForEditLot(item.warehouseId, p.id, item.lotId)}
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Lote</span>
                    </button>
                    <button
                      onClick={() => promptDeleteLotDirectly(p.id, item.lotId, p.name, item.lotNumber)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-all"
                      title="Eliminar este lote"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lot Management Modal */}
      <LotManagementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          loadData();
        }}
        initialWarehouseId={modalInitialWhId}
        initialProductId={modalInitialProdId}
        initialLotId={modalInitialLotId}
      />

      {/* Confirmation Modal for Direct Deletion */}
      <ConfirmationModal
        isOpen={!!lotToDeleteTarget}
        onClose={() => setLotToDeleteTarget(null)}
        onConfirm={confirmDeleteLotDirectly}
        title="Eliminar Lote de Vencimiento"
        message={`¿Está seguro de que desea eliminar el lote "${lotToDeleteTarget?.lotNumber}" del producto "${lotToDeleteTarget?.prodName}"?`}
        type="DELETE"
        confirmText="Sí, Eliminar Lote"
      />
    </div>
  );
};
