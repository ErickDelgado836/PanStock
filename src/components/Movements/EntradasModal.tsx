import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, UnitOfMeasure, UserProfile, MovementRecord, MovementItem } from '../../types';
import {
  getCategories,
  getProducts,
  addProduct,
  saveProducts,
  addMovement,
  isDocRefDuplicate,
  isProductCodeDuplicate,
  isProductNameDuplicate,
} from '../../services/storage';
import { ConfirmationModal } from '../ConfirmationModal';
import { ProductSearchSelect } from './ProductSearchSelect';
import { addLotStockOnEntry } from '../../utils/lotUtils';
import { showToast } from '../../utils/toast';
import { CustomSelect } from '../Common/CustomSelect';
import {
  X,
  ArrowDownLeft,
  AlertCircle,
  Plus,
  PackageCheck,
  Hash,
  Trash2,
  ListPlus,
  CheckCircle2,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';

interface EntradasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

interface MultiEntryItem {
  id: string; // temp id
  productId?: string;
  isNewProduct: boolean;
  productCode: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unit: UnitOfMeasure;
  lotNumber?: string;
  expirationDate?: string;
}

export const EntradasModal: React.FC<EntradasModalProps> = ({ isOpen, onClose, currentUser }) => {
  // Master mode: 'SINGLE' vs 'MULTIPLE'
  const [entryMode, setEntryMode] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');

  // Single mode type: 'EXISTING' vs 'NEW'
  const [singleType, setSingleType] = useState<'EXISTING' | 'NEW'>('EXISTING');

  const [categories, setCategories] = useState(getCategories());
  const [products, setProducts] = useState(getProducts());

  // Shared Doc Ref & Notes
  const [docRef, setDocRef] = useState('');
  const [notes, setNotes] = useState('');

  // Single Item Form Fields
  const [selectedProductId, setSelectedProductId] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [codeSuffix, setCodeSuffix] = useState('');
  const [productName, setProductName] = useState('');
  const [unit, setUnit] = useState<UnitOfMeasure>('unidades');
  const [quantity, setQuantity] = useState<number | string>('');
  const [expirationDate, setExpirationDate] = useState('');
  const [lotNumber, setLotNumber] = useState('');

  // Multiple Mode State: Table of Items
  const [multiItems, setMultiItems] = useState<MultiEntryItem[]>([]);

  // Add Item to Multiple List Form Fields
  const [addItemType, setAddItemType] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [addSelectedProdId, setAddSelectedProdId] = useState('');
  const [addCategoryId, setAddCategoryId] = useState(categories[0]?.id || '');
  const [addCodeSuffix, setAddCodeSuffix] = useState('');
  const [addProductName, setAddProductName] = useState('');
  const [addUnit, setAddUnit] = useState<UnitOfMeasure>('unidades');
  const [addQuantity, setAddQuantity] = useState<number | string>('');
  const [addExpirationDate, setAddExpirationDate] = useState('');
  const [addLotNumber, setAddLotNumber] = useState('');

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
      const cats = getCategories();
      setCategories(cats);
      setProducts(getProducts());
      if (cats.length > 0) {
        setCategoryId(cats[0].id);
        setAddCategoryId(cats[0].id);
      }
      setDocRef(`FAC-ESP-${Math.floor(1000 + Math.random() * 9000)}`);
      setErrorMsg('');
      setMultiItems([]);
      setSelectedProductId('');
      setAddSelectedProdId('');
      setQuantity('');
      setAddQuantity('');
      setLotNumber('');
      setExpirationDate('');
    }
  }, [isOpen]);

  const selectedCat = categories.find((c) => c.id === categoryId) || categories[0];
  const fullCode = selectedCat ? `${selectedCat.codePrefix}-${codeSuffix.trim()}` : codeSuffix;
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const addSelectedCat = categories.find((c) => c.id === addCategoryId) || categories[0];
  const addFullCode = addSelectedCat ? `${addSelectedCat.codePrefix}-${addCodeSuffix.trim()}` : addCodeSuffix;

  // Add Item to Multiple Entry Table
  const handleAddMultiItem = () => {
    setErrorMsg('');

    const parsedAddQty = parseFloat(String(addQuantity).replace(',', '.')) || 0;
    if (parsedAddQty <= 0) {
      setErrorMsg('La cantidad a ingresar debe ser mayor a 0.');
      return;
    }

    if (addItemType === 'EXISTING') {
      if (!addSelectedProdId) {
        setErrorMsg('Seleccione un producto existente para añadir a la lista.');
        return;
      }
      const prod = products.find((p) => p.id === addSelectedProdId);
      if (!prod) return;

      const cat = categories.find((c) => c.id === prod.categoryId);

      // Check if already in list
      const existsInList = multiItems.some((item) => item.productId === prod.id);
      if (existsInList) {
        setErrorMsg(`El producto "${prod.name}" ya se encuentra en la lista de entradas.`);
        return;
      }

      setMultiItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random()}`,
          productId: prod.id,
          isNewProduct: false,
          productCode: prod.code,
          productName: prod.name,
          categoryId: prod.categoryId,
          categoryName: cat ? cat.name : 'GENERAL',
          quantity: parsedAddQty,
          unit: addUnit || prod.unit || 'unidades',
          lotNumber: addLotNumber.trim(),
          expirationDate: addExpirationDate,
        },
      ]);

      // Reset add form
      setAddSelectedProdId('');
      setAddQuantity('');
      setAddLotNumber('');
      setAddExpirationDate('');
    } else {
      if (!addCodeSuffix.trim()) {
        setErrorMsg('Ingrese el número o código del nuevo producto.');
        return;
      }
      if (addCodeSuffix.trim().length > 6) {
        setErrorMsg('El código del producto no puede tener más de 6 dígitos/caracteres.');
        return;
      }
      if (!addProductName.trim()) {
        setErrorMsg('Ingrese la descripción del nuevo producto.');
        return;
      }

      // Check against existing products in database (scoped by category)
      if (isProductCodeDuplicate(addFullCode, addCategoryId)) {
        setErrorMsg(`El código "${addFullCode}" ya existe en la categoría "${addSelectedCat?.name}".`);
        return;
      }
      if (isProductNameDuplicate(addProductName, addCategoryId)) {
        setErrorMsg(`El producto "${addProductName}" ya está registrado en la categoría "${addSelectedCat?.name}".`);
        return;
      }

      // Check against items already added in current multi-entry list
      const codeExistsInMulti = multiItems.some(
        (i) => i.categoryId === addCategoryId && i.productCode.toLowerCase() === addFullCode.toLowerCase()
      );
      if (codeExistsInMulti) {
        setErrorMsg(`El código "${addFullCode}" ya se encuentra añadido en la lista de esta entrada.`);
        return;
      }

      const nameExistsInMulti = multiItems.some(
        (i) => i.categoryId === addCategoryId && i.productName.toLowerCase() === addProductName.trim().toLowerCase()
      );
      if (nameExistsInMulti) {
        setErrorMsg(`El producto "${addProductName}" ya se encuentra añadido en la lista de esta entrada.`);
        return;
      }

      setMultiItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random()}`,
          isNewProduct: true,
          productCode: addFullCode,
          productName: addProductName.trim(),
          categoryId: addCategoryId,
          categoryName: addSelectedCat ? addSelectedCat.name : 'GENERAL',
          quantity: parsedAddQty,
          unit: addUnit,
          lotNumber: addLotNumber.trim(),
          expirationDate: addExpirationDate,
        },
      ]);

      // Reset add form
      setAddCodeSuffix('');
      setAddProductName('');
      setAddQuantity('');
      setAddLotNumber('');
      setAddExpirationDate('');
    }
  };

  const handleRemoveMultiItem = (id: string) => {
    setMultiItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Validation Before Confirmation
  const handleValidation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!docRef.trim()) {
      setErrorMsg('El documento de referencia es obligatorio.');
      return;
    }

    if (isDocRefDuplicate(docRef)) {
      setErrorMsg(`El documento de referencia "${docRef}" ya existe en el sistema. Debe ser único.`);
      return;
    }

    if (entryMode === 'SINGLE') {
      const parsedQty = parseFloat(String(quantity).replace(',', '.')) || 0;
      if (parsedQty <= 0) {
        setErrorMsg('La cantidad a ingresar debe ser mayor a 0.');
        return;
      }

      if (singleType === 'EXISTING') {
        if (!selectedProductId) {
          setErrorMsg('Seleccione el producto al cual dará ingreso.');
          return;
        }
      } else {
        if (!codeSuffix.trim()) {
          setErrorMsg('Ingrese el número o código del producto.');
          return;
        }
        if (codeSuffix.trim().length > 6) {
          setErrorMsg('El código del producto no puede tener más de 6 dígitos/caracteres.');
          return;
        }
        if (!productName.trim()) {
          setErrorMsg('Ingrese la descripción / nombre del producto.');
          return;
        }
        if (isProductCodeDuplicate(fullCode, categoryId)) {
          setErrorMsg(`El código de producto "${fullCode}" ya existe en la categoría "${selectedCat?.name}".`);
          return;
        }
        if (isProductNameDuplicate(productName, categoryId)) {
          setErrorMsg(`El producto "${productName}" ya está registrado en la categoría "${selectedCat?.name}".`);
          return;
        }
      }
    } else {
      // Multiple mode check
      if (multiItems.length === 0) {
        setErrorMsg('Debe añadir al menos un producto a la lista de entrada múltiple.');
        return;
      }
    }

    setConfirmOpen(true);
  };

  // Process Entry Action
  const handleProcessEntry = () => {
    const currentProducts = getProducts();
    const movementItemsList: MovementItem[] = [];
    const parsedQty = parseFloat(String(quantity).replace(',', '.')) || 0;

    if (entryMode === 'SINGLE') {
      let targetProduct: Product;

      if (singleType === 'EXISTING') {
        const found = currentProducts.find((p) => p.id === selectedProductId);
        if (!found) return;

        const currentStock00 = found.stockByWarehouse['00'] || 0;
        found.stockByWarehouse['00'] = currentStock00 + parsedQty;

        addLotStockOnEntry(
          found,
          '00',
          parsedQty,
          lotNumber,
          expirationDate,
          notes
        );

        targetProduct = found;
      } else {
        targetProduct = {
          id: `prod-${Date.now()}`,
          code: fullCode,
          name: productName.trim(),
          categoryId: categoryId,
          unit: unit,
          stockByWarehouse: {
            '00': parsedQty,
          },
          expirationDate: expirationDate || undefined,
          lots: [],
          entryDate: new Date().toISOString().split('T')[0],
          notes: notes,
        };
        addLotStockOnEntry(
          targetProduct,
          '00',
          parsedQty,
          lotNumber,
          expirationDate,
          notes
        );
        currentProducts.push(targetProduct);
      }

      movementItemsList.push({
        productId: targetProduct.id,
        productCode: targetProduct.code,
        productName: targetProduct.name,
        quantity: parsedQty,
        unit: targetProduct.unit,
      });

      saveProducts(currentProducts);
    } else {
      // Process Multiple Items
      for (const item of multiItems) {
        if (!item.isNewProduct && item.productId) {
          const found = currentProducts.find((p) => p.id === item.productId);
          if (found) {
            const currentStock00 = found.stockByWarehouse['00'] || 0;
            found.stockByWarehouse['00'] = currentStock00 + Number(item.quantity);

            addLotStockOnEntry(
              found,
              '00',
              Number(item.quantity),
              item.lotNumber,
              item.expirationDate,
              notes
            );

            movementItemsList.push({
              productId: found.id,
              productCode: found.code,
              productName: found.name,
              quantity: Number(item.quantity),
              unit: found.unit,
            });
          }
        } else {
          // New product in multi-entry
          const newProd: Product = {
            id: `prod-${Date.now()}-${Math.random()}`,
            code: item.productCode,
            name: item.productName,
            categoryId: item.categoryId,
            unit: item.unit,
            stockByWarehouse: {
              '00': Number(item.quantity),
            },
            expirationDate: item.expirationDate || undefined,
            lots: [],
            entryDate: new Date().toISOString().split('T')[0],
            notes: notes,
          };
          addLotStockOnEntry(
            newProd,
            '00',
            Number(item.quantity),
            item.lotNumber,
            item.expirationDate,
            notes
          );
          currentProducts.push(newProd);

          movementItemsList.push({
            productId: newProd.id,
            productCode: newProd.code,
            productName: newProd.name,
            quantity: Number(item.quantity),
            unit: newProd.unit,
          });
        }
      }

      saveProducts(currentProducts);
    }

    // Record Movement History
    const newMovement: MovementRecord = {
      id: `mov-${Date.now()}`,
      movementNumber: `ENT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'ENTRADA',
      docRef: docRef.trim(),
      date: new Date().toLocaleString('es-VE'),
      responsibleUser: currentUser.username,
      targetWarehouseId: '00', // Main entry warehouse
      notes: notes || `Ingreso de mercancía (${entryMode === 'SINGLE' ? 'Único' : 'Múltiple ' + multiItems.length + ' productos'})`,
      items: movementItemsList,
    };

    addMovement(newMovement);
    showToast(
      '¡Ingreso Registrado con Éxito!',
      `Se registró correctamente el movimiento ${newMovement.movementNumber} con doc. de ref. "${newMovement.docRef}".`,
      'success'
    );
    setConfirmOpen(false);
    onClose();
  };

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
            {/* Header Bar */}
            <div className="shrink-0 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs shadow-inner">
                  <ArrowDownLeft className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight">Procesar Entrada de Mercancía (Ingreso)</h2>
                  <p className="text-xs text-emerald-100 font-semibold mt-0.5">
                    Destino asignado: <strong className="text-amber-300">00 Almacén de Distribución Interna</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Master Mode Switcher: SINGLE vs MULTIPLE */}
            <div className="shrink-0 bg-slate-100/90 p-2 border-b border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setEntryMode('SINGLE')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                  entryMode === 'SINGLE'
                    ? 'bg-white text-emerald-800 shadow-sm border border-slate-300/80 ring-1 ring-emerald-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <span>Entrada Única (1 Producto)</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryMode('MULTIPLE')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                  entryMode === 'MULTIPLE'
                    ? 'bg-white text-emerald-800 shadow-sm border border-slate-300/80 ring-1 ring-emerald-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Entrada Múltiple (Varios Productos)</span>
                {multiItems.length > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-black">
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
                    id="entradas-error-notice"
                  >
                    <div className="p-1.5 bg-red-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-red-950 font-black text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <span>No se puede procesar la entrada</span>
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

              {/* Document Reference Field */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1 flex items-center gap-1.5 tracking-wider">
                  <Hash className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Documento de Referencia (Único Obligatorio)</span>
                </label>
                <input
                  type="text"
                  value={docRef}
                  onChange={(e) => setDocRef(e.target.value)}
                  placeholder="Ej: FAC-ESP-1092"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600"
                />
              </div>

              {/* MODE 1: SINGLE ENTRY */}
              {entryMode === 'SINGLE' ? (
                <div className="space-y-4 pt-1">
                  {/* Single Type Toggle */}
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSingleType('EXISTING')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                        singleType === 'EXISTING'
                          ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Producto Existente
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleType('NEW')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                        singleType === 'NEW'
                          ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      + Registrar Producto Nuevo
                    </button>
                  </div>

                  {singleType === 'EXISTING' ? (
                    <div>
                      <ProductSearchSelect
                        label="Buscar y Seleccionar Producto Existente"
                        products={products}
                        categories={categories}
                        selectedProductId={selectedProductId}
                        onSelectProduct={(id) => {
                          setSelectedProductId(id);
                          const p = products.find((prod) => prod.id === id);
                          if (p?.unit) {
                            setUnit(p.unit);
                          }
                        }}
                        warehouseId="00"
                        placeholder="Escriba código, nombre o subgrupo..."
                      />
                      {selectedProduct && (
                        <div className="mt-2.5 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Unidad de Medida del Producto:</span>
                          <span className="text-xs font-black px-2.5 py-1 bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs">
                            <Lock className="w-3.5 h-3.5 text-emerald-200" />
                            {selectedProduct.unit === 'unidades' ? 'Unidades (unid)' : selectedProduct.unit === 'kg' ? 'Kilos (kg)' : 'Litros (L)'} (Bloqueada)
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">
                            Categoría / Subgrupo
                          </label>
                          <CustomSelect
                            value={categoryId}
                            onChange={setCategoryId}
                            accentColor="emerald"
                            options={categories.map((c) => ({
                              value: c.id,
                              label: c.name,
                              badge: c.codePrefix,
                              sublabel: `Prefijo "${c.codePrefix}"`,
                            }))}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-600 uppercase mb-1 flex items-center justify-between">
                            <span>Código del Producto</span>
                            <span className="text-[10px] text-slate-400 font-normal">Máx 6 dígitos</span>
                          </label>
                          <div className="flex items-center">
                            <span className="px-3 py-2 bg-slate-200 border border-r-0 border-slate-300 rounded-l-xl font-black text-xs text-slate-800 shrink-0">
                              {selectedCat ? selectedCat.codePrefix : ''}-
                            </span>
                            <input
                              type="text"
                              maxLength={6}
                              value={codeSuffix}
                              onChange={(e) => setCodeSuffix(e.target.value.replace(/\s+/g, '').slice(0, 6))}
                              placeholder="001"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-r-xl font-bold text-xs text-slate-900"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">
                          Descripción / Nombre del Producto
                        </label>
                        <input
                          type="text"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder="Ej: Salsa de Tomate Especial 1kg"
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-extrabold text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">
                          Unidad de Medida
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['unidades', 'kg', 'L'] as UnitOfMeasure[]).map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setUnit(u)}
                              className={`py-1.5 rounded-xl text-xs font-black border transition-all ${
                                unit === u
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {u === 'unidades' ? 'Unidades' : u === 'kg' ? 'Kilos (kg)' : 'Litros (L)'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quantity & Expiration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Cantidad a Ingresar
                      </label>
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
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Lote (Opcional)
                      </label>
                      <input
                        type="text"
                        value={lotNumber}
                        onChange={(e) => setLotNumber(e.target.value)}
                        placeholder="Ej: LOTE-A12"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Vencimiento (Opcional)
                      </label>
                      <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* MODE 2: MULTIPLE ENTRY */
                <div className="space-y-4 pt-1">
                  {/* Add Item Box */}
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1.5">
                        <ListPlus className="w-4 h-4 text-emerald-700" />
                        Añadir Producto a la Lista de Entrada Múltiple
                      </span>

                      <div className="flex gap-1.5 text-[11px] font-black">
                        <button
                          type="button"
                          onClick={() => {
                            setAddItemType('EXISTING');
                            if (addSelectedProdId) {
                              const p = products.find((prod) => prod.id === addSelectedProdId);
                              if (p?.unit) setAddUnit(p.unit);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg border transition-all ${
                            addItemType === 'EXISTING'
                              ? 'bg-emerald-700 text-white border-emerald-800'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          Existente
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddItemType('NEW')}
                          className={`px-2.5 py-1 rounded-lg border transition-all ${
                            addItemType === 'NEW'
                              ? 'bg-emerald-700 text-white border-emerald-800'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          + Nuevo
                        </button>
                      </div>
                    </div>

                    {addItemType === 'EXISTING' ? (
                      <ProductSearchSelect
                        products={products}
                        categories={categories}
                        selectedProductId={addSelectedProdId}
                        onSelectProduct={(id) => {
                          setAddSelectedProdId(id);
                          const p = products.find((prod) => prod.id === id);
                          if (p?.unit) {
                            setAddUnit(p.unit);
                          }
                        }}
                        warehouseId="00"
                        placeholder="Buscar producto a ingresar..."
                      />
                    ) : (
                      <div className="space-y-2.5 bg-white p-3 border border-emerald-200 rounded-xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Categoría</label>
                            <CustomSelect
                              value={addCategoryId}
                              onChange={setAddCategoryId}
                              accentColor="emerald"
                              options={categories.map((c) => ({
                                value: c.id,
                                label: c.name,
                                badge: c.codePrefix,
                              }))}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center justify-between">
                              <span>Código</span>
                              <span className="text-[9px] text-slate-400 font-normal">Máx 6</span>
                            </label>
                            <div className="flex items-center">
                              <span className="px-2 py-1.5 bg-slate-200 border border-r-0 border-slate-300 rounded-l-lg font-black text-xs shrink-0">
                                {addSelectedCat?.codePrefix}-
                              </span>
                              <input
                                type="text"
                                maxLength={6}
                                value={addCodeSuffix}
                                onChange={(e) => setAddCodeSuffix(e.target.value.replace(/\s+/g, '').slice(0, 6))}
                                placeholder="001"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded-r-lg text-xs font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nombre / Descripción</label>
                          <input
                            type="text"
                            value={addProductName}
                            onChange={(e) => setAddProductName(e.target.value)}
                            placeholder="Nombre del nuevo producto..."
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-extrabold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Unit of measure selection for multiple entry item */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 flex items-center justify-between">
                        <span>Unidad de Medida del Producto</span>
                        {addItemType === 'EXISTING' && (
                          <span className="text-[10px] font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Lock className="w-3 h-3 text-emerald-700" />
                            Unidad fija según catálogo
                          </span>
                        )}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['unidades', 'kg', 'L'] as UnitOfMeasure[]).map((u) => (
                          <button
                            key={u}
                            type="button"
                            disabled={addItemType === 'EXISTING'}
                            onClick={() => setAddUnit(u)}
                            className={`py-1.5 rounded-lg text-xs font-black border transition-all ${
                              addUnit === u
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            } ${addItemType === 'EXISTING' ? 'disabled:opacity-80 cursor-not-allowed' : ''}`}
                          >
                            {u === 'unidades' ? 'Unidades (unid)' : u === 'kg' ? 'Kilos (kg)' : 'Litros (L)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantity, Lot, Exp & Add button */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end pt-1">
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">Cantidad</label>
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
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-black text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">Lote</label>
                        <input
                          type="text"
                          value={addLotNumber}
                          onChange={(e) => setAddLotNumber(e.target.value)}
                          placeholder="Opcional"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">Vencimiento</label>
                        <input
                          type="date"
                          value={addExpirationDate}
                          onChange={(e) => setAddExpirationDate(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs text-slate-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMultiItem}
                        className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-lg text-xs shadow-sm flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir a Lista</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi Items Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-slate-700 uppercase">
                      <span>Lista de Productos a Ingresar ({multiItems.length})</span>
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
                        No hay productos añadidos en la lista aún. Utilice la caja superior para agregar items.
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
                                    {item.categoryName} {item.isNewProduct && '• (NUEVO)'}
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-black text-emerald-700">
                                  +{item.quantity} {item.unit}
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

              {/* Notes Field */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Notas u Observaciones
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles del proveedor, factura o lote..."
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
                  className="px-7 py-2.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-700/20 transition-all active:scale-[0.98] flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {entryMode === 'SINGLE'
                      ? 'Procesar Ingreso Único'
                      : `Procesar Entrada Múltiple (${multiItems.length})`}
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
        onConfirm={handleProcessEntry}
        title="¿Confirmar Ingreso de Mercancía?"
        message={`¿Está seguro que desea registrar este ingreso de mercancía (${
          entryMode === 'SINGLE' ? '1 producto' : `${multiItems.length} productos`
        }) en el Almacén 00 de Distribución Interna?`}
        type="ENTRADA"
        confirmText="Sí, Confirmar Ingreso"
      />
    </>
  );
};
