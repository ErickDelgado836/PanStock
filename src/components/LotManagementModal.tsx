import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Warehouse, ProductLot, Category, ProductStock, MovementRecord } from '../types';
import { getProducts, getWarehouses, getCategories, saveProducts, getCurrentUser, addMovement } from '../services/storage';
import { formatVE } from '../utils/movementSearch';
import { ProductSearchSelect } from './Movements/ProductSearchSelect';
import { CustomSelect } from './Common/CustomSelect';
import { getLotStockMap, getLotStockInWarehouse, getLotTotalStock } from '../utils/lotUtils';
import { showToast } from '../utils/toast';
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
  const [whQuantities, setWhQuantities] = useState<Record<string, number | string>>({});
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const [partialSavePrompt, setPartialSavePrompt] = useState<{
    savedQty: number;
    totalWhQty: number;
    unassignedQty: number;
    whName: string;
  } | null>(null);

  const [lotToDeleteConfirm, setLotToDeleteConfirm] = useState<{
    lotId: string;
    lotNumber: string;
    expirationDate: string;
    isLastLot: boolean;
    productName: string;
  } | null>(null);

  const [saveConfirmPrompt, setSaveConfirmPrompt] = useState<{
    isEditing: boolean;
    lotNumber: string;
    expirationDate: string;
    quantity: number;
    productName: string;
    remainingUnassigned?: number;
    totalWarehouseStock?: number;
    warehouseName?: string;
  } | null>(null);

  const errorRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [remainingNotice, setRemainingNotice] = useState<{
    savedQty: number;
    remainingQty: number;
  } | null>(null);

  const currentWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);
  const currentProduct = products.find((p) => p.id === selectedProductId);

  // Helper to calculate max available physical stock in a specific warehouse for this lot
  const getWhMaxAvailable = (whId: string, prod: Product | undefined = currentProduct): number => {
    if (!prod) return 0;
    const physicalInWh = Number(prod.stockByWarehouse[whId] || 0);
    const assignedInOtherLotsInWh = (prod.lots || []).reduce((acc, l) => {
      if (editingLotId && l.id === editingLotId) return acc;
      return acc + getLotStockInWarehouse(l, whId);
    }, 0);
    return Math.max(0, physicalInWh - assignedInOtherLotsInWh);
  };

  // Helper to calculate total max available physical stock across ALL warehouses for the product
  const getProductMaxAvailableTotal = (prod: Product | undefined = currentProduct): number => {
    if (!prod) return 0;
    return warehouses.reduce((sum, w) => sum + getWhMaxAvailable(w.id, prod), 0);
  };

  // Auto-distribute function
  const autoDistributeQty = (targetQtyNum: number, prod: Product | undefined = currentProduct) => {
    if (!prod) return;
    const newMap: Record<string, number | string> = {};
    let remaining = Math.max(0, targetQtyNum);

    warehouses.forEach((w) => {
      const maxAvail = getWhMaxAvailable(w.id, prod);
      if (maxAvail > 0 && remaining > 0) {
        const fill = Math.min(remaining, maxAvail);
        newMap[w.id] = fill;
        remaining -= fill;
      } else {
        newMap[w.id] = 0;
      }
    });

    setWhQuantities(newMap);
  };

  const scrollToError = () => {
    requestAnimationFrame(() => {
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (bodyRef.current) {
        bodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  useEffect(() => {
    if (errorMsg) {
      scrollToError();
    }
  }, [errorMsg]);

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
      setWhQuantities({});
      setExpirationDate('');
      setNotes('');
      return;
    }

    const whLots = (targetProd.lots || []).filter(
      (l) => getLotStockInWarehouse(l, whId) > 0 || (l.warehouseId || '00') === whId
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
      const stockMap = getLotStockMap(targetLot);
      setWhQuantities(stockMap);
      const totalLotStock = getLotTotalStock(targetLot);
      setQuantity(totalLotStock > 0 ? totalLotStock : '');
      setExpirationDate(targetLot.expirationDate || '');
      setNotes(targetLot.notes || '');
    } else {
      setEditingLotId(null);
      setLotNumber('');
      const maxTotalAvail = warehouses.reduce((sum, w) => {
        const physical = Number(targetProd.stockByWarehouse[w.id] || 0);
        const assigned = (targetProd.lots || []).reduce(
          (acc, l) => acc + getLotStockInWarehouse(l, w.id),
          0
        );
        return sum + Math.max(0, physical - assigned);
      }, 0);

      setQuantity(maxTotalAvail > 0 ? maxTotalAvail : '');

      const initialMap: Record<string, number | string> = {};
      let rem = maxTotalAvail;
      warehouses.forEach((w) => {
        const physical = Number(targetProd.stockByWarehouse[w.id] || 0);
        const assigned = (targetProd.lots || []).reduce(
          (acc, l) => acc + getLotStockInWarehouse(l, w.id),
          0
        );
        const maxAvailInWh = Math.max(0, physical - assigned);
        if (maxAvailInWh > 0 && rem > 0) {
          const fill = Math.min(rem, maxAvailInWh);
          initialMap[w.id] = fill;
          rem -= fill;
        } else {
          initialMap[w.id] = 0;
        }
      });
      setWhQuantities(initialMap);

      setExpirationDate(maxTotalAvail > 0 ? (targetProd.expirationDate || '') : '');
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

  // Calculations for currently selected product & warehouse
  const totalWarehouseStock = currentProduct
    ? Number(currentProduct.stockByWarehouse[selectedWarehouseId] || 0)
    : 0;

  const productLots = currentProduct?.lots || [];
  const warehouseLots = productLots
    .filter((l) => getLotStockInWarehouse(l, selectedWarehouseId) > 0 || (l.warehouseId || '00') === selectedWarehouseId)
    .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));

  // Quantity assigned in ALL lots in THIS warehouse
  const totalAssignedAllLots = productLots.reduce(
    (acc, l) => acc + getLotStockInWarehouse(l, selectedWarehouseId),
    0
  );

  // Quantity assigned in OTHER lots in THIS warehouse (excluding currently edited lot)
  const assignedInOtherLots = productLots.reduce((acc, l) => {
    if (editingLotId && l.id === editingLotId) return acc;
    return acc + getLotStockInWarehouse(l, selectedWarehouseId);
  }, 0);

  const unassignedStock = Math.max(0, totalWarehouseStock - totalAssignedAllLots);
  const maxAvailableForCurrentLot = Math.max(0, totalWarehouseStock - assignedInOtherLots);

  const handleNewLotMode = (presetQty?: number) => {
    setEditingLotId(null);
    setLotNumber('');
    const maxTotalAvail = getProductMaxAvailableTotal();
    const available = presetQty !== undefined ? presetQty : maxTotalAvail;
    setQuantity(available > 0 ? available : '');
    autoDistributeQty(available);
    setExpirationDate('');
    setNotes('');
    setErrorMsg('');
    setSuccessMsg('');
    setRemainingNotice(null);

    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      dateInputRef.current?.focus();
      if (dateInputRef.current?.showPicker) {
        try {
          dateInputRef.current.showPicker();
        } catch (_) {}
      }
    }, 100);
  };

  const handleEditLotClick = (lot: ProductLot) => {
    setEditingLotId(lot.id);
    setLotNumber(lot.lotNumber);
    const stockMap = getLotStockMap(lot);
    setWhQuantities(stockMap);
    const totalLotStock = getLotTotalStock(lot);
    setQuantity(totalLotStock > 0 ? totalLotStock : '');
    setExpirationDate(lot.expirationDate || '');
    setNotes(lot.notes || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleDeleteLotClick = (lotId: string) => {
    if (!selectedProductId) return;
    const targetLot = productLots.find((l) => l.id === lotId);
    const isLastLot = productLots.length <= 1;
    setLotToDeleteConfirm({
      lotId,
      lotNumber: targetLot?.lotNumber || 'S/N',
      expirationDate: targetLot?.expirationDate || 'Sin Fecha',
      isLastLot,
      productName: currentProduct?.name || '',
    });
  };

  const executeDeleteLot = (lotId: string) => {
    if (!selectedProductId) return;
    const allProducts = getProducts();
    const prodIdx = allProducts.findIndex((p) => p.id === selectedProductId);
    if (prodIdx === -1) return;

    const targetProd = allProducts[prodIdx];
    if (targetProd.lots) {
      const lotToDelete = targetProd.lots.find((l) => l.id === lotId);
      targetProd.lots = targetProd.lots.filter((l) => l.id !== lotId);
      const remainingDates = targetProd.lots.map((l) => l.expirationDate).filter(Boolean).sort();
      if (remainingDates.length > 0) {
        targetProd.expirationDate = remainingDates[0];
      } else {
        delete targetProd.expirationDate;
      }
      saveProducts(allProducts);
      setProducts(allProducts);
      setSuccessMsg('Lote eliminado correctamente.');

      if (lotToDelete) {
        const user = getCurrentUser();
        const currentUser = user?.username || 'admin';
        const targetWhObj = warehouses.find((w) => w.id === selectedWarehouseId);
        const whName = targetWhObj ? `${targetWhObj.code} - ${targetWhObj.name}` : selectedWarehouseId;
        const formattedDate = formatVE(new Date());

        const delMovement: MovementRecord = {
          id: `mov-exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          movementNumber: `ED-VENC-${Math.floor(100000 + Math.random() * 900000)}`,
          type: 'EDICION_VENCIMIENTO',
          docRef: `DEL-LOTE-${lotToDelete.lotNumber || 'S/N'}`,
          date: formattedDate,
          responsibleUser: currentUser,
          sourceWarehouseId: selectedWarehouseId,
          targetWarehouseId: selectedWarehouseId,
          notes: `Se eliminó el lote "${lotToDelete.lotNumber || 'S/N'}" del producto ${targetProd.code} - ${targetProd.name}. Fecha de Vencimiento que tenía: ${lotToDelete.expirationDate || 'Sin Fecha'}. Almacén: ${whName}. Realizado por ${currentUser}.`,
          items: [
            {
              productId: targetProd.id,
              productCode: targetProd.code,
              productName: targetProd.name,
              quantity: lotToDelete.quantity || 0,
              unit: targetProd.unit,
              previousExpirationDate: lotToDelete.expirationDate || 'Sin Fecha',
              newExpirationDate: 'Eliminado',
              lotNumber: lotToDelete.lotNumber || 'S/N',
            },
          ],
        };
        addMovement(delMovement);
      }

      selectProductAndWarehouse(selectedProductId, selectedWarehouseId, allProducts);
    }
    setLotToDeleteConfirm(null);
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
    if (isNaN(numQty) || numQty <= 0) {
      setErrorMsg('La Cantidad Total del Lote debe ser un número mayor a 0.');
      return;
    }

    const maxTotalAvail = getProductMaxAvailableTotal();
    if (numQty > maxTotalAvail) {
      setErrorMsg(
        `La Cantidad Total indicada (${numQty.toLocaleString('es-ES')} u.) excede el stock físico máximo disponible (${maxTotalAvail.toLocaleString('es-ES')} u.) para este producto.`
      );
      return;
    }

    const sumWhQuantities = Object.values(whQuantities).reduce<number>(
      (acc, val) => acc + (val === '' ? 0 : Number(val) || 0),
      0
    );

    if (sumWhQuantities !== numQty) {
      setErrorMsg(
        `La suma de las cantidades repartidas por almacén (${sumWhQuantities.toLocaleString('es-ES')} u.) no coincide exactamente con la Cantidad Total del Lote (${numQty.toLocaleString('es-ES')} u.). Por favor ajuste la distribución entre almacenes para que sumen exactamente ${numQty.toLocaleString('es-ES')} u.`
      );
      return;
    }

    for (const w of warehouses) {
      const val = Number(whQuantities[w.id] || 0);
      const maxInWh = getWhMaxAvailable(w.id);
      if (val > maxInWh) {
        setErrorMsg(
          `En el almacén "${w.code} - ${w.name}" solo hay ${maxInWh.toLocaleString('es-ES')} u. físicas disponibles. No puede asignar ${val.toLocaleString('es-ES')} u.`
        );
        return;
      }
    }

    const remainingUnassigned = Math.max(0, maxTotalAvail - numQty);
    const targetWhObj = warehouses.find((w) => w.id === selectedWarehouseId);
    const whName = targetWhObj ? `${targetWhObj.code} - ${targetWhObj.name}` : selectedWarehouseId;

    setSaveConfirmPrompt({
      isEditing: Boolean(editingLotId),
      lotNumber: lotNumber.trim() || 'S/N',
      expirationDate,
      quantity: numQty,
      productName: currentProduct?.name || '',
      remainingUnassigned,
      totalWarehouseStock: maxTotalAvail,
      warehouseName: whName,
    });
  };

  const executeSaveLot = (options?: { assignRemaining?: boolean }) => {
    if (!selectedProductId || !saveConfirmPrompt) return;
    const { isEditing, lotNumber: lotName, expirationDate: expDate, quantity: numQty, remainingUnassigned } = saveConfirmPrompt;

    const allProducts = getProducts();
    const prodIdx = allProducts.findIndex((p) => p.id === selectedProductId);
    if (prodIdx === -1) return;

    const targetProd = allProducts[prodIdx];
    if (!targetProd.lots) targetProd.lots = [];

    let savedLotId = editingLotId;
    let previousExpDate = 'Sin Fecha';

    const stockMap: ProductStock = {};
    warehouses.forEach((w) => {
      const val = Number(whQuantities[w.id] || 0);
      if (val > 0) {
        stockMap[w.id] = val;
      }
    });

    if (editingLotId) {
      const existingLot = targetProd.lots.find((l) => l.id === editingLotId);
      if (existingLot && existingLot.expirationDate) {
        previousExpDate = existingLot.expirationDate;
      }
      targetProd.lots = targetProd.lots.map((l) => {
        if (l.id === editingLotId) {
          const updatedLot: ProductLot = {
            ...l,
            lotNumber: lotName,
            expirationDate: expDate,
            warehouseId: selectedWarehouseId,
            stockByWarehouse: stockMap,
            quantity: numQty,
            notes: notes.trim() || undefined,
          };
          return updatedLot;
        }
        return l;
      });
      setSuccessMsg('Lote actualizado exitosamente.');
    } else {
      if (targetProd.expirationDate) {
        previousExpDate = targetProd.expirationDate;
      }
      const newLot: ProductLot = {
        id: `lot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        lotNumber: lotName,
        quantity: numQty,
        expirationDate: expDate,
        warehouseId: selectedWarehouseId,
        stockByWarehouse: stockMap,
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
      targetProd.expirationDate = expDate;
    }

    saveProducts(allProducts);
    setProducts(allProducts);

    // Record movement for expiration date edit history
    const user = getCurrentUser();
    const currentUser = user?.username || 'admin';
    const targetWhObj = warehouses.find((w) => w.id === selectedWarehouseId);
    const whName = targetWhObj ? `${targetWhObj.code} - ${targetWhObj.name}` : selectedWarehouseId;
    const formattedDate = formatVE(new Date());

    const noteText = isEditing
      ? `Edición de Fecha de Vencimiento para el lote "${lotName}" del producto ${targetProd.code} - ${targetProd.name}. Fecha Anterior: ${previousExpDate} -> Nueva Fecha: ${expDate}. Almacén: ${whName}. Realizado por ${currentUser}.`
      : `Asignación de Fecha de Vencimiento para el lote "${lotName}" del producto ${targetProd.code} - ${targetProd.name}. Nueva Fecha: ${expDate}. Almacén: ${whName}. Realizado por ${currentUser}.`;

    const expirationMovement: MovementRecord = {
      id: `mov-exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      movementNumber: `ED-VENC-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'EDICION_VENCIMIENTO',
      docRef: `MOD-LOTE-${lotName}`,
      date: formattedDate,
      responsibleUser: currentUser,
      sourceWarehouseId: selectedWarehouseId,
      targetWarehouseId: selectedWarehouseId,
      notes: noteText,
      items: [
        {
          productId: targetProd.id,
          productCode: targetProd.code,
          productName: targetProd.name,
          quantity: numQty,
          unit: targetProd.unit,
          previousExpirationDate: previousExpDate,
          newExpirationDate: expDate,
          lotNumber: lotName,
        },
      ],
    };

    addMovement(expirationMovement);

    setSaveConfirmPrompt(null);
    setPartialSavePrompt(null);

    if (options?.assignRemaining && remainingUnassigned && remainingUnassigned > 0) {
      // Refresh list context without pre-selecting the saved lot so we stay in NEW LOT mode for remaining items
      selectProductAndWarehouse(selectedProductId, selectedWarehouseId, allProducts);
      setEditingLotId(null);
      setLotNumber('');
      setQuantity(remainingUnassigned);
      setExpirationDate('');
      setNotes('');
      setRemainingNotice({
        savedQty: numQty,
        remainingQty: remainingUnassigned,
      });
      bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        dateInputRef.current?.focus();
        if (dateInputRef.current?.showPicker) {
          try {
            dateInputRef.current.showPicker();
          } catch (_) {}
        }
      }, 150);
      showToast(
        '¡Primer Lote Guardado!',
        `Se guardó el lote de ${numQty} u. Ahora ingrese la fecha de vencimiento para las ${remainingUnassigned} u restantes.`,
        'info'
      );
    } else {
      selectProductAndWarehouse(selectedProductId, selectedWarehouseId, allProducts, savedLotId || undefined);
      setRemainingNotice(null);
      showToast(
        '¡Lote Guardado con Éxito!',
        `Se actualizó la información y vencimiento para el lote "${lotName}" (${expDate}).`,
        'success'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-red-600/20 text-red-400 rounded-2xl border border-red-500/30">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Gestión de Lotes de Vencimiento</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
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
        <div ref={bodyRef} className="p-3.5 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 scroll-smooth">
          {/* Warehouse and Product Selector Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* 1. Almacén Selector */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-red-600" />
                1. Seleccionar Almacén
              </label>
              <CustomSelect
                value={selectedWarehouseId}
                onChange={(val) => selectProductAndWarehouse(selectedProductId, val)}
                accentColor="rose"
                options={warehouses.map((w) => ({
                  value: w.id,
                  label: w.name,
                  badge: w.code,
                }))}
              />
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

              {unassignedStock > 0 ? (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Hay <strong className="font-extrabold text-amber-200">{unassignedStock} unidades</strong> sin fecha de vencimiento asignada en este almacén.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNewLotMode()}
                    className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Asignar Lote ({unassignedStock} u)</span>
                  </button>
                </div>
              ) : totalWarehouseStock > 0 ? (
                <div className="mt-3 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    El 100% de la existencia (<strong className="text-emerald-200 font-bold">{totalWarehouseStock} u.</strong>) en este almacén tiene fecha de vencimiento asignada.
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Feedback Messages */}
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
                id="lotes-error-notice"
              >
                <div className="p-1.5 bg-red-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-red-950 font-black text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>No se puede procesar el lote</span>
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

            {successMsg && (
              <motion.div
                key={successMsg}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-850 text-xs font-bold"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="flex-1">{successMsg}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMsg('')}
                  className="text-emerald-500 hover:text-emerald-800 p-1 hover:bg-emerald-200/50 rounded-lg transition-colors shrink-0"
                  title="Cerrar aviso"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2-Column Section: Form on Left, Registered Lots List on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Column */}
            <form onSubmit={handleSaveLot} className="lg:col-span-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
              {remainingNotice && (
                <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-xs shadow-xs space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 font-black text-amber-900">
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>¡Primer lote de {remainingNotice.savedQty} u. guardado!</span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-800 leading-tight">
                    Por favor, seleccione la fecha de vencimiento para las <strong>{remainingNotice.remainingQty} u. restantes</strong>:
                  </p>
                </div>
              )}

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
                    onClick={() => handleNewLotMode()}
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

              {/* 1. Cantidad Total del Lote */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="block text-xs font-black text-slate-800 uppercase">
                    1. Cantidad Total a Editar / Asignar
                  </label>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    Máx. total: <strong className="text-slate-900">{getProductMaxAvailableTotal()} {currentProduct?.unit}</strong>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val.length > 10) return;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setQuantity(val);
                        if (val !== '' && !isNaN(Number(val))) {
                          autoDistributeQty(Number(val));
                        }
                      }
                    }}
                    placeholder={`Ej: ${getProductMaxAvailableTotal()}`}
                    className="w-full sm:flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const num = quantity === '' ? getProductMaxAvailableTotal() : Number(quantity);
                      autoDistributeQty(num);
                    }}
                    className="w-full sm:w-auto px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-xs rounded-xl border border-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 shrink-0"
                    title="Repartir automáticamente según existencias"
                  >
                    <span>⚡ Auto-repartir</span>
                  </button>
                </div>
              </div>

              {/* 2. Repartición por Almacén */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="block text-xs font-black text-slate-800 uppercase">
                      2. Desglose por Almacén
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">
                      Especifique la cantidad para cada almacén
                    </span>
                  </div>

                  {(() => {
                    const targetNum: number = quantity === '' ? 0 : Number(quantity);
                    const sum = Object.values(whQuantities).reduce<number>(
                      (acc, val) => acc + (val === '' ? 0 : Number(val) || 0),
                      0
                    );
                    const isExact = sum === targetNum && targetNum > 0;
                    const isUnder = sum < targetNum && targetNum > 0;
                    const isOver = sum > targetNum && targetNum > 0;

                    if (targetNum === 0) return null;

                    if (isExact) {
                      return (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Correcto ({sum} u.)</span>
                        </span>
                      );
                    }
                    if (isUnder) {
                      return (
                        <span className="bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Faltan {targetNum - sum} u.</span>
                        </span>
                      );
                    }
                    if (isOver) {
                      return (
                        <span className="bg-red-100 text-red-950 border border-red-300 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                          <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                          <span>Sobran {sum - targetNum} u.</span>
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                  {warehouses
                    .filter((w) => getWhMaxAvailable(w.id) > 0 || (whQuantities[w.id] && Number(whQuantities[w.id]) > 0))
                    .map((w) => {
                      const maxAvail = getWhMaxAvailable(w.id);
                      const currentVal = whQuantities[w.id] !== undefined ? whQuantities[w.id] : '';
                      const numVal = currentVal === '' ? 0 : Number(currentVal);
                      const isExceeded = numVal > maxAvail;

                      return (
                        <div
                          key={w.id}
                          className={`p-2 rounded-xl border transition-all ${
                            isExceeded
                              ? 'bg-red-50 border-red-300'
                              : numVal > 0
                              ? 'bg-slate-50 border-slate-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-slate-900 bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">
                                  {w.code}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {w.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Máx. en almacén: <strong className="font-mono text-slate-800">{maxAvail} {currentProduct?.unit}</strong>
                              </span>
                            </div>

                            <div className="w-24 shrink-0">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={currentVal}
                                onChange={(e) => {
                                  const val = e.target.value.replace(',', '.');
                                  if (val.length > 8) return;
                                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    setWhQuantities((prev) => ({
                                      ...prev,
                                      [w.id]: val,
                                    }));
                                  }
                                }}
                                placeholder="0"
                                className={`w-full px-2 py-1.5 rounded-lg font-mono font-black text-xs text-right transition-all ${
                                  isExceeded
                                    ? 'bg-red-100 border-2 border-red-500 text-red-950 focus:ring-2 focus:ring-red-600'
                                    : 'bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-red-500'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Live total comparison footer */}
                <div className="flex items-center justify-between p-2 bg-slate-100 rounded-lg border border-slate-200 text-xs font-mono">
                  <span className="font-sans font-bold text-slate-600 text-[11px]">
                    Suma Almacenes:
                  </span>
                  {(() => {
                    const currentSum = Object.values(whQuantities).reduce<number>(
                      (acc, val) => acc + (val === '' ? 0 : Number(val) || 0),
                      0
                    );
                    const isMatching = quantity !== '' && Number(quantity) === currentSum && Number(quantity) > 0;
                    return (
                      <span className={`font-black ${isMatching ? 'text-emerald-700' : 'text-red-600'}`}>
                        {currentSum} / {quantity || 0} {currentProduct?.unit}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-900 mb-1">
                  3. Fecha Vencimiento *
                </label>
                <input
                  ref={dateInputRef}
                  type="date"
                  required
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-red-200 rounded-xl font-mono font-bold text-xs text-slate-900 focus:border-red-500 focus:ring-0 shadow-xs"
                />
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
              {(() => {
                const maxTotalAvail = getProductMaxAvailableTotal();
                const totalAssignedInLots = (currentProduct?.lots || []).reduce((acc, l) => acc + getLotTotalStock(l), 0);
                const unassignedTotalInProd = Math.max(0, maxTotalAvail - totalAssignedInLots);

                return (
                  <>
                    <div className="border-b border-slate-200 pb-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800 uppercase">
                          <Boxes className="w-4 h-4 text-slate-600" />
                          <span>Lotes y Vencimientos ({productLots.length})</span>
                        </div>
                        {currentWarehouse && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                            En {currentWarehouse.code}
                          </span>
                        )}
                      </div>

                      {/* Summary badges */}
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold flex-wrap">
                        <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md">
                          Físico Total: {maxTotalAvail} {currentProduct?.unit || 'u'}
                        </span>
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                          Con Vencimiento: {totalAssignedInLots} {currentProduct?.unit || 'u'}
                        </span>
                        {unassignedTotalInProd > 0 && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                            Sin Fecha: {unassignedTotalInProd} {currentProduct?.unit || 'u'}
                          </span>
                        )}
                      </div>
                    </div>

                    {productLots.length === 0 && unassignedTotalInProd === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-600">No hay existencias ni lotes registrados para este producto.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                        {/* Unassigned Stock Card if any units remain without lot/expiration */}
                        {unassignedTotalInProd > 0 && (
                          <div className="p-3 bg-amber-50/90 border-2 border-dashed border-amber-300 rounded-2xl space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>Sin Fecha de Vencimiento / Sin Lote</span>
                                </div>
                                <p className="text-[11px] font-bold text-amber-900 font-mono">
                                  {unassignedTotalInProd} {currentProduct?.unit || 'u'} sin fecha asignada
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleNewLotMode(unassignedTotalInProd)}
                                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1"
                                title="Asignar fecha de vencimiento a estas unidades"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Asignar Lote</span>
                              </button>
                            </div>

                            {/* Breakdown per warehouse for unassigned stock */}
                            <div className="pt-2 border-t border-amber-200/80">
                              <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">
                                Ubicación de unidades sin vencer:
                              </span>
                              <div className="flex flex-wrap gap-1.5 text-[10px]">
                                {warehouses.map((wh) => {
                                  const maxInWh = getWhMaxAvailable(wh.id);
                                  if (maxInWh <= 0) return null;
                                  return (
                                    <span
                                      key={wh.id}
                                      className="px-2 py-0.5 rounded-lg font-bold bg-white text-amber-950 border border-amber-300 flex items-center gap-1 font-mono"
                                    >
                                      <span>{wh.code}:</span>
                                      <strong>{maxInWh} {currentProduct?.unit || 'u'}</strong>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Registered Lots list */}
                        {productLots.map((lot) => {
                          const isBeingEdited = editingLotId === lot.id;
                          const totalLotUnits = getLotTotalStock(lot);
                          const lotWhBreakdown = warehouses
                            .map((wh) => ({
                              whId: wh.id,
                              whCode: wh.code,
                              whName: wh.name,
                              qty: getLotStockInWarehouse(lot, wh.id),
                            }))
                            .filter((b) => b.qty > 0);

                          return (
                            <div
                              key={lot.id}
                              className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                                isBeingEdited
                                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                                      Lote: {lot.lotNumber || 'S/N'}
                                    </span>
                                    <span className="font-extrabold text-xs text-red-700 font-mono">
                                      {totalLotUnits} {currentProduct?.unit || 'u'} totales
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-red-500" />
                                    <span>Vence: <strong className="font-mono text-slate-900 font-bold">{lot.expirationDate}</strong></span>
                                  </div>
                                  {lot.notes && (
                                    <p className="text-[10px] text-slate-500 italic">"{lot.notes}"</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleEditLotClick(lot)}
                                    className="p-2 text-slate-600 hover:text-amber-700 hover:bg-amber-100 rounded-xl transition-all cursor-pointer"
                                    title="Editar este lote"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLotClick(lot.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                    title="Eliminar este lote"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Breakdown per warehouse */}
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ubicación en Almacenes:</span>
                                <div className="flex flex-wrap gap-1.5 text-[10px]">
                                  {lotWhBreakdown.length === 0 ? (
                                    <span className="text-slate-400 italic">Sin cantidad en almacenes</span>
                                  ) : (
                                    lotWhBreakdown.map((b) => (
                                      <span
                                        key={b.whId}
                                        className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                                          b.whId === selectedWarehouseId
                                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                        }`}
                                      >
                                        <span className="font-mono">{b.whCode}:</span>
                                        <strong className="text-slate-900">{b.qty} {currentProduct?.unit}</strong>
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
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

      {/* Partial Save Options Prompt */}
      {partialSavePrompt && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-center space-y-5 relative">
            <button
              type="button"
              onClick={() => setPartialSavePrompt(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
              title="Atrás / Cancelar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
              <Calendar className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Lote Guardado Parcialmente
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Has asignado fecha de vencimiento a <strong className="text-slate-900 font-extrabold">{partialSavePrompt.savedQty} unidades</strong> de las <strong className="text-slate-900 font-extrabold">{partialSavePrompt.totalWhQty} unidades</strong> en <span className="font-extrabold text-slate-800">{partialSavePrompt.whName}</span>.
              </p>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Quedan <strong className="text-red-700 font-black text-sm">{partialSavePrompt.unassignedQty} unidades</strong> sin fecha de vencimiento.</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const unassigned = partialSavePrompt.unassignedQty;
                  setPartialSavePrompt(null);
                  handleNewLotMode(unassigned);
                }}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>➕ Agregar fecha a las {partialSavePrompt.unassignedQty} u restantes ahora</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartialSavePrompt(null);
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all border border-slate-200 cursor-pointer"
              >
                <span>Dejar las {partialSavePrompt.unassignedQty} u restantes sin fecha por ahora</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartialSavePrompt(null);
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-xs rounded-2xl transition-all border border-slate-200 hover:border-slate-300 cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Atrás / Cancelar (Cerrar anuncio)</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Lot Confirmation Modal */}
      {lotToDeleteConfirm && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4 relative">
            <button
              type="button"
              onClick={() => setLotToDeleteConfirm(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
              title="Cancelar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200 shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Confirmar Eliminación de Lote
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Está seguro de que desea eliminar el lote <strong className="text-slate-900 font-mono font-bold">{lotToDeleteConfirm.lotNumber}</strong> (Vence: {lotToDeleteConfirm.expirationDate}) del producto <strong className="text-slate-900 font-bold">{lotToDeleteConfirm.productName}</strong>?
              </p>
              {lotToDeleteConfirm.isLastLot && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-tight">
                    <strong className="font-black block uppercase text-[10px] text-amber-800">¡Advertencia Importante!</strong>
                    Este es el único registro de vencimiento para este producto. Al eliminarlo, ningún lote de este producto tendrá fechas de vencimiento registradas.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLotToDeleteConfirm(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all border border-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeDeleteLot(lotToDeleteConfirm.lotId)}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Lot Confirmation Modal */}
      {saveConfirmPrompt && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4 relative">
            <button
              type="button"
              onClick={() => setSaveConfirmPrompt(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
              title="Atrás / Volver (Sin guardar)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
              <Calendar className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {saveConfirmPrompt.remainingUnassigned && saveConfirmPrompt.remainingUnassigned > 0
                  ? 'Confirmar Cambios y Unidades Restantes'
                  : saveConfirmPrompt.isEditing
                  ? 'Confirmar Modificación de Lote'
                  : 'Confirmar Asignación de Lote'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Va a {saveConfirmPrompt.isEditing ? 'guardar los cambios' : 'asignar este lote'} para el producto <strong className="text-slate-900 font-bold">{saveConfirmPrompt.productName}</strong>.
              </p>

              {saveConfirmPrompt.remainingUnassigned && saveConfirmPrompt.remainingUnassigned > 0 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-left text-amber-950 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-black text-amber-800 uppercase text-[10px] tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Quedarán Unidades Sin Vencimiento</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-tight">
                    Tiene <strong className="text-red-700 font-black font-mono">{saveConfirmPrompt.remainingUnassigned} unidades</strong> restantes en <strong className="text-slate-900">{saveConfirmPrompt.warehouseName}</strong> sin fecha de vencimiento asignada.
                  </p>
                  <p className="text-xs font-extrabold text-slate-800 pt-0.5">
                    ¿Qué desea hacer con las {saveConfirmPrompt.remainingUnassigned} unidades restantes?
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Lote:</span>
                    <strong className="text-slate-900 font-bold">{saveConfirmPrompt.lotNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Fecha Vencimiento:</span>
                    <strong className="text-amber-800 font-bold">{saveConfirmPrompt.expirationDate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Cantidad en Lote:</span>
                    <strong className="text-slate-900 font-bold">{saveConfirmPrompt.quantity} u</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {saveConfirmPrompt.remainingUnassigned && saveConfirmPrompt.remainingUnassigned > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => executeSaveLot({ assignRemaining: true })}
                    className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Asignar fecha a las {saveConfirmPrompt.remainingUnassigned} u restantes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => executeSaveLot({ assignRemaining: false })}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Dejar las {saveConfirmPrompt.remainingUnassigned} u sin fecha de vencimiento
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaveConfirmPrompt(null)}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Atrás / Volver (Sin guardar cambios)</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveConfirmPrompt(null)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Atrás / Cancelar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => executeSaveLot()}
                    className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Confirmar y Guardar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
