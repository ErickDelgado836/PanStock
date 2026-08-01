import React, { useState, useEffect } from 'react';
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
  const [quantity, setQuantity] = useState<number | string>('');

  // Multiple Items State
  const [multiItems, setMultiItems] = useState<MultiTransferItem[]>([]);

  // Add Item to Multiple List State
  const [addSelectedProdId, setAddSelectedProdId] = useState('');
  const [addQuantity, setAddQuantity] = useState<number | string>('');
  const [addUnit, setAddUnit] = useState<UnitOfMeasure>('unidades');

  const [errorMsg, setErrorMsg] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      setAddSelectedProdId('');
      setQuantity('');
      setAddQuantity('');
    }
  }, [isOpen, currentUser]);

  // Products available in source warehouse
  const sourceProducts = products.filter(
    (p) => (p.stockByWarehouse[sourceWhId] || 0) > 0
  );

  const selectedProduct = sourceProducts.find((p) => p.id === selectedProductId);
  const maxAvailableSingle = selectedProduct ? selectedProduct.stockByWarehouse[sourceWhId] || 0 : 0;

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
        `La cantidad total acumulada a trasladar (${totalPlannedQty} ${prod.unit}) supera la existencia disponible en origen (${stockInSource} ${prod.unit}).`
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
          `La cantidad a trasladar (${parsedQty}) supera la existencia disponible en origen (${maxAvailableSingle} ${selectedProduct?.unit}).`
        );
        return;
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
      productInDb.stockByWarehouse[sourceWhId] = currentSourceStock - parsedQty;

      const currentTargetStock = productInDb.stockByWarehouse[targetWhId] || 0;
      productInDb.stockByWarehouse[targetWhId] = currentTargetStock + parsedQty;

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
          const currentSourceStock = productInDb.stockByWarehouse[sourceWhId] || 0;
          productInDb.stockByWarehouse[sourceWhId] = currentSourceStock - Number(item.quantity);

          const currentTargetStock = productInDb.stockByWarehouse[targetWhId] || 0;
          productInDb.stockByWarehouse[targetWhId] = currentTargetStock + Number(item.quantity);

          movementItemsList.push({
            productId: productInDb.id,
            productCode: productInDb.code,
            productName: productInDb.name,
            quantity: Number(item.quantity),
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
            <form onSubmit={handleValidation} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs font-bold flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

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
                  <select
                    value={sourceWhId}
                    disabled={transferMode === 'MULTIPLE' && multiItems.length > 0}
                    onChange={(e) => {
                      setSourceWhId(e.target.value);
                      setSelectedProductId('');
                      setAddSelectedProdId('');
                      setMultiItems([]);
                      setErrorMsg('');
                    }}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-black text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-900 uppercase mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Almacén Destino (Hacia)</span>
                  </label>
                  <select
                    value={targetWhId}
                    disabled={transferMode === 'MULTIPLE' && multiItems.length > 0}
                    onChange={(e) => {
                      setTargetWhId(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-black text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {getWarehouses().map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
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
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-black text-slate-700 uppercase">
                          Cantidad a Trasladar
                        </label>
                        <span className="text-xs text-amber-900 font-black bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                          Existencia en Origen: {maxAvailableSingle} {selectedProduct.unit}
                        </span>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ej: 20 ó 14.50"
                        value={quantity}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setQuantity(val);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600"
                      />
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
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej: 1"
                          value={addQuantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(',', '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setAddQuantity(val);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-black text-xs text-slate-900"
                        />
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
