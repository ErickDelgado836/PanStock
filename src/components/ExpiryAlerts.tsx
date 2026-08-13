import React, { useState, useEffect, useMemo } from 'react';
import { Product, Warehouse, UserProfile } from '../types';
import { getProducts, getWarehouses, saveProducts, subscribeToStorage, getCurrentUser } from '../services/storage';
import { LotManagementModal } from './LotManagementModal';
import { ConfirmationModal } from './ConfirmationModal';
import { showToast } from '../utils/toast';
import { CustomSelect } from './Common/CustomSelect';
import { getLotStockMap, getLotTotalStock, getLotStockInWarehouse } from '../utils/lotUtils';
import { generateExpiryReportPDF } from '../utils/pdfGenerator';
import {
  AlertTriangle,
  ShieldCheck,
  Clock,
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
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
  totalQuantity: number;
  stockByWarehouse: Record<string, number>;
  daysLeft: number;
  status: 'EXPIRED' | 'NEAR' | 'SAFE';
}

export const ExpiryAlerts: React.FC<{ currentUser?: UserProfile }> = ({ currentUser: propsUser }) => {
  const user = propsUser || getCurrentUser();
  const canEditExpiry = user?.isAdmin || (user?.permissions?.canEditExpiry !== false && user?.permissions?.canExpiry !== false);

  const [products, setProducts] = useState<Product[]>(getProducts);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'EXPIRED' | 'NEAR'>('ALL');
  const [filterWarehouseId, setFilterWarehouseId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expandable product summary state
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});

  const toggleSummary = (summaryKey: string) => {
    setExpandedSummaries((prev) => ({
      ...prev,
      [summaryKey]: !prev[summaryKey],
    }));
  };

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
    if (!canEditExpiry) {
      showToast('Acceso Restringido', 'No posee permisos para asignar o modificar fechas de vencimiento/lotes.', 'error');
      return;
    }
    setModalInitialWhId(whId);
    setModalInitialProdId(prodId);
    setModalInitialLotId(undefined);
    setIsModalOpen(true);
  };

  const openModalForEditLot = (whId: string, prodId: string, lotId?: string) => {
    if (!canEditExpiry) {
      showToast('Acceso Restringido', 'No posee permisos para editar fechas de vencimiento/lotes.', 'error');
      return;
    }
    setModalInitialWhId(whId);
    setModalInitialProdId(prodId);
    setModalInitialLotId(lotId);
    setIsModalOpen(true);
  };

  const promptDeleteLotDirectly = (prodId: string, lotId: string | undefined, prodName: string, lotNumber: string) => {
    if (!canEditExpiry) {
      showToast('Acceso Restringido', 'No posee permisos para eliminar fechas de vencimiento/lotes.', 'error');
      return;
    }
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
      setProducts(allProducts);
      setLotToDeleteTarget(null);
      showToast(
        '¡Lote Eliminado con Éxito!',
        `El lote "${lotToDeleteTarget.lotNumber}" del producto "${lotToDeleteTarget.prodName}" fue eliminado correctamente.`,
        'success'
      );
    }
    setLotToDeleteTarget(null);
  };

  const isLastLotForProd = useMemo(() => {
    if (!lotToDeleteTarget) return true;
    const prod = products.find((p) => p.id === lotToDeleteTarget.prodId);
    return prod ? (prod.lots || []).length <= 1 : true;
  }, [lotToDeleteTarget, products]);

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

          const stockMap = getLotStockMap(lot);
          const totalQty = getLotTotalStock(lot);
          if (totalQty <= 0) return;

          list.push({
            product: p,
            lotId: lot.id,
            lotNumber: lot.lotNumber || 'S/N',
            expirationDate: lot.expirationDate,
            totalQuantity: totalQty,
            stockByWarehouse: stockMap,
            daysLeft: days,
            status,
          });
        });
      } else if (p.expirationDate) {
        const totalQty = Object.values(p.stockByWarehouse || {}).reduce((sum: number, q: number | string) => sum + Number(q || 0), 0) as number;
        if (totalQty <= 0) return;

        const days = getDaysUntilExpiry(p.expirationDate);
        if (days !== null) {
          let status: 'EXPIRED' | 'NEAR' | 'SAFE' = 'SAFE';
          if (days < 0) status = 'EXPIRED';
          else if (days <= 30) status = 'NEAR';

          list.push({
            product: p,
            lotNumber: 'Lote General (Sin Código)',
            expirationDate: p.expirationDate,
            totalQuantity: totalQty,
            stockByWarehouse: p.stockByWarehouse,
            daysLeft: days,
            status,
          });
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

        if (filterWarehouseId !== 'ALL') {
          const stockInWh = item.stockByWarehouse[filterWarehouseId] || 0;
          if (stockInWh <= 0) return false;
        }

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

  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  const handleExportPDF = async () => {
    if (filteredLots.length === 0) {
      showToast('Sin Resultados', 'No hay lotes en la lista actual para generar el reporte PDF.', 'warning');
      return;
    }

    setIsExportingPDF(true);
    try {
      const selectedWhObj = warehouses.find((w) => w.id === filterWarehouseId);
      const whLabel =
        filterWarehouseId === 'ALL'
          ? `Todos los Almacenes (${warehouses.length})`
          : selectedWhObj
          ? `${selectedWhObj.code} - ${selectedWhObj.name}`
          : filterWarehouseId;

      let filterStatusLabel = 'Todos los Lotes';
      if (filterStatus === 'EXPIRED') filterStatusLabel = 'Solo Vencidos';
      if (filterStatus === 'NEAR') filterStatusLabel = 'Próximos a Vencer (<= 30 días)';

      const pdfItems = filteredLots.map((item) => {
        const breakdown = Object.entries(item.stockByWarehouse)
          .filter(([, qty]) => Number(qty) > 0)
          .map(([whId, qty]) => {
            const whObj = warehouses.find((w) => w.id === whId);
            return {
              whCode: whObj ? whObj.code : whId,
              whName: whObj ? whObj.name : `Almacén ${whId}`,
              qty: Number(qty),
            };
          });

        return {
          productCode: item.product.code,
          productName: item.product.name,
          lotNumber: item.lotNumber,
          expirationDate: item.expirationDate,
          daysLeft: item.daysLeft,
          status: item.status,
          totalQuantity: item.totalQuantity,
          unit: item.product.unit,
          warehouseBreakdown: breakdown,
        };
      });

      const pdfSummary = {
        warehouseName: whLabel,
        filterStatusLabel,
        searchQuery: searchQuery.trim() || undefined,
        totalLotsCount: filteredLots.length,
        expiredCount: filteredLots.filter((i) => i.status === 'EXPIRED').length,
        nearCount: filteredLots.filter((i) => i.status === 'NEAR').length,
        safeCount: filteredLots.filter((i) => i.status === 'SAFE').length,
        generatedBy: user?.name || user?.username || 'Usuario del Sistema',
      };

      await generateExpiryReportPDF(pdfSummary, pdfItems);

      showToast(
        '¡PDF Generado con Éxito!',
        `Se descargó el reporte con ${filteredLots.length} registro(s) de vencimiento.`,
        'success'
      );
    } catch (err) {
      console.error('Error generating PDF report:', err);
      showToast('Error de Exportación', 'Ocurrió un inconveniente al generar el reporte en PDF.', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF || filteredLots.length === 0}
            className="px-4 py-3 bg-slate-800/90 hover:bg-slate-800 text-white font-extrabold rounded-2xl border border-slate-700/80 shadow-lg transition-all flex items-center justify-center gap-2 text-xs md:text-sm cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar reporte PDF con los lotes filtrados actualmente"
          >
            {isExportingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <FileText className="w-4 h-4 text-red-400" />
            )}
            <span>{isExportingPDF ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>

          <button
            onClick={() => openModalForNewLot(filterWarehouseId !== 'ALL' ? filterWarehouseId : undefined)}
            className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 text-xs md:text-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>+ Asignar / Controlar Lote</span>
          </button>
        </div>
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

        {/* Row 2: Status Filter Tabs & Quick PDF Download */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto touch-auto max-w-full w-full sm:w-auto">
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

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-semibold shrink-0">
              Mostrando <strong className="text-slate-900">{filteredLots.length}</strong> resultado(s)
            </span>

            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF || filteredLots.length === 0}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
              title="Descargar reporte PDF con los lotes filtrados actualmente"
            >
              {isExportingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-red-400" />
              )}
              <span>Exportar PDF</span>
            </button>
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
            const isExpired = item.status === 'EXPIRED';
            const isNear = item.status === 'NEAR';

            // Active stock breakdown across warehouses
            const activeStockBreakdown = Object.entries(item.stockByWarehouse)
              .filter(([, qty]) => Number(qty) > 0)
              .map(([whId, qty]) => {
                const whObj = warehouses.find((w) => w.id === whId);
                return {
                  whId,
                  whCode: whObj ? whObj.code : whId,
                  whName: whObj ? whObj.name : `Almacén ${whId}`,
                  qty: Number(qty),
                };
              });

            const activeWarehouseCodesText =
              filterWarehouseId !== 'ALL'
                ? (warehouses.find((w) => w.id === filterWarehouseId)?.code || filterWarehouseId)
                : activeStockBreakdown.map((b) => b.whCode).join(', ') || '00';

            const firstActiveWhId =
              filterWarehouseId !== 'ALL'
                ? filterWarehouseId
                : activeStockBreakdown.length > 0
                ? activeStockBreakdown[0].whId
                : '00';

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
                        <span>{activeWarehouseCodesText}</span>
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
                    <div className="mt-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Identificador de Lote:</span>
                        <strong className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {item.lotNumber}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Fecha de Caducidad:</span>
                        <strong className="font-mono font-bold text-slate-900">{item.expirationDate}</strong>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                        <span className="text-slate-700 font-bold">Total Unidades en Lote:</span>
                        <strong className="font-extrabold text-red-700 text-sm">
                          {item.totalQuantity} {p.unit}
                        </strong>
                      </div>

                      {/* Detailed breakdown per warehouse for current lot */}
                      <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          Ubicación por Almacén para Lote {item.lotNumber}:
                        </span>
                        {activeStockBreakdown.length === 0 ? (
                          <span className="text-[11px] text-slate-400 font-medium italic">Sin stock disponible en almacenes</span>
                        ) : (
                          activeStockBreakdown.map((b) => {
                            const totalWhStock = Number(p.stockByWarehouse?.[b.whId] || 0);
                            const assignedInLotsWh = (p.lots || []).reduce(
                              (sum, l) => sum + getLotStockInWarehouse(l, b.whId),
                              0
                            );
                            const unassignedWh = Math.max(0, totalWhStock - assignedInLotsWh);

                            return (
                              <div
                                key={b.whId}
                                className={`p-2 rounded-xl text-[11px] ${
                                  filterWarehouseId === b.whId
                                    ? 'bg-red-100/80 text-red-950 font-black border border-red-200'
                                    : 'bg-white text-slate-700 font-bold border border-slate-200/80'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-black text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                                      {b.whCode}
                                    </span>
                                    <span className="truncate max-w-[130px] sm:max-w-[160px]">{b.whName}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-extrabold text-slate-900 block">
                                      {b.qty} {p.unit} <span className="text-[9px] font-bold text-slate-500 uppercase">(en este lote)</span>
                                    </span>
                                  </div>
                                </div>

                                {totalWhStock > b.qty && (
                                  <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                                    <span>Stock total en {b.whCode}: <strong className="text-slate-800">{totalWhStock} {p.unit}</strong></span>
                                    {unassignedWh > 0 ? (
                                      <span className="text-amber-800 font-extrabold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                        ({unassignedWh} u sin fecha)
                                      </span>
                                    ) : (
                                      <span className="text-emerald-700 font-bold">100% asignado</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Full Product-Level Expiration Summary (Collapsible) */}
                      {(() => {
                        const summaryKey = `${p.id}-${item.lotId || 'no-lot'}`;
                        const isExpanded = Boolean(expandedSummaries[summaryKey]);
                        const totalProdStock = Number(Object.values(p.stockByWarehouse || {}).reduce((a: number, b) => a + Number(b), 0));
                        const lotsCount = (p.lots || []).length;

                        return (
                          <div className="pt-2.5 border-t border-slate-300 space-y-2">
                            <button
                              type="button"
                              onClick={() => toggleSummary(summaryKey)}
                              className="w-full p-2.5 bg-slate-50 hover:bg-slate-100/90 rounded-2xl border border-slate-200 transition-all text-xs cursor-pointer group space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider text-left leading-tight">
                                  Resumen de Vencimientos
                                </span>
                                <div className="flex items-center gap-1 shrink-0 text-slate-700 font-extrabold text-[10px] group-hover:text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                  <span>{isExpanded ? 'Ocultar' : 'Ver detalles'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-0.5">
                                <span className="text-[10px] font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                                  {totalProdStock} {p.unit} en total
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">
                                  {lotsCount} {lotsCount === 1 ? 'lote' : 'lotes'}
                                </span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="space-y-2 pt-1 max-h-[380px] overflow-y-auto pr-1 animate-in fade-in duration-150">
                                {p.lots && p.lots.length > 0 ? (
                                  p.lots.map((lot) => {
                                    const lotTotal = getLotTotalStock(lot);
                                    const lotWhList = warehouses
                                      .map((w) => {
                                        const qty = getLotStockInWarehouse(lot, w.id);
                                        return { code: w.code, name: w.name, qty };
                                      })
                                      .filter((w) => w.qty > 0);

                                    return (
                                      <div
                                        key={lot.id}
                                        className={`p-3 rounded-2xl border transition-all ${
                                          lot.id === item.lotId
                                            ? 'bg-amber-100/90 border-amber-300 text-amber-950 shadow-2xs'
                                            : 'bg-white border-slate-200 text-slate-800'
                                        }`}
                                      >
                                        {/* Lot Header Info */}
                                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono font-black text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                                              Lote: {lot.lotNumber || 'S/N'}
                                            </span>
                                            <span className="text-slate-700 font-semibold text-xs">
                                              Vence: <strong className="font-mono font-bold text-slate-900">{lot.expirationDate}</strong>
                                            </span>
                                          </div>
                                          <span className="font-black text-red-700 text-xs shrink-0 font-mono">
                                            {lotTotal} {p.unit}
                                          </span>
                                        </div>

                                        {/* Warehouse Breakdown */}
                                        {lotWhList.length > 0 && (
                                          <div className="pt-2 space-y-1">
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                                              Ubicación por Almacén:
                                            </span>
                                            <div className="space-y-1">
                                              {lotWhList.map((w) => (
                                                <div
                                                  key={w.code}
                                                  className="flex items-center justify-between gap-2 bg-slate-50/90 px-2.5 py-1 rounded-lg border border-slate-200/80 text-[11px]"
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-mono font-black text-slate-900 bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[10px] shrink-0">
                                                      {w.code}
                                                    </span>
                                                    <span className="text-slate-800 font-bold truncate">
                                                      {w.name}
                                                    </span>
                                                  </div>
                                                  <span className="font-mono font-black text-slate-900 shrink-0">
                                                    {w.qty} <span className="text-[10px] text-slate-500 font-normal">{p.unit}</span>
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                                    <span>Vence: <strong className="font-mono text-slate-900">{p.expirationDate}</strong></span>
                                    <strong className="text-slate-900 font-mono">{Object.values(p.stockByWarehouse || {}).reduce((a, b) => Number(a) + Number(b), 0)} {p.unit}</strong>
                                  </div>
                                )}

                                {/* Unassigned units row */}
                                {(() => {
                                  const totalProdStock = Number(Object.values(p.stockByWarehouse || {}).reduce((a: number, b) => a + Number(b), 0));
                                  const totalAssignedLots = Number((p.lots || []).reduce((sum: number, l) => sum + getLotTotalStock(l), 0));
                                  const unassignedTotal = Math.max(0, totalProdStock - totalAssignedLots);

                                  if (unassignedTotal <= 0) return null;

                                  const unassignedWhList = warehouses
                                    .map((w) => {
                                      const whStock = Number(p.stockByWarehouse?.[w.id] || 0);
                                      const assignedInWh = (p.lots || []).reduce((s, l) => s + getLotStockInWarehouse(l, w.id), 0);
                                      const unassignedWh = Math.max(0, whStock - assignedInWh);
                                      return { code: w.code, name: w.name, qty: unassignedWh };
                                    })
                                    .filter((w) => w.qty > 0);

                                  return (
                                    <div className="p-3 bg-amber-50/95 border border-amber-200 rounded-2xl text-amber-950 text-xs shadow-2xs space-y-2">
                                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-amber-200/80">
                                        <span className="flex items-center gap-1.5 font-bold text-amber-950">
                                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                          <span>Sin fecha de vencimiento asignada:</span>
                                        </span>
                                        <strong className="font-black text-amber-950 text-xs font-mono shrink-0">{unassignedTotal} {p.unit}</strong>
                                      </div>

                                      {unassignedWhList.length > 0 && (
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-black uppercase text-amber-800/80 tracking-wider block mb-1">
                                            Ubicación por Almacén:
                                          </span>
                                          <div className="space-y-1">
                                            {unassignedWhList.map((w) => (
                                              <div
                                                key={w.code}
                                                className="flex items-center justify-between gap-2 bg-white/90 px-2.5 py-1 rounded-lg border border-amber-200 text-[11px]"
                                              >
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <span className="font-mono font-black text-amber-950 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 text-[10px] shrink-0">
                                                    {w.code}
                                                  </span>
                                                  <span className="text-slate-800 font-bold truncate">
                                                    {w.name}
                                                  </span>
                                                </div>
                                                <span className="font-mono font-black text-slate-900 shrink-0">
                                                  {w.qty} <span className="text-[10px] text-slate-500 font-normal">{p.unit}</span>
                                                </span>
                                              </div>
                                            ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModalForEditLot(firstActiveWhId, p.id, item.lotId)}
                      disabled={!canEditExpiry}
                      className={`flex-1 py-2 px-3 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        canEditExpiry
                          ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{canEditExpiry ? 'Editar Lote' : 'Solo Lectura'}</span>
                    </button>
                    <button
                      onClick={() => promptDeleteLotDirectly(p.id, item.lotId, p.name, item.lotNumber)}
                      disabled={!canEditExpiry}
                      className={`p-2 rounded-xl border transition-all ${
                        canEditExpiry
                          ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                      title={canEditExpiry ? "Eliminar este lote" : "Sin permiso para eliminar"}
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
        title="Confirmar Eliminación de Registro de Vencimiento"
        message={`¿Está seguro de que desea eliminar el lote "${lotToDeleteTarget?.lotNumber}" del producto "${lotToDeleteTarget?.prodName}"? ${
          isLastLotForProd
            ? '¡ATENCIÓN! Este es el único lote de vencimiento registrado para este producto. Si confirma, el producto quedará SIN FECHAS DE VENCIMIENTO registradas en el sistema.'
            : 'Se eliminará únicamente este lote específico de la lista de vencimientos.'
        }`}
        type="DELETE"
        confirmText="Sí, Eliminar Vencimiento"
      />
    </div>
  );
};

