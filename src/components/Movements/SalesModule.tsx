import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, UserProfile, Category, MovementRecord } from '../../types';
import {
  getCategories,
  getProducts,
  saveProducts,
  addMovement,
  getMovements,
  subscribeToStorage,
  isDocRefDuplicate,
} from '../../services/storage';
import { ConfirmationModal } from '../ConfirmationModal';
import { showToast } from '../../utils/toast';
import { CustomSelect } from '../Common/CustomSelect';
import { deductLotStock, getLotStockInWarehouse } from '../../utils/lotUtils';
import { formatVE } from '../../utils/movementSearch';
import {
  ShoppingCart,
  Building2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Trash2,
  Hash,
  X,
} from 'lucide-react';

interface SalesModuleProps {
  currentUser: UserProfile;
}

interface CartItem {
  product: Product;
  quantityToSell: number | string;
  selectedLotId?: string;
  ignoreLotRestrictions?: boolean;
}

export const SalesModule: React.FC<SalesModuleProps> = ({ currentUser }) => {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<'01' | '002'>('01');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');

  // Shopping Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [docRef, setDocRef] = useState(`VTA-ESP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [customerName, setCustomerName] = useState('Cliente Final');
  const [saleNotes, setSaleNotes] = useState('Venta directa en mostrador');

  // Accordion open states
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({});

  // Messages & Modals
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);

  const scrollToError = () => {
    requestAnimationFrame(() => {
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  useEffect(() => {
    if (errorMsg) {
      scrollToError();
    }
  }, [errorMsg]);

  // Top Selling Filter
  const [topSalesTimeframe, setTopSalesTimeframe] = useState<'ALL' | 'TODAY' | 'MONTH' | 'YEAR'>('ALL');

  const loadData = () => {
    setCategories(getCategories());
    setProducts(getProducts());
    setMovements(getMovements());
  };

  useEffect(() => {
    loadData();
    return subscribeToStorage(loadData);
  }, []);

  // Filter products available in selected sales warehouse
  const availableProducts = products.filter((p) => {
    const stockInWh = p.stockByWarehouse[selectedWarehouseId] || 0;
    if (stockInWh <= 0) return false;

    if (selectedCategoryId !== 'ALL' && p.categoryId !== selectedCategoryId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAddToCart = (product: Product, qty: number = 1) => {
    setErrorMsg('');
    const stockInWh = product.stockByWarehouse[selectedWarehouseId] || 0;

    const existingCartIndex = cart.findIndex((item) => item.product.id === product.id);
    const currentCartNum = existingCartIndex >= 0
      ? (typeof cart[existingCartIndex].quantityToSell === 'number'
          ? (cart[existingCartIndex].quantityToSell as number)
          : parseFloat(String(cart[existingCartIndex].quantityToSell).replace(',', '.')) || 0)
      : 0;
    const newTotalQty = currentCartNum + qty;

    if (newTotalQty > stockInWh) {
      setErrorMsg('La cantidad a vender no puede ser mayor a la disponible');
      return;
    }

    if (existingCartIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingCartIndex].quantityToSell = newTotalQty;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product, quantityToSell: qty }]);
    }
  };

  const handleUpdateCartQty = (productId: string, val: string | number) => {
    setErrorMsg('');
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const stockInWh = item.product.stockByWarehouse[selectedWarehouseId] || 0;

    if (typeof val === 'string') {
      const normalized = val.replace(',', '.');
      if (normalized.length > 10) return;
      if (normalized === '' || /^\d*\.?\d*$/.test(normalized)) {
        setCart(cart.map((i) => (i.product.id === productId ? { ...i, quantityToSell: normalized } : i)));
      }
      return;
    }

    if (val > stockInWh) {
      setErrorMsg('La cantidad a vender no puede ser mayor a la disponible');
      return;
    }

    if (val <= 0) {
      setCart(cart.filter((i) => i.product.id !== productId));
    } else {
      setCart(
        cart.map((i) => (i.product.id === productId ? { ...i, quantityToSell: val } : i))
      );
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  const handleValidation = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (cart.length === 0) {
      setErrorMsg('Seleccione al menos un producto para procesar la venta.');
      return;
    }

    if (!docRef.trim()) {
      setErrorMsg('El documento de referencia es obligatorio.');
      return;
    }

    if (isDocRefDuplicate(docRef)) {
      setErrorMsg(`El documento de referencia "${docRef}" ya existe en el sistema. Debe ser único.`);
      return;
    }

    // Verify all cart items again & check lot restrictions
    for (const item of cart) {
      const numQty =
        typeof item.quantityToSell === 'number'
          ? item.quantityToSell
          : parseFloat(String(item.quantityToSell).replace(',', '.')) || 0;

      if (numQty <= 0) {
        setErrorMsg(`Ingrese una cantidad válida mayor a 0 para "${item.product.name}".`);
        return;
      }

      const dbProduct = products.find((p) => p.id === item.product.id);
      const stockInWh = dbProduct ? dbProduct.stockByWarehouse[selectedWarehouseId] || 0 : 0;
      if (numQty > stockInWh) {
        setErrorMsg(
          `La cantidad a vender para "${item.product.name}" (${numQty.toLocaleString('es-ES')}) no puede ser mayor a la disponible (${stockInWh.toLocaleString('es-ES')}).`
        );
        return;
      }

      // Check per-lot limits if restriction is active
      if (dbProduct && dbProduct.lots && dbProduct.lots.length > 0) {
        const activeLotsInWh = dbProduct.lots
          .filter((l) => getLotStockInWarehouse(l, selectedWarehouseId) > 0)
          .sort((a, b) => (a.expirationDate || '').localeCompare(b.expirationDate || ''));

        if (!item.ignoreLotRestrictions && activeLotsInWh.length > 0) {
          if (item.selectedLotId) {
            const chosenLot = activeLotsInWh.find((l) => l.id === item.selectedLotId);
            const chosenLotQty = chosenLot ? getLotStockInWarehouse(chosenLot, selectedWarehouseId) : 0;
            if (numQty > chosenLotQty) {
              setErrorMsg(
                `La cantidad a vender de "${dbProduct.name}" (${numQty.toLocaleString('es-ES')}) supera las ${chosenLotQty.toLocaleString('es-ES')} ${dbProduct.unit} disponibles en el lote seleccionado (Vence: ${chosenLot?.expirationDate || 'N/A'}). Si deseas abarcar más inventario de otros lotes, activa la opción 'Hacer operación total sin contar fechas de vencimiento'.`
              );
              return;
            }
          } else {
            const firstLot = activeLotsInWh[0];
            const firstLotQty = firstLot ? getLotStockInWarehouse(firstLot, selectedWarehouseId) : 0;
            if (numQty > firstLotQty && activeLotsInWh.length > 1) {
              setErrorMsg(
                `La cantidad a vender de "${dbProduct.name}" (${numQty.toLocaleString('es-ES')}) abarca más de un lote con distinta fecha de vencimiento. El lote más próximo a vencer (${firstLot?.lotNumber || 'S/N'}, Exp: ${firstLot?.expirationDate || 'N/A'}) sólo cuenta con ${firstLotQty.toLocaleString('es-ES')} ${dbProduct.unit}. Si deseas realizar la venta total abarcando múltiples lotes, marca la casilla 'Hacer operación total sin contar fechas de vencimiento' o selecciona el lote específico que deseas vender.`
              );
              return;
            }
          }
        }
      }
    }

    setConfirmOpen(true);
  };

  const handleExecuteSale = () => {
    const currentProducts = getProducts();
    const executedDocRef = docRef.trim();
    const whName = selectedWarehouseId === '01' ? '01 DESPACHO' : '002 VENTAS AL MAYOR';

    // Deduct stock for each cart item
    cart.forEach((cartItem) => {
      const numQty =
        typeof cartItem.quantityToSell === 'number'
          ? cartItem.quantityToSell
          : parseFloat(String(cartItem.quantityToSell).replace(',', '.')) || 0;

      const p = currentProducts.find((prod) => prod.id === cartItem.product.id);
      if (p) {
        const currentStock = p.stockByWarehouse[selectedWarehouseId] || 0;
        p.stockByWarehouse[selectedWarehouseId] = Math.max(0, currentStock - numQty);
        deductLotStock(p, selectedWarehouseId, numQty, cartItem.selectedLotId);
      }
    });

    saveProducts(currentProducts);

    // Record Movement History
    const saleMovement: MovementRecord = {
      id: `mov-${Date.now()}`,
      movementNumber: `VTA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'VENTA',
      docRef: executedDocRef,
      date: formatVE(new Date()),
      responsibleUser: currentUser.username,
      sourceWarehouseId: selectedWarehouseId,
      targetWarehouseId: customerName || 'Cliente Final',
      notes: saleNotes || `Venta procesada desde almacén ${selectedWarehouseId}`,
      items: cart.map((i) => {
        const numQty =
          typeof i.quantityToSell === 'number'
            ? i.quantityToSell
            : parseFloat(String(i.quantityToSell).replace(',', '.')) || 0;

        const dbP = products.find((p) => p.id === i.product.id);
        const activeLots = (dbP?.lots || []).filter(
          (l) => getLotStockInWarehouse(l, selectedWarehouseId) > 0
        );
        const chosenLot = activeLots.find((l) => l.id === i.selectedLotId) || activeLots[0];

        return {
          productId: i.product.id,
          productCode: i.product.code,
          productName: i.product.name,
          quantity: numQty,
          unit: i.product.unit,
          lotNumber: chosenLot?.lotNumber,
          expirationDate: chosenLot?.expirationDate || dbP?.expirationDate,
        };
      }),
    };

    addMovement(saleMovement);

    showToast(
      '¡Venta Procesada con Éxito!',
      `Se emitió la venta N° ${saleMovement.movementNumber} (doc: ${executedDocRef}) y se actualizó el inventario.`,
      'success'
    );

    setSuccessMsg(
      `¡Venta Realizada con Éxito! Se procesó la referencia [${executedDocRef}] con ${cart.length} producto(s) en almacén [${whName}] y se actualizó el inventario correctamente.`
    );
    setCart([]);
    setDocRef(`VTA-ESP-${Math.floor(1000 + Math.random() * 9000)}`);
    setConfirmOpen(false);

    // Scroll to top smooth so user immediately sees notification
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Top Selling Products Calculation
  const salesMovements = movements.filter((m) => m.type === 'VENTA');
  const topSellingMap: { [code: string]: { name: string; totalQty: number; unit: string } } = {};

  salesMovements.forEach((m) => {
    m.items.forEach((it) => {
      if (!topSellingMap[it.productCode]) {
        topSellingMap[it.productCode] = { name: it.productName, totalQty: 0, unit: it.unit };
      }
      topSellingMap[it.productCode].totalQty += it.quantity;
    });
  });

  const topSellingList = Object.entries(topSellingMap)
    .map(([code, val]) => ({ code, ...val }))
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl mb-8 border border-blue-900 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30 mb-2">
            <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
            <span>MÓDULO DE PRODUCTOS VENDEDOS</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Registro y Descuento por Ventas</h1>
          <p className="text-xs text-blue-200 mt-1">
            Seleccione el almacén de venta, visualice el inventario disponible y procese salidas con validación de existencia real.
          </p>
        </div>

        {/* Warehouse Selector Button Toggle */}
        <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 flex gap-2">
          <button
            onClick={() => {
              setSelectedWarehouseId('01');
              setCart([]);
            }}
            className={`px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 ${
              selectedWarehouseId === '01'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>01 DESPACHO</span>
          </button>

          <button
            onClick={() => {
              setSelectedWarehouseId('002');
              setCart([]);
            }}
            className={`px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 ${
              selectedWarehouseId === '002'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>002 VENTAS AL MAYOR</span>
          </button>
        </div>
      </div>

      {/* Success Alert Banner */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-2xl font-bold text-xs flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-emerald-900">¡Venta Realizada con Éxito!</div>
              <div className="text-xs font-semibold text-emerald-800 mt-0.5">{successMsg}</div>
            </div>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-950 p-1.5 hover:bg-emerald-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Main Grid: Catalog vs Shopping Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Product Catalog in Selected Warehouse */}
        <div className="lg:col-span-8 space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-3">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código o nombre..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 min-w-[200px]">
              <CustomSelect
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
                accentColor="blue"
                icon={<Filter className="w-4 h-4 text-slate-400" />}
                options={[
                  { value: 'ALL', label: 'Todas las Categorías' },
                  ...categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                    badge: c.codePrefix,
                  })),
                ]}
              />
            </div>
          </div>

          {/* Alert Message Box */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                ref={errorRef}
                key={errorMsg}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-4 bg-red-50/95 border-2 border-red-400 text-red-950 rounded-2xl font-bold text-xs flex items-start gap-3 shadow-lg shadow-red-500/10 ring-2 ring-red-500/20"
                id="sales-error-notice"
              >
                <div className="p-1.5 bg-red-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-red-950 font-black text-xs uppercase tracking-wider mb-0.5">
                    No se puede procesar la venta
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

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl font-bold text-xs flex items-center gap-3 shadow-md"
            >
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Grouped Catalog View */}
          <div className="space-y-4">
            {categories.map((cat) => {
              const catProducts = availableProducts.filter((p) => p.categoryId === cat.id);
              if (catProducts.length === 0) return null;

              const isOpen = openCategories[cat.id] !== false; // Open by default

              return (
                <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <button
                    onClick={() =>
                      setOpenCategories((prev) => ({ ...prev, [cat.id]: !isOpen }))
                    }
                    className="w-full px-5 py-3.5 bg-slate-50 hover:bg-slate-100/80 border-b border-slate-200 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-900 text-xs font-black rounded-lg tracking-wider border border-blue-200">
                        {cat.codePrefix}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">{cat.name}</span>
                      <span className="text-xs font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                        {catProducts.length} producto(s) disponible(s)
                      </span>
                    </div>

                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>

                  {isOpen && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {catProducts.map((p) => {
                        const stockInWh = p.stockByWarehouse[selectedWarehouseId] || 0;
                        const cartItem = cart.find((i) => i.product.id === p.id);
                        const qtyInCart = cartItem ? cartItem.quantityToSell : 0;

                        return (
                          <div
                            key={p.id}
                            className="p-3.5 bg-slate-50/50 hover:bg-blue-50/30 rounded-xl border border-slate-200 flex flex-col justify-between gap-3 transition-all"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-mono">
                                  {p.code}
                                </span>
                                <span className="text-xs font-extrabold text-slate-700 bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                                  Disp: {stockInWh} {p.unit}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm leading-tight">{p.name}</h4>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <span className="text-[11px] font-medium text-slate-500">
                                {qtyInCart > 0 ? `En lista: ${qtyInCart} ${p.unit}` : 'Sin agregar'}
                              </span>

                              <button
                                onClick={() => handleAddToCart(p, 1)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all active:scale-[0.98] flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Agregar</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {availableProducts.length === 0 && (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-bold text-slate-700">Sin Productos Disponibles</p>
                <p className="text-xs text-slate-500 mt-1">
                  No hay existencia cargada en el almacén [{selectedWarehouseId === '01' ? '01 DESPACHO' : '002 VENTAS AL MAYOR'}].
                  Realice un traslado desde el almacén principal si requiere stock.
                </p>
              </div>
            )}
          </div>

          {/* Top Selling Analytics Panel */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Productos Más Vendidos (Ranking en Tiempo Real)</h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">Basado en salidas registradas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {topSellingList.length === 0 ? (
                <p className="text-xs text-slate-400 italic col-span-full text-center py-4">
                  Aún no se han registrado ventas en el sistema.
                </p>
              ) : (
                topSellingList.map((item, index) => (
                  <div key={item.code} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <div className="truncate">
                      <span className="font-extrabold text-slate-900 text-xs block truncate">{item.name}</span>
                      <span className="text-[10px] text-blue-700 font-bold">
                        Vendidos: {item.totalQty} {item.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Cart / Sales Order */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:sticky lg:top-24 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-blue-900 font-extrabold text-base">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span>Lista para Descuento de Venta</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Almacén: <strong>{selectedWarehouseId === '01' ? '01 DESPACHO' : '002 VENTAS AL MAYOR'}</strong>
              </p>
            </div>

            {/* Document Reference Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                <span>Doc. Referencia / Factura</span>
              </label>
              <input
                type="text"
                value={docRef}
                onChange={(e) => setDocRef(e.target.value)}
                placeholder="Ej: VTA-ESP-1029"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 mb-3"
              />
              
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Destino / Cliente Final</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Cliente Final o Juan Pérez"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl p-4">
                  Seleccione productos del catálogo a la izquierda para agregarlos a esta lista de venta.
                </div>
              ) : (
                cart.map((item) => {
                  const stockInWh = item.product.stockByWarehouse[selectedWarehouseId] || 0;
                  const activeLotsInWh = (item.product.lots || [])
                    .filter((l) => getLotStockInWarehouse(l, selectedWarehouseId) > 0)
                    .sort((a, b) => (a.expirationDate || '').localeCompare(b.expirationDate || ''));

                  return (
                    <div key={item.product.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 font-mono">
                            {item.product.code}
                          </span>
                          <h5 className="font-bold text-slate-900 text-xs leading-tight">
                            {item.product.name}
                          </h5>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Máx Disp: {stockInWh} {item.product.unit}
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-[11px] font-bold text-slate-600">Cantidad a Vender:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.product.id, stockInWh)}
                            className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] rounded transition-all active:scale-95 cursor-pointer shadow-xs"
                          >
                            MAX
                          </button>
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                const curr =
                                  typeof item.quantityToSell === 'number'
                                    ? item.quantityToSell
                                    : parseFloat(String(item.quantityToSell).replace(',', '.')) || 0;
                                handleUpdateCartQty(item.product.id, Math.max(0, curr - 1));
                              }}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.quantityToSell}
                              onChange={(e) => handleUpdateCartQty(item.product.id, e.target.value)}
                              className="w-14 text-center font-black text-xs focus:outline-none font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const curr =
                                  typeof item.quantityToSell === 'number'
                                    ? item.quantityToSell
                                    : parseFloat(String(item.quantityToSell).replace(',', '.')) || 0;
                                handleUpdateCartQty(item.product.id, curr + 1);
                              }}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Lot Selection & Expiration Restrictions */}
                      {activeLotsInWh.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-2">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">
                              Lote / Fecha de Vencimiento:
                            </label>
                            <select
                              value={item.selectedLotId || ''}
                              onChange={(e) => {
                                const lotId = e.target.value;
                                setCart(
                                  cart.map((i) =>
                                    i.product.id === item.product.id
                                      ? { ...i, selectedLotId: lotId || undefined }
                                      : i
                                  )
                                );
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">
                                Automático FEFO (Lote más próximo a vencer)
                              </option>
                              {activeLotsInWh.map((lot) => {
                                const lStock = getLotStockInWarehouse(lot, selectedWarehouseId);
                                return (
                                  <option key={lot.id} value={lot.id}>
                                    Lote: {lot.lotNumber || 'S/N'} — Vence: {lot.expirationDate || 'Sin Fecha'} ({lStock} {item.product.unit})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <label className="flex items-start gap-2 cursor-pointer select-none text-[10px] font-bold text-slate-700 bg-amber-50/90 hover:bg-amber-100/90 p-2 rounded-lg border border-amber-200 transition-colors">
                            <input
                              type="checkbox"
                              checked={Boolean(item.ignoreLotRestrictions)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCart(
                                  cart.map((i) =>
                                    i.product.id === item.product.id
                                      ? { ...i, ignoreLotRestrictions: checked }
                                      : i
                                  )
                                );
                              }}
                              className="w-3.5 h-3.5 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 shrink-0"
                            />
                            <span className="leading-tight">
                              Hacer operación total sin contar fechas de vencimiento (abarca múltiples lotes)
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nota de Venta
              </label>
              <textarea
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                placeholder="Observaciones de la venta..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleValidation}
              disabled={cart.length === 0}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Ejecutar Venta y Restar Inventario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleExecuteSale}
        title="¿Confirmar Ejecución de Venta?"
        message={`¿Está seguro que desea ejecutar esta venta de ${cart.length} item(s) y restar las cantidades correspondientes del almacén [${
          selectedWarehouseId === '01' ? '01 DESPACHO' : '002 VENTAS AL MAYOR'
        }]?`}
        type="VENTA"
        confirmText="Sí, Ejecutar Venta"
      />
    </div>
  );
};
