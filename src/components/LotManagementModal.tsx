import React, { useState, useEffect } from 'react';
import { Product, Warehouse, ProductLot, Category } from '../types';
import { getProducts, getWarehouses, getCategories, saveProducts } from '../services/storage';
import { ProductSearchSelect } from './Movements/ProductSearchSelect';
import {
  X,
  Calendar,
  Save,
  AlertTriangle,
  CheckCircle2,
  Package,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Boxes,
  RotateCcw,
} from 'lucide-react';

interface LotManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWarehouseId?: string;
  initialProductId?: string;
  initialLotId?: string;
}

export const LotManagementModal: React.FC<LotManagementModalProps> = ({
  isOpen,
  onClose,
  initialWarehouseId,
  initialProductId,
  initialLotId,
}) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [lotNumber, setLotNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Main selection helper function
  const selectProductAndWarehouse = (
    prodId: string,
    whId: string,
    prodsList: Product[] = products,
    preferredLotId?: string
  ) => {
    setSelectedWarehouseId(whId);
    setSelectedProductId(prodId);
    setErrorMsg('');
    setSuccessMsg('');

    const targetProd = prodsList.find((p) => p.id === prodId);
    if (!targetProd) {
      setEditingLotId(null);
      setLotNumber('');
      setQuantity('');
      setExpirationDate('');
      setNotes('');
      return;
    }

    const whLots = (targetProd.lots || []).filter(
      (l) => (l.warehouseId || '00') === whId
    );

    let targetLot: ProductLot | undefined = undefined;

    if (preferredLotId) {
      targetLot = whLots.find((l) => l.id === preferredLotId);
    }
    if (!targetLot && whLots.length > 0) {
      targetLot = whLots[0];
    }

    if (targetLot) {
      setEditingLotId(targetLot.id);
      setLotNumber(targetLot.lotNumber);
      setQuantity(targetLot.quantity);
      setExpirationDate(targetLot.expirationDate || '');
      setNotes(targetLot.notes || '');
    } else {
      setEditingLotId(null);
      setLotNumber('');
      const stock = Number(targetProd.stockByWarehouse[whId] || 0);
      setQuantity(stock > 0 ? stock : '');
      setExpirationDate(stock > 0 ? (targetProd.expirationDate || '') : '');
      setNotes('');
    }
  };

  useEffect(() => {
    if (isOpen) {
      const whs = getWarehouses();
      const prods = getProducts();
      const cats = getCategories();
      setWarehouses(whs);
      setProducts(prods);
      setCategories(cats);

      const defaultWh = initialWarehouseId || (whs.length > 0 ? whs[0].id : '00');
      const defaultProd = initialProductId || (prods.length > 0 ? prods[0].id : '');

      setErrorMsg('');
      setSuccessMsg('');

      selectProductAndWarehouse(defaultProd, defaultWh, prods, initialLotId);
    }
  }, [isOpen, initialWarehouseId, initialProductId, initialLotId]);

  if (!isOpen) return null;

  const currentWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);
  const currentProduct = products.find((p) => p.id === selectedProductId);

  // Calculations for currently selected product & warehouse
  const totalWarehouseStock = currentProduct
    ? Number(currentProduct.stockByWarehouse[selectedWarehouseId] || 0)
    : 0;

  const productLots = currentProduct?.lots || [];
  const warehouseLots = productLots
    .filter((l) => (l.warehouseId || '00') === selectedWarehouseId)
    .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));

  // Quantity assigned in OTHER lots (excluding currently edited lot)
  const assignedInOtherLots = warehouseLots.reduce((acc, l) => {
    if (editingLotId && l.id === editingLotId) return acc;
    return acc + Number(l.quantity || 0);
  }, 0);

  const totalAssignedAllLots = warehouseLots.reduce((acc, l) => acc + Number(l.quantity || 0), 0);
  const unassignedStock = Math.max(0, totalWarehouseStock - totalAssignedAllLots);
  const maxAvailableForCurrentLot = Math.max(0, totalWarehouseStock - assignedInOtherLots);

  const handleNewLotMode = () => {
    setEditingLotId(null);
    setLotNumber('');
    const available = Math.max(0, totalWarehouseStock - totalAssignedAllLots);
    setQuantity(available > 0 ? available : '');
    setExpirationDate(available > 0 ? (currentProduct?.expirationDate || '') : '');
    setNotes('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleEditLotClick = (lot: ProductLot) => {
    setEditingLotId(lot.id);
    setLotNumber(lot.lotNumber);
    setQuantity(lot.quantity);
    setExpirationDate(lot.expirationDate || '');
    setNotes(lot.notes || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleDeleteLotClick = (lotId: string) => {
    if (!selectedProductId) return;
    const allProducts = getProducts();
    const prodIdx = allProducts.findIndex((p) => p.id === selectedProductId);
    if (prodIdx === -1) return;

    const targetProd = allProducts[prodIdx];
    if (targetProd.lots) {
      targetProd.lots = targetProd.lots.filter((l) => l.id !== lotId);
      const remainingDates = targetProd.lots.map((l) => l.expirationDate).filter(Boolean).sort();
      if (remainingDates.length > 0) {
        targetProd.expirationDate = remainingDates[0];
      }
      saveProducts(allProducts);
      setProducts(allProducts);
      setSuccessMsg('Lote eliminado correctamente.');

      selectProductAndWarehouse(selectedProductId, selectedWarehouseId, allProducts);
    }
  };

  const handleSaveLot = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedProductId) {
      setErrorMsg('Seleccione un producto.');
      return;
    }

    if (!expirationDate) {
      setErrorMsg('La Fecha de Vencimiento es obligatoria.');
      return;
    }

    const numQty = quantity === '' ? 0 : Number(quantity);
    if (isNaN(numQty) || numQty < 0) {
      setErrorMsg('La cantidad debe ser un número válido mayor o igual a 0.');
      return;
    }

    if (numQty > maxAvailableForCurrentLot) {
      setErrorMsg(
        `La cantidad del lote (${numQty}) supera la existencia disponible para asignar en este almacén (${maxAvailableForCurrentLot} unidades).`
      );
      return;
    }

    const allProducts = getProducts();
    const prodIdx = allProducts.findIndex((p) => p.id === selectedProductId);
    if (prodIdx === -1) return;

    const targetProd = allProducts[prodIdx];
    if (!targetProd.lots) targetProd.lots = [];

    const lotName = lotNumber.trim() || 'S/N';
    let savedLotId = editingLotId;

    if (editingLotId) {
      targetProd.lots = targetProd.lots.map((l) => {
        if (l.id === editingLotId) {
          return {
            ...l,
            lotNumber: lotName,
            quantity: numQty,
            expirationDate,
            warehouseId: selectedWarehouseId,
            notes: notes.trim() || undefined,
          };
        }
        return l;
      });
      setSuccessMsg('Lote actualizado exitosamente.');
    } else {
      const newLot: ProductLot = {
        id: `lot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        lotNumber: lotName,
        quantity: numQty,
        expirationDate,
        warehouseId: selectedWarehouseId,
        notes: notes.trim() || undefined,
      };
      targetProd.lots.push(newLot);
      savedLotId = newLot.id;
      setSuccessMsg(`Lote "${lotName}" asignado exitosamente.`);
    }

    // Keep product expiration date synced with earliest lot date
    const sortedDates = targetProd.lots.map((l) => l.expirationDate).filter(Boolean).sort();
    if (sortedDates.length > 0) {
      targetProd.expirationDate = sortedDates[0];
    } else {
      targetProd.expirationDate = expirationDate;
    }

    saveProducts(allProducts);
    setProducts(allProducts);

    // Refresh context for current product/warehouse/lot
    selectProductAndWarehouse(selectedProductId, selectedWarehouseId, allProducts, savedLotId || undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/20 text-red-400 rounded-2xl border border-red-500/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Gestión de Lotes de Vencimiento</h2>
              <p className="text-xs text-slate-400">
                Seleccione el almacén y producto para administrar sus fechas de caducidad por lote.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Warehouse and Product Selector Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* 1. Almacén Selector */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-red-600" />
                1. Seleccionar Almacén
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => selectProductAndWarehouse(selectedProductId, e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:ring-2 focus:ring-red-500 shadow-xs"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Producto Selector */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-red-600" />
                2. Seleccionar Producto
              </label>

              <ProductSearchSelect
                products={products}
                categories={categories}
                selectedProductId={selectedProductId}
                onSelectProduct={(prodId) => selectProductAndWarehouse(prodId, selectedWarehouseId)}
                warehouseId={selectedWarehouseId}
                placeholder="Buscar por código, nombre o subgrupo..."
              />
            </div>
          </div>

          {/* Product Banner & Summary Metrics */}
          {currentProduct && (
            <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 font-mono text-white text-xs font-black px-2.5 py-0.5 rounded-lg">
                    {currentProduct.code}
                  </span>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-100">
                    {currentProduct.name}
                  </h3>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  Almacén Actual: <strong className="text-amber-400 font-bold">{currentWarehouse?.code} - {currentWarehouse?.name}</strong>
                </div>
              </div>

              {/* 3 Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                    Existencia Real Almacén
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-100 font-mono">
                    {totalWarehouseStock} <span className="text-xs font-normal text-slate-400">unidades</span>
                  </span>
                </div>

                <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/30">
                  <span className="block text-[10px] font-black text-amber-300 uppercase tracking-wider mb-0.5">
                    Asignado en Lotes
                  </span>
                  <span className="text-sm sm:text-base font-black text-amber-400 font-mono">
                    {totalAssignedAllLots} <span className="text-xs font-normal text-amber-300/80">unidades</span>
                  </span>
                </div>

                <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
                  <span className="block text-[10px] font-black text-emerald-300 uppercase tracking-wider mb-0.5">
                    Disponible sin Lote
                  </span>
                  <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                    {unassignedStock} <span className="text-xs font-normal text-emerald-300/80">unidades</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-800 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 2-Column Section: Form on Left, Registered Lots List on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Column */}
            <form onSubmit={handleSaveLot} className="lg:col-span-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                  {editingLotId ? (
                    <>
                      <Pencil className="w-4 h-4 text-amber-600" />
                      <span>Editando Lote Existente</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-red-600" />
                      <span>Asignar Nuevo Lote</span>
                    </>
                  )}
                </h4>

                {editingLotId && (
                  <button
                    type="button"
                    onClick={handleNewLotMode}
                    className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition-all shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>+ Nuevo Lote</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número / Identificador de Lote
                </label>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="Ej: LOTE-2026-A15 (ó dejar S/N)"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-xs text-slate-900 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Cantidad Lote
                    </label>
                    <span className="text-[10px] font-extrabold text-slate-500">
                      Máx: {maxAvailableForCurrentLot} u
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setQuantity(val);
                      }
                    }}
                    placeholder={`Ej: ${maxAvailableForCurrentLot}`}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-slate-900 focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-900 mb-1">
                    Fecha Vencimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-red-200 rounded-xl font-mono font-bold text-xs text-slate-900 focus:border-red-500 focus:ring-0 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Lote de fábrica, Palet 3"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-normal text-xs text-slate-900 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{editingLotId ? 'Guardar Cambios del Lote' : 'Asignar Lote a Producto'}</span>
              </button>
            </form>

            {/* Registered Lots List Column */}
            <div className="lg:col-span-6 space-y-3">
              <h4 className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Boxes className="w-4 h-4 text-slate-600" />
                <span>Lotes Registrados en {currentWarehouse?.code} ({warehouseLots.length})</span>
              </h4>

              {warehouseLots.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No hay lotes de vencimiento registrados para este almacén.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Use el formulario a la izquierda para asignar lotes con sus fechas específicas.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {warehouseLots.map((lot) => {
                    const isBeingEdited = editingLotId === lot.id;
                    return (
                      <div
                        key={lot.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isBeingEdited
                            ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                              {lot.lotNumber || 'S/N'}
                            </span>
                            <span className="font-bold text-xs text-slate-900 font-mono">
                              {lot.quantity} unidades
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-red-500" />
                            <span>Vence: <strong className="font-mono text-slate-900">{lot.expirationDate}</strong></span>
                          </div>
                          {lot.notes && (
                            <p className="text-[10px] text-slate-500 italic">"{lot.notes}"</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditLotClick(lot)}
                            className="p-2 text-slate-600 hover:text-amber-700 hover:bg-amber-100 rounded-xl transition-all"
                            title="Editar este lote"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLotClick(lot.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Eliminar este lote"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
