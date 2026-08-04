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
import { transferLotStock, getLotStockInWarehouse } from '../../utils/lotUtils';
import { showToast } from '../../utils/toast';
import { CustomSelect } from '../Common/CustomSelect';
import {
  X,
  ArrowRightLeft,
  AlertCircle,
  Hash,
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  PackageCheck,
  ArrowRight,
  Lock,
  Calendar,
} from 'lucide-react';

interface TrasladosModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

interface MultiTransferItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  maxAvailable: number;
  quantity: number;
  unit: string;
}

export const TrasladosModal: React.FC<TrasladosModalProps> = ({ isOpen, onClose, currentUser }) => {
  // Master Mode: 'SINGLE' vs 'MULTIPLE'
  const [transferMode, setTransferMode] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState(getCategories());
  const [products, setProducts] = useState<Product[]>([]);

  // Fixed Source and Target Warehouses for this transaction
  const [sourceWhId, setSourceWhId] = useState('00');
  const [targetWhId, setTargetWhId] = useState('01');

  // Document Ref & Notes
  const [docRef, setDocRef] = useState('');
  const [notes, setNotes] = useState('');

  // Single Item Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [ignoreLotRestrictions, setIgnoreLotRestrictions] = useState(false);
  const [quantity, setQuantity] = useState<number | string>('');

  // Multiple Items State
  const [multiItems, setMultiItems] = useState<MultiTransferItem[]>([]);

  // Add Item to Multiple List State
  const [addSelectedProdId, setAddSelectedProdId] = useState('');
  const [addQuantity, setAddQuantity] = useState<number | string>('');
  const [addUnit, setAddUnit] = useState<UnitOfMeasure>('unidades');

  const [errorMsg, setErrorMsg] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const scrollToError = () => {
    // Immediate and next-tick scroll to ensure element is rendered
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
      setDocRef(`TRS-ESP-${Math.floor(1000 + Math.random() * 9000)}`);
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
  }, [selectedProductId, sourceWhId]);

  // Products available in source warehouse
  const sourceProducts = products.filter(
    (p) => (p.stockByWarehouse[sourceWhId] || 0) > 0
  );

  const selectedProduct = sourceProducts.find((p) => p.id === selectedProductId);
  const maxAvailableSingle = selectedProduct ? selectedProduct.stockByWarehouse[sourceWhId] || 0 : 0;

  const activeLotsInSource = selectedProduct
    ? (selectedProduct.lots || []).filter((l) => getLotStockInWarehouse(l, sourceWhId) > 0)
    : [];

  const getMaxSingleQty = () => {
    if (!selectedProduct) return 0;
    if (ignoreLotRestrictions || activeLotsInSource.length === 0) {
      return maxAvailableSingle;
    }
    if (selectedLotId) {
      const chosenLot = activeLotsInSource.find((l) => l.id === selectedLotId);
      return chosenLot ? getLotStockInWarehouse(chosenLot, sourceWhId) : 0;
    } else {
      // Auto FIFO
      const sortedLots = [...activeLotsInSource].sort((a, b) =>
        (a.expirationDate || '').localeCompare(b.expirationDate || '')
      );
      const firstLot = sortedLots[0];
      return firstLot ? getLotStockInWarehouse(firstLot, sourceWhId) : 0;
    }
  };

  // Add item to multiple list
  const handleAddMultiItem = () => {
    setErrorMsg('');

    if (sourceWhId === targetWhId) {
      setErrorMsg('El almacén de origen y destino no pueden ser el mismo.');
      return;
    }

    if (!addSelectedProdId) {
      setErrorMsg('Seleccione un producto disponible para añadir al traslado.');
      return;
    }

    const parsedAddQty = parseFloat(String(addQuantity).replace(',', '.')) || 0;
    if (parsedAddQty <= 0) {
      setErrorMsg('La cantidad a trasladar debe ser mayor a 0.');
      return;
    }

    const prod = sourceProducts.find((p) => p.id === addSelectedProdId);
    if (!prod) return;

    const stockInSource = prod.stockByWarehouse[sourceWhId] || 0;

    // Check if already in multi items list
    const existingIndex = multiItems.findIndex((item) => item.productId === prod.id);
    let totalPlannedQty = parsedAddQty;

    if (existingIndex >= 0) {
      totalPlannedQty += multiItems[existingIndex].quantity;
    }

    if (totalPlannedQty > stockInSource) {
      setErrorMsg(
        `La cantidad total acumulada a trasladar (${totalPlannedQty.toLocaleString('es-ES')} ${prod.unit}) supera la existencia disponible en origen (${stockInSource.toLocaleString('es-ES')} ${prod.unit}).`
      );
      return;
    }

    const cat = categories.find((c) => c.id === prod.categoryId);

    if (existingIndex >= 0) {
      // Update quantity
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
          maxAvailable: stockInSource,
          quantity: parsedAddQty,
          unit: addUnit || prod.unit || 'unidades',
        },
      ]);
    }

    // Reset add inputs
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

    if (sourceWhId === targetWhId) {
      setErrorMsg('El almacén de origen y destino no pueden ser el mismo.');
      return;
    }

    if (!docRef.trim()) {
      setErrorMsg('El documento de referencia es obligatorio.');
      return;
    }

    if (isDocRefDuplicate(docRef)) {
      setErrorMsg(`El documento de referencia "${docRef}" ya existe. Debe ser único.`);
      return;
    }

    if (transferMode === 'SINGLE') {
      if (!selectedProductId) {
        setErrorMsg('Seleccione el producto a trasladar.');
        return;
      }

      const parsedQty = parseFloat(String(quantity).replace(',', '.')) || 0;
      if (parsedQty <= 0) {
        setErrorMsg('La cantidad a trasladar debe ser mayor a 0.');
        return;
      }

      if (parsedQty > maxAvailableSingle) {
        setErrorMsg(
          `La cantidad a trasladar (${parsedQty.toLocaleString('es-ES')}) supera la existencia disponible en origen (${maxAvailableSingle.toLocaleString('es-ES')} ${selectedProduct?.unit}).`
        );
        return;
      }

      // Check per-lot limits if restriction is active
      if (!ignoreLotRestrictions && activeLotsInSource.length > 0) {
        if (selectedLotId) {
          const chosenLot = activeLotsInSource.find((l) => l.id === selectedLotId);
          const chosenLotQty = chosenLot ? getLotStockInWarehouse(chosenLot, sourceWhId) : 0;
          if (parsedQty > chosenLotQty) {
            setErrorMsg(
              `La cantidad a trasladar (${parsedQty.toLocaleString('es-ES')}) supera las ${chosenLotQty.toLocaleString('es-ES')} ${selectedProduct?.unit} disponibles en el lote seleccionado (Vence: ${chosenLot?.expirationDate || 'N/A'}). Si deseas abarcar más inventario de otros lotes, activa la opción 'Hacer operación total sin contar fechas de vencimiento'.`
            );
            return;
          }
        } else {
          // Auto FIFO: check if requested qty exceeds the stock of the earliest lot when multiple lots exist
          const sortedLots = [...activeLotsInSource].sort((a, b) =>
            (a.expirationDate || '').localeCompare(b.expirationDate || '')
          );
          const firstLot = sortedLots[0];
          const firstLotQty = firstLot ? getLotStockInWarehouse(firstLot, sourceWhId) : 0;
          if (parsedQty > firstLotQty && activeLotsInSource.length > 1) {
            setErrorMsg(
              `La cantidad a trasladar (${parsedQty.toLocaleString('es-ES')}) abarca más de un lote con distinta fecha de vencimiento. El lote más próximo a vencer (${firstLot?.lotNumber || 'S/N'}, Exp: ${firstLot?.expirationDate}) sólo cuenta con ${firstLotQty.toLocaleString('es-ES')} ${selectedProduct?.unit}. Si deseas realizar el traslado total abarcando múltiples lotes, marca la casilla 'Hacer operación total sin contar fechas de vencimiento'.`
            );
            return;
          }
        }
      }
    } else {
      if (multiItems.length === 0) {
        setErrorMsg('Debe añadir al menos un producto a la lista de traslado múltiple.');
        return;
      }
    }

    setConfirmOpen(true);
  };

  // Process Transfer Action
  const handleProcessTransfer = () => {
    const currentProducts = getProducts();
    const movementItemsList: MovementItem[] = [];
    const parsedQty = parseFloat(String(quantity).replace(',', '.')) || 0;

    if (transferMode === 'SINGLE') {
      const productInDb = currentProducts.find((p) => p.id === selectedProductId);
      if (!productInDb) return;

      const currentSourceStock = productInDb.stockByWarehouse[sourceWhId] || 0;
      productInDb.stockByWarehouse[sourceWhId] = Math.max(0, currentSourceStock - parsedQty);

      const currentTargetStock = productInDb.stockByWarehouse[targetWhId] || 0;
      productInDb.stockByWarehouse[targetWhId] = currentTargetStock + parsedQty;

      // Transfer lot stock from source to target warehouse with preferred lot selection if specified
      transferLotStock(productInDb, sourceWhId, targetWhId, parsedQty, selectedLotId || undefined);

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
          const currentSourceStock = productInDb.stockByWarehouse[sourceWhId] || 0;
          productInDb.stockByWarehouse[sourceWhId] = Math.max(0, currentSourceStock - qty);

          const currentTargetStock = productInDb.stockByWarehouse[targetWhId] || 0;
          productInDb.stockByWarehouse[targetWhId] = currentTargetStock + qty;

          // Transfer lot stock from source to target warehouse
          transferLotStock(productInDb, sourceWhId, targetWhId, qty);

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
      movementNumber: `TRS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'TRASLADO',
      docRef: docRef.trim(),
      date: new Date().toLocaleString('es-VE'),
      responsibleUser: currentUser.username,
      sourceWarehouseId: sourceWhId,
      targetWarehouseId: targetWhId,
      notes: notes || `Traslado de inventario (${transferMode === 'SINGLE' ? 'Único' : 'Múltiple ' + multiItems.length + ' productos'})`,
      items: movementItemsList,
    };

    addMovement(newMovement);
    showToast(
      '¡Traslado Registrado con Éxito!',
      `Se completó la transferencia N° ${newMovement.movementNumber} con doc. de ref. "${newMovement.docRef}".`,
      'success'
    );
    setConfirmOpen(false);
    onClose();
  };

  const allWarehouses = getWarehouses();
  const sourceWh = allWarehouses.find((w) => w.id === sourceWhId);
  const targetWh = allWarehouses.find((w) => w.id === targetWhId);

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
            <div className="shrink-0 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white p-4 sm:p-5 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs shadow-inner">
                  <ArrowRightLeft className="w-6 h-6 text-amber-200" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight">Procesar Traslado de Inventario</h2>
                  <p className="text-xs text-amber-100 font-semibold mt-0.5">
                    Mover productos entre almacenes internos
                  </p>
                </div>
              </div>
            </div>

            {/* Master Mode Switcher */}
            <div className="shrink-0 bg-slate-100/90 p-2 border-b border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setTransferMode('SINGLE')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                  transferMode === 'SINGLE'
                    ? 'bg-white text-amber-900 shadow-sm border border-slate-300/80 ring-1 ring-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <PackageCheck className="w-4 h-4 text-amber-600" />
                <span>Traslado Único (1 Producto)</span>
              </button>

              <button
                type="button"
                onClick={() => setTransferMode('MULTIPLE')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                  transferMode === 'MULTIPLE'
                    ? 'bg-white text-amber-900 shadow-sm border border-slate-300/80 ring-1 ring-amber-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Traslado Múltiple (Varios Productos)</span>
                {multiItems.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-600 text-white rounded-full text-[10px] font-black">
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
                    id="traslados-error-notice"
                  >
                    <div className="p-1.5 bg-red-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-red-950 font-black text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <span>No se puede procesar la operación</span>
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
                  <Hash className="w-3.5 h-3.5 text-amber-600" />
                  <span>Documento de Referencia (Único Obligatorio)</span>
                </label>
                <input
                  type="text"
                  value={docRef}
                  onChange={(e) => setDocRef(e.target.value)}
                  placeholder="Ej: TRS-ESP-8812"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-sm text-slate-900 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600"
                />
              </div>

              {/* Warehouses Selector (Source & Target) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/50 p-4 border border-amber-200/70 rounded-2xl">
                {transferMode === 'MULTIPLE' && multiItems.length > 0 && (
                  <div className="sm:col-span-2 p-2.5 bg-amber-100/90 border border-amber-300 text-amber-950 rounded-xl text-xs font-black flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Almacenes bloqueados para este traslado múltiple ({multiItems.length} producto(s)). Vacíe la lista si desea cambiar de almacén de origen o destino.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-amber-900 uppercase mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Almacén Origen (Desde)</span>
                  </label>
                  <CustomSelect
                    value={sourceWhId}
                    disabled={transferMode === 'MULTIPLE' && multiItems.length > 0}
                    onChange={(val) => {
                      setSourceWhId(val);
                      setSelectedProductId('');
                      setAddSelectedProdId('');
                      setMultiItems([]);
                      setErrorMsg('');
                    }}
                    accentColor="amber"
                    options={warehouses.map((w) => ({
                      value: w.id,
                      label: w.name,
                      badge: w.code,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-900 uppercase mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Almacén Destino (Hacia)</span>
                  </label>
                  <CustomSelect
                    value={targetWhId}
                    disabled={transferMode === 'MULTIPLE' && multiItems.length > 0}
                    onChange={(val) => {
                      setTargetWhId(val);
                      setErrorMsg('');
                    }}
                    accentColor="amber"
                    options={warehouses.map((w) => ({
                      value: w.id,
                      label: w.name,
                      badge: w.code,
                    }))}
                  />
                </div>
              </div>

              {/* MODE 1: SINGLE TRANSFER */}
              {transferMode === 'SINGLE' ? (
                <div className="space-y-4 pt-1">
                  <ProductSearchSelect
                    label="Buscar Producto Disponible en Almacén Origen"
                    products={products}
                    categories={categories}
                    selectedProductId={selectedProductId}
                    onSelectProduct={(id) => setSelectedProductId(id)}
                    warehouseId={sourceWhId}
                    mustHaveStock={true}
                    placeholder="Escriba código, nombre o subgrupo del producto a trasladar..."
                  />

                  {selectedProduct && (
                    <div className="space-y-4">
                      {/* Lots Breakdown Panel */}
                      {activeLotsInSource.length > 0 && (
                        <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-600" />
                              Desglose por Fecha de Vencimiento en Origen ({warehouses.find(w => w.id === sourceWhId)?.code || sourceWhId})
                            </span>
                            <span className="text-[11px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                              {activeLotsInSource.length} lote(s)
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {activeLotsInSource.map((lot) => {
                              const lotQtyInWh = getLotStockInWarehouse(lot, sourceWhId);
                              return (
                                <div key={lot.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white rounded-xl border border-amber-200/80 text-xs gap-2 sm:gap-4 shadow-xs">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      Lote: {lot.lotNumber || 'S/N'}
                                    </span>
                                    <span className="font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 whitespace-nowrap">
                                      📅 Vence: {lot.expirationDate || 'Sin Fecha'}
                                    </span>
                                  </div>
                                  <span className="font-black text-amber-950 text-xs bg-amber-50/70 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg border border-amber-100 sm:border-transparent self-start sm:self-center">
                                    {lotQtyInWh} {selectedProduct.unit}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Specific Lot Selector */}
                          <div>
                            <label className="block text-[11px] font-bold text-amber-900 mb-1">
                              Seleccionar Lote Específico (Opcional):
                            </label>
                            <select
                              value={selectedLotId}
                              onChange={(e) => setSelectedLotId(e.target.value)}
                              disabled={ignoreLotRestrictions}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/40 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="">Auto FIFO (Transferir del lote más próximo a vencer)</option>
                              {activeLotsInSource.map((lot) => (
                                <option key={lot.id} value={lot.id}>
                                  Lote: {lot.lotNumber || 'S/N'} — Vence: {lot.expirationDate} ({getLotStockInWarehouse(lot, sourceWhId)} {selectedProduct.unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Checkbox for Free Operation / Override */}
                          <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none border-t border-amber-200/60 mt-2">
                            <input
                              type="checkbox"
                              checked={ignoreLotRestrictions}
                              onChange={(e) => {
                                setIgnoreLotRestrictions(e.target.checked);
                                if (e.target.checked) setSelectedLotId('');
                              }}
                              className="mt-0.5 w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-slate-300"
                            />
                            <div className="text-xs">
                              <span className="font-extrabold text-slate-900 block">
                                Hacer operación total sin contar fechas de vencimiento
                              </span>
                              <span className="text-slate-500 text-[11px] font-medium block leading-tight">
                                Permite trasladar cualquier cantidad hasta la existencia total ({maxAvailableSingle} {selectedProduct.unit}) distribuyendo automáticamente entre lotes.
                              </span>
                            </div>
                          </label>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-black text-slate-700 uppercase">
                            Cantidad a Trasladar
                          </label>
                          <span className="text-xs text-amber-900 font-black bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                            Existencia Total Origen: {maxAvailableSingle} {selectedProduct.unit}
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
                            className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const maxVal = getMaxSingleQty();
                              setQuantity(maxVal);
                            }}
                            className="absolute right-2 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs"
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* MODE 2: MULTIPLE TRANSFER */
                <div className="space-y-4 pt-1">
                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3 shadow-inner">
                    <span className="text-xs font-black uppercase text-amber-900 tracking-wider block">
                      Añadir Producto a Lista de Traslado Múltiple
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
                      warehouseId={sourceWhId}
                      mustHaveStock={true}
                      placeholder="Buscar producto con existencia en origen..."
                    />

                    {/* Unit of measure selection */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 flex items-center justify-between">
                        <span>Unidad de Medida del Producto</span>
                        <span className="text-[10px] font-extrabold text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-700" />
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
                                ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
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
                          Cantidad a Trasladar
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
                              const addProd = sourceProducts.find((p) => p.id === addSelectedProdId);
                              const maxAddAvailable = addProd ? addProd.stockByWarehouse[sourceWhId] || 0 : 0;
                              setAddQuantity(maxAddAvailable);
                            }}
                            disabled={!addSelectedProdId}
                            className="absolute right-1 px-1.5 py-0.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-[10px] rounded transition-all active:scale-95 cursor-pointer"
                          >
                            MAX
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddMultiItem}
                        className="w-full py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white font-black rounded-lg text-xs shadow-sm flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir al Traslado</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi Items Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-slate-700 uppercase">
                      <span>Lista de Productos a Trasladar ({multiItems.length})</span>
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
                                <td className="p-2.5 text-amber-800 font-black">
                                  {item.productCode}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-black text-slate-900">{item.productName}</div>
                                  <div className="text-[10px] text-slate-500 uppercase font-black">
                                    {item.categoryName} • Disponible: {item.maxAvailable} {item.unit}
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-black text-amber-800">
                                  {item.quantity} {item.unit}
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

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Nota / Justificación del Traslado
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Motivo del movimiento entre almacenes..."
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
                  className="px-7 py-2.5 bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-black rounded-xl text-xs shadow-lg shadow-amber-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {transferMode === 'SINGLE'
                      ? 'Procesar Traslado Único'
                      : `Procesar Traslado Múltiple (${multiItems.length})`}
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
        onConfirm={handleProcessTransfer}
        title="¿Confirmar Traslado de Inventario?"
        message={`¿Está seguro que desea realizar este traslado de ${
          transferMode === 'SINGLE' ? '1 producto' : `${multiItems.length} productos`
        } desde el almacén "${sourceWh?.name}" hacia "${targetWh?.name}"?`}
        type="TRASLADO"
        confirmText="Sí, Confirmar Traslado"
      />
    </>
  );
};
