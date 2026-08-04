import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, UserProfile, Warehouse, MovementRecord, MovementItem, UnitOfMeasure } from '../../types';
import {
  getWarehouses,
  getCategories,
  getProducts,
  saveProducts,
  addMovement,
  isDocRefDuplicate,
} from '../../services/storage';
import { ConfirmationModal } from '../ConfirmationModal';
import { ProductSearchSelect } from './ProductSearchSelect';
import { deductLotStock, getLotStockInWarehouse } from '../../utils/lotUtils';
import { showToast } from '../../utils/toast';
import { CustomSelect } from '../Common/CustomSelect';
import {
  X,
  ArrowUpRight,
  AlertCircle,
  Hash,
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  PackageCheck,
  Lock,
  Calendar,
} from 'lucide-react';

interface DescargosModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

interface MultiDischargeItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  maxAvailable: number;
  quantity: number;
  unit: string;
}

export const DescargosModal: React.FC<DescargosModalProps> = ({ isOpen, onClose, currentUser }) => {
  // Master mode: 'SINGLE' vs 'MULTIPLE'
  const [dischargeMode, setDischargeMode] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState(getCategories());
  const [products, setProducts] = useState<Product[]>([]);

  // Warehouse for exit
  const [warehouseId, setWarehouseId] = useState('01');

  // Doc Ref & Notes
  const [docRef, setDocRef] = useState('');
  const [notes, setNotes] = useState('');

  // Single Mode State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [ignoreLotRestrictions, setIgnoreLotRestrictions] = useState(false);
  const [quantity, setQuantity] = useState<number | string>('');

  // Multiple Mode State
  const [multiItems, setMultiItems] = useState<MultiDischargeItem[]>([]);

  // Add Item to Multiple List State
  const [addSelectedProdId, setAddSelectedProdId] = useState('');
  const [addQuantity, setAddQuantity] = useState<number | string>('');
  const [addUnit, setAddUnit] = useState<UnitOfMeasure>('unidades');

  const [errorMsg, setErrorMsg] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const scrollToError = () => {
    requestAnimationFrame(() => {
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (formRef.current) {
        formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  useEffect(() => {
    if (errorMsg) {
      scrollToError();
    }
  }, [errorMsg]);

  useEffect(() => {
    if (isOpen) {
      const whs = getWarehouses().filter((w) =>
        currentUser.permissions.allowedWarehouses.includes(w.id)
      );
      setWarehouses(whs);
      setCategories(getCategories());
      setProducts(getProducts());
      setDocRef(`DSC-ESP-${Math.floor(1000 + Math.random() * 9000)}`);
      setErrorMsg('');
      setMultiItems([]);
      setSelectedProductId('');
      setSelectedLotId('');
      setIgnoreLotRestrictions(false);
      setAddSelectedProdId('');
      setQuantity('');
      setAddQuantity('');
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    setSelectedLotId('');
  }, [selectedProductId, warehouseId]);

  // Products available in selected warehouse
  const availableProducts = products.filter(
    (p) => (p.stockByWarehouse[warehouseId] || 0) > 0
  );

  const selectedProduct = availableProducts.find((p) => p.id === selectedProductId);
  const maxAvailableSingle = selectedProduct ? selectedProduct.stockByWarehouse[warehouseId] || 0 : 0;

  const activeLotsInWh = selectedProduct
    ? (selectedProduct.lots || []).filter((l) => getLotStockInWarehouse(l, warehouseId) > 0)
    : [];

  const getMaxSingleQty = () => {
    if (!selectedProduct) return 0;
    if (ignoreLotRestrictions || activeLotsInWh.length === 0) {
      return maxAvailableSingle;
    }
    if (selectedLotId) {
      const chosenLot = activeLotsInWh.find((l) => l.id === selectedLotId);
      return chosenLot ? getLotStockInWarehouse(chosenLot, warehouseId) : 0;
    } else {
      // Auto FIFO
      const sortedLots = [...activeLotsInWh].sort((a, b) =>
        (a.expirationDate || '').localeCompare(b.expirationDate || '')
      );
      const firstLot = sortedLots[0];
      return firstLot ? getLotStockInWarehouse(firstLot, warehouseId) : 0;
    }
  };

  // Add Item to Multiple List
  const handleAddMultiItem = () => {
    setErrorMsg('');

    if (!addSelectedProdId) {
      setErrorMsg('Seleccione un producto disponible para añadir al descargo.');
      return;
    }

    const parsedAddQty = parseFloat(String(addQuantity).replace(',', '.')) || 0;
    if (parsedAddQty <= 0) {
      setErrorMsg('La cantidad a descargar debe ser mayor a 0.');
      return;
    }

    const prod = availableProducts.find((p) => p.id === addSelectedProdId);
    if (!prod) return;

    const stockInWh = prod.stockByWarehouse[warehouseId] || 0;

    const existingIndex = multiItems.findIndex((item) => item.productId === prod.id);
    let totalPlannedQty = parsedAddQty;

    if (existingIndex >= 0) {
      totalPlannedQty += multiItems[existingIndex].quantity;
    }

    if (totalPlannedQty > stockInWh) {
      setErrorMsg(
        `La cantidad total a descargar (${totalPlannedQty.toLocaleString('es-ES')} ${prod.unit}) supera la existencia disponible (${stockInWh.toLocaleString('es-ES')} ${prod.unit}).`
      );
      return;
    }

    const cat = categories.find((c) => c.id === prod.categoryId);

    if (existingIndex >= 0) {
      const updated = [...multiItems];
      updated[existingIndex].quantity = totalPlannedQty;
      updated[existingIndex].unit = addUnit || prod.unit || 'unidades';
      setMultiItems(updated);
    } else {
      setMultiItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random()}`,
          productId: prod.id,
          productCode: prod.code,
          productName: prod.name,
          categoryName: cat ? cat.name : 'GENERAL',
          maxAvailable: stockInWh,
          quantity: parsedAddQty,
          unit: addUnit || prod.unit || 'unidades',
        },
      ]);
    }

    // Reset inputs
    setAddSelectedProdId('');
    setAddQuantity('');
  };

  const handleRemoveMultiItem = (id: string) => {
    setMultiItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Validation before modal
  const handleValidation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!docRef.trim()) {
      setErrorMsg('El documento de referencia es obligatorio.');
      return;
    }

    if (isDocRefDuplicate(docRef)) {
      setErrorMsg(`El documento de referencia "${docRef}" ya existe. Debe ser único.`);
      return;
    }

    if (dischargeMode === 'SINGLE') {
      if (!selectedProductId) {
        setErrorMsg('Seleccione el producto a descargar.');
        return;
      }

      const parsedQty = parseFloat(String(quantity).replace(',', '.')) || 0;
      if (parsedQty <= 0) {
        setErrorMsg('La cantidad a descargar debe ser mayor a 0.');
        return;
      }

      if (parsedQty > maxAvailableSingle) {
        setErrorMsg(
          `La cantidad a descargar (${parsedQty.toLocaleString('es-ES')}) supera la existencia disponible en el almacén (${maxAvailableSingle.toLocaleString('es-ES')} ${selectedProduct?.unit}).`
        );
        return;
      }

      // Check per-lot limits if restriction is active
      if (!ignoreLotRestrictions && activeLotsInWh.length > 0) {
        if (selectedLotId) {
          const chosenLot = activeLotsInWh.find((l) => l.id === selectedLotId);
          const chosenLotQty = chosenLot ? getLotStockInWarehouse(chosenLot, warehouseId) : 0;
          if (parsedQty > chosenLotQty) {
            setErrorMsg(
              `La cantidad a descargar (${parsedQty.toLocaleString('es-ES')}) supera las ${chosenLotQty.toLocaleString('es-ES')} ${selectedProduct?.unit} disponibles en el lote seleccionado (Vence: ${chosenLot?.expirationDate || 'N/A'}). Si deseas abarcar más inventario de otros lotes, activa la opción 'Hacer operación total sin contar fechas de vencimiento'.`
            );
            return;
          }
        } else {
          // Auto FIFO: check if requested qty exceeds the stock of the earliest lot when multiple lots exist
          const sortedLots = [...activeLotsInWh].sort((a, b) =>
            (a.expirationDate || '').localeCompare(b.expirationDate || '')
          );
          const firstLot = sortedLots[0];
          const firstLotQty = firstLot ? getLotStockInWarehouse(firstLot, warehouseId) : 0;
          if (parsedQty > firstLotQty && activeLotsInWh.length > 1) {
            setErrorMsg(
              `La cantidad a descargar (${parsedQty.toLocaleString('es-ES')}) abarca más de un lote con distinta fecha de vencimiento. El lote más próximo a vencer (${firstLot?.lotNumber || 'S/N'}, Exp: ${firstLot?.expirationDate}) sólo cuenta con ${firstLotQty.toLocaleString('es-ES')} ${selectedProduct?.unit}. Si deseas realizar el descargo total abarcando múltiples lotes, marca la casilla 'Hacer operación total sin contar fechas de vencimiento'.`
            );
            return;
          }
        }
      }
    } else {
      if (multiItems.length === 0) {
        setErrorMsg('Debe añadir al menos un producto a la lista de descargo múltiple.');
        return;
      }
    }

    setConfirmOpen(true);
  };

  // Process Discharge Action
  const handleProcessDischarge = () => {
    const currentProducts = getProducts();
    const movementItemsList: MovementItem[] = [];
    const parsedQty = parseFloat(String(quantity).replace(',', '.')) || 0;

    if (dischargeMode === 'SINGLE') {
      const productInDb = currentProducts.find((p) => p.id === selectedProductId);
      if (!productInDb) return;

      const currentStock = productInDb.stockByWarehouse[warehouseId] || 0;
      productInDb.stockByWarehouse[warehouseId] = Math.max(0, currentStock - parsedQty);

      // Deduct lot stock with preferred lot selection if specified
      deductLotStock(productInDb, warehouseId, parsedQty, selectedLotId || undefined);

      movementItemsList.push({
        productId: productInDb.id,
        productCode: productInDb.code,
        productName: productInDb.name,
        quantity: parsedQty,
        unit: productInDb.unit,
      });

      saveProducts(currentProducts);
    } else {
      // Process Multiple Items
      for (const item of multiItems) {
        const productInDb = currentProducts.find((p) => p.id === item.productId);
        if (productInDb) {
          const qty = Number(item.quantity);
          const currentStock = productInDb.stockByWarehouse[warehouseId] || 0;
          productInDb.stockByWarehouse[warehouseId] = Math.max(0, currentStock - qty);

          // Deduct lot stock using FIFO
          deductLotStock(productInDb, warehouseId, qty);

          movementItemsList.push({
            productId: productInDb.id,
            productCode: productInDb.code,
            productName: productInDb.name,
            quantity: qty,
            unit: productInDb.unit as any,
          });
        }
      }

      saveProducts(currentProducts);
    }

    // Record Movement History
    const newMovement: MovementRecord = {
      id: `mov-${Date.now()}`,
      movementNumber: `DSC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'DESCARGO',
      docRef: docRef.trim(),
      date: new Date().toLocaleString('es-VE'),
      responsibleUser: currentUser.username,
      sourceWarehouseId: warehouseId,
      notes: notes || `Descargo de mercancía (${dischargeMode === 'SINGLE' ? 'Único' : 'Múltiple ' + multiItems.length + ' productos'})`,
      items: movementItemsList,
    };

    addMovement(newMovement);
    showToast(
      '¡Descargo Registrado con Éxito!',
      `Se procesó el descargo N° ${newMovement.movementNumber} con doc. de ref. "${newMovement.docRef}".`,
      'success'
    );
    setConfirmOpen(false);
    onClose();
  };

  const targetWh = warehouses.find((w) => w.id === warehouseId);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-slate-950/60 backdrop-blur-xs">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-slate-950/60"
              onClick={onClose}
            />
            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative z-10 w-full max-w-3xl max-h-[88vh] sm:max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900"
            >
            {/* Header */}
            <div className="shrink-0 bg-gradient-to-r from-rose-800 via-rose-700 to-red-900 text-white p-4 sm:p-5 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs shadow-inner">
                  <ArrowUpRight className="w-6 h-6 text-rose-200" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight">Procesar Descargo (Salida de Inventario)</h2>
                  <p className="text-xs text-rose-200 font-semibold mt-0.5">
                    Salida definitiva de mercancía por consumo interno, merma o baja
                  </p>
                </div>
              </div>
            </div>

            {/* Master Mode Switcher */}
            <div className="shrink-0 bg-slate-100/90 p-2 border-b border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setDischargeMode('SINGLE')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                  dischargeMode === 'SINGLE'
                    ? 'bg-white text-rose-900 shadow-sm border border-slate-300/80 ring-1 ring-rose-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <PackageCheck className="w-4 h-4 text-rose-600" />
                <span>Descargo Único (1 Producto)</span>
              </button>

              <button
                type="button"
                onClick={() => setDischargeMode('MULTIPLE')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                  dischargeMode === 'MULTIPLE'
                    ? 'bg-white text-rose-900 shadow-sm border border-slate-300/80 ring-1 ring-rose-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Layers className="w-4 h-4 text-rose-600" />
                <span>Descargo Múltiple (Varios Productos)</span>
                {multiItems.length > 0 && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-black">
                    {multiItems.length}
                  </span>
                )}
              </button>
            </div>

            {/* Form */}
            <form ref={formRef} onSubmit={handleValidation} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0 scroll-smooth">
              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div
                    ref={errorRef}
                    key={errorMsg}
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 bg-red-50/95 border-2 border-red-400 text-red-950 rounded-2xl text-xs font-bold flex items-start gap-3 shadow-lg shadow-red-500/10 ring-2 ring-red-500/20"
                    id="descargos-error-notice"
                  >
                    <div className="p-1.5 bg-red-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-red-950 font-black text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <span>No se puede procesar el descargo</span>
                      </div>
                      <div className="text-red-800 leading-relaxed font-semibold">
                        {errorMsg}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMsg('')}
                      className="text-red-500 hover:text-red-800 p-1 hover:bg-red-200/50 rounded-lg transition-colors shrink-0"
                      title="Cerrar aviso"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Document Reference */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1 flex items-center gap-1.5 tracking-wider">
                  <Hash className="w-3.5 h-3.5 text-rose-600" />
                  <span>Documento de Referencia (Único Obligatorio)</span>
                </label>
                <input
                  type="text"
                  value={docRef}
                  onChange={(e) => setDocRef(e.target.value)}
                  placeholder="Ej: DSC-ESP-5012"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-sm text-slate-900 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-600"
                />
              </div>

              {/* Warehouse Selector */}
              <div className="bg-rose-50/50 p-4 border border-rose-200/70 rounded-2xl space-y-2">
                {dischargeMode === 'MULTIPLE' && multiItems.length > 0 && (
                  <div className="p-2.5 bg-rose-100/90 border border-rose-300 text-rose-950 rounded-xl text-xs font-black flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>
                      Almacén bloqueado para este descargo múltiple ({multiItems.length} producto(s)). Vacíe la lista si desea cambiar de almacén.
                    </span>
                  </div>
                )}
                <label className="block text-xs font-black text-rose-900 uppercase mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-rose-700" />
                  <span>Almacén para Descargo (Salida)</span>
                </label>
                <CustomSelect
                  value={warehouseId}
                  disabled={dischargeMode === 'MULTIPLE' && multiItems.length > 0}
                  onChange={(val) => {
                    setWarehouseId(val);
                    setSelectedProductId('');
                    setAddSelectedProdId('');
                    setMultiItems([]);
                    setErrorMsg('');
                  }}
                  accentColor="rose"
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: w.name,
                    badge: w.code,
                  }))}
                />
              </div>

              {/* MODE 1: SINGLE DISCHARGE */}
              {dischargeMode === 'SINGLE' ? (
                <div className="space-y-4 pt-1">
                  <ProductSearchSelect
                    label="Buscar Producto a Descargar en Almacén"
                    products={products}
                    categories={categories}
                    selectedProductId={selectedProductId}
                    onSelectProduct={(id) => setSelectedProductId(id)}
                    warehouseId={warehouseId}
                    mustHaveStock={true}
                    placeholder="Escriba código, nombre o subgrupo..."
                  />

                  {selectedProduct && (
                    <div className="space-y-4">
                      {/* Lots Breakdown Panel */}
                      {activeLotsInWh.length > 0 && (
                        <div className="p-4 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-rose-950 tracking-wider flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-rose-600" />
                              Desglose por Fecha de Vencimiento en Almacén ({warehouses.find(w => w.id === warehouseId)?.code || warehouseId})
                            </span>
                            <span className="text-[11px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                              {activeLotsInWh.length} lote(s)
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {activeLotsInWh.map((lot) => {
                              const lotQtyInWh = getLotStockInWarehouse(lot, warehouseId);
                              return (
                                <div key={lot.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-rose-200/80 text-xs shadow-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      Lote: {lot.lotNumber || 'S/N'}
                                    </span>
                                    <span className="font-extrabold text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                      📅 Vence: {lot.expirationDate || 'Sin Fecha'}
                                    </span>
                                  </div>
                                  <span className="font-black text-slate-900 text-xs">
                                    {lotQtyInWh} {selectedProduct.unit}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Specific Lot Selector */}
                          <div>
                            <label className="block text-[11px] font-bold text-rose-900 mb-1">
                              Seleccionar Lote Específico (Opcional):
                            </label>
                            <select
                              value={selectedLotId}
                              onChange={(e) => setSelectedLotId(e.target.value)}
                              disabled={ignoreLotRestrictions}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500/40 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="">Auto FIFO (Descargar del lote más próximo a vencer)</option>
                              {activeLotsInWh.map((lot) => (
                                <option key={lot.id} value={lot.id}>
                                  Lote: {lot.lotNumber || 'S/N'} — Vence: {lot.expirationDate} ({getLotStockInWarehouse(lot, warehouseId)} {selectedProduct.unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Checkbox for Free Operation / Override */}
                          <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none border-t border-rose-200/60 mt-2">
                            <input
                              type="checkbox"
                              checked={ignoreLotRestrictions}
                              onChange={(e) => {
                                setIgnoreLotRestrictions(e.target.checked);
                                if (e.target.checked) setSelectedLotId('');
                              }}
                              className="mt-0.5 w-4 h-4 text-rose-600 rounded focus:ring-rose-500 border-slate-300"
                            />
                            <div className="text-xs">
                              <span className="font-extrabold text-slate-900 block">
                                Hacer operación total sin contar fechas de vencimiento
                              </span>
                              <span className="text-slate-500 text-[11px] font-medium block leading-tight">
                                Permite descargar cualquier cantidad hasta la existencia total ({maxAvailableSingle} {selectedProduct.unit}) distribuyendo automáticamente entre lotes.
                              </span>
                            </div>
                          </label>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-black text-slate-700 uppercase">
                            Cantidad a Descargar
                          </label>
                          <span className="text-xs text-rose-900 font-black bg-rose-100 px-2.5 py-0.5 rounded-md border border-rose-300">
                            Existencia Total Almacén: {maxAvailableSingle} {selectedProduct.unit}
                          </span>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ej: 20 ó 14.50"
                            value={quantity}
                            onChange={(e) => {
                              const val = e.target.value.replace(',', '.');
                              if (val.length > 10) return;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setQuantity(val);
                              }
                            }}
                            className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const maxVal = getMaxSingleQty();
                              setQuantity(maxVal);
                            }}
                            className="absolute right-2 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs"
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* MODE 2: MULTIPLE DISCHARGE */
                <div className="space-y-4 pt-1">
                  <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-3 shadow-inner">
                    <span className="text-xs font-black uppercase text-rose-900 tracking-wider block">
                      Añadir Producto a Lista de Descargo Múltiple
                    </span>

                    <ProductSearchSelect
                      products={products}
                      categories={categories}
                      selectedProductId={addSelectedProdId}
                      onSelectProduct={(id) => {
                        setAddSelectedProdId(id);
                        const p = products.find((prod) => prod.id === id);
                        if (p?.unit) {
                          setAddUnit(p.unit as UnitOfMeasure);
                        }
                      }}
                      warehouseId={warehouseId}
                      mustHaveStock={true}
                      placeholder="Buscar producto con existencia a descargar..."
                    />

                    {/* Unit of measure selection */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 flex items-center justify-between">
                        <span>Unidad de Medida del Producto</span>
                        <span className="text-[10px] font-extrabold text-rose-950 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Lock className="w-3 h-3 text-rose-700" />
                          Unidad fija según catálogo
                        </span>
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['unidades', 'kg', 'L'] as UnitOfMeasure[]).map((u) => (
                          <button
                            key={u}
                            type="button"
                            disabled={true}
                            className={`py-1 rounded-lg text-xs font-black border transition-all ${
                              addUnit === u
                                ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            } disabled:opacity-85 cursor-not-allowed`}
                          >
                            {u === 'unidades' ? 'Unidades' : u === 'kg' ? 'Kilos (kg)' : 'Litros (L)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end pt-1">
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">
                          Cantidad a Descargar
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ej: 1"
                            value={addQuantity}
                            onChange={(e) => {
                              const val = e.target.value.replace(',', '.');
                              if (val.length > 10) return;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setAddQuantity(val);
                              }
                            }}
                            className="w-full pl-2.5 pr-14 py-1.5 bg-white border border-slate-300 rounded-lg font-black text-xs text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const addProd = availableProducts.find((p) => p.id === addSelectedProdId);
                              const maxAddAvailable = addProd ? addProd.stockByWarehouse[warehouseId] || 0 : 0;
                              setAddQuantity(maxAddAvailable);
                            }}
                            disabled={!addSelectedProdId}
                            className="absolute right-1 px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-[10px] rounded transition-all active:scale-95 cursor-pointer"
                          >
                            MAX
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddMultiItem}
                        className="w-full py-2 px-3 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-lg text-xs shadow-sm flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir al Descargo</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi Items Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-slate-700 uppercase">
                      <span>Lista de Productos a Descargar ({multiItems.length})</span>
                      {multiItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setMultiItems([])}
                          className="text-[11px] text-red-600 hover:underline font-bold"
                        >
                          Vaciar Lista
                        </button>
                      )}
                    </div>

                    {multiItems.length === 0 ? (
                      <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-xs font-bold text-slate-400">
                        No hay productos en la lista. Seleccione productos de la caja superior para añadirlos.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-white shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600 tracking-wider">
                            <tr>
                              <th className="p-2.5">Código</th>
                              <th className="p-2.5">Subgrupo / Producto</th>
                              <th className="p-2.5 text-right">Cantidad</th>
                              <th className="p-2.5 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold">
                            {multiItems.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2.5 text-rose-800 font-black">
                                  {item.productCode}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-black text-slate-900">{item.productName}</div>
                                  <div className="text-[10px] text-slate-500 uppercase font-black">
                                    {item.categoryName} • Disponible: {item.maxAvailable} {item.unit}
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-black text-rose-800">
                                  -{item.quantity} {item.unit}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMultiItem(item.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes / Reason */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Motivo / Justificación del Descargo
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Uso en elaboración interna de laboratorio / deterioro / muestra..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-gradient-to-r from-rose-700 to-red-900 hover:from-rose-800 hover:to-red-950 text-white font-black rounded-xl text-xs shadow-lg shadow-rose-700/20 transition-all active:scale-[0.98] flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {dischargeMode === 'SINGLE'
                      ? 'Procesar Descargo Único'
                      : `Procesar Descargo Múltiple (${multiItems.length})`}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleProcessDischarge}
        title="¿Confirmar Descargo de Inventario?"
        message={`¿Está seguro que desea descargar ${
          dischargeMode === 'SINGLE' ? '1 producto' : `${multiItems.length} productos`
        } del almacén "${targetWh?.name}"?`}
        type="DESCARGO"
        confirmText="Sí, Confirmar Descargo"
      />
    </>
  );
};
