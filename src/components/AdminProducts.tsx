import React, { useState, useEffect } from 'react';
import { Product, Category, Warehouse, UnitOfMeasure } from '../types';
import { getProducts, saveProducts, getCategories, getWarehouses, addMovement } from '../services/storage';
import { CustomSelect } from './Common/CustomSelect';
import {
  PackageSearch,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  Box,
  Search,
  X,
  Save,
  Building2,
  Filter,
} from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [categories, setCategories] = useState<Category[]>(getCategories);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // New Product Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState<UnitOfMeasure>('unidades');

  // Floating Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editUnit, setEditUnit] = useState<UnitOfMeasure>('unidades');

  // Floating Delete Modal State (with stock discharge & mandatory concept)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [stockBreakdown, setStockBreakdown] = useState<{ whId: string; whName: string; stock: number }[]>([]);
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    const loadedProds = getProducts();
    const loadedCats = getCategories();
    setProducts(loadedProds);
    setCategories(loadedCats);
    setWarehouses(getWarehouses());
    if (loadedCats.length > 0) {
      setCategoryId(loadedCats[0].id);
    }
  }, []);

  // Filtered product list
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term || p.code.toLowerCase().includes(term) || p.name.toLowerCase().includes(term);
    const matchesCat = categoryFilter === 'ALL' || p.categoryId === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Handle Adding New Product
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !categoryId) {
      setMsg({ text: 'Por favor, complete todos los campos obligatorios.', type: 'error' });
      return;
    }

    const selCat = categories.find((c) => c.id === categoryId);
    const catName = selCat ? selCat.name : 'la categoría';

    if (products.some((p) => p.categoryId === categoryId && p.code.toLowerCase() === code.trim().toLowerCase())) {
      setMsg({ text: `Ya existe un producto con el código '${code.trim()}' en ${catName}.`, type: 'error' });
      return;
    }

    if (products.some((p) => p.categoryId === categoryId && p.name.toLowerCase() === name.trim().toLowerCase())) {
      setMsg({ text: `Ya existe un producto con el nombre '${name.trim()}' en ${catName}.`, type: 'error' });
      return;
    }

    const newStock: Record<string, number> = {};
    warehouses.forEach((w) => {
      newStock[w.id] = 0;
    });

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      categoryId,
      unit,
      stockByWarehouse: newStock,
      entryDate: new Date().toISOString().split('T')[0],
    };

    const updated = [...products, newProduct];
    saveProducts(updated);
    setProducts(updated);
    setMsg({ text: `Producto '${newProduct.name}' agregado al catálogo.`, type: 'success' });

    // Reset Form
    setName('');
    setCode('');
    if (categories.length > 0) setCategoryId(categories[0].id);
    setUnit('unidades');
  };

  // Open Edit Modal
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCode(p.code);
    setEditCategoryId(p.categoryId);
    setEditUnit(p.unit);
    setEditModalOpen(true);
    setMsg({ text: '', type: '' });
  };

  // Save Edits in Modal
  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const cleanName = editName.trim();
    const cleanCode = editCode.trim().toUpperCase();

    if (!cleanName || !cleanCode || !editCategoryId) {
      alert('Por favor, complete todos los campos obligatorios del producto.');
      return;
    }

    // Check code collision
    const codeCollision = products.find(
      (p) => p.code.toLowerCase() === cleanCode.toLowerCase() && p.id !== editingProduct.id
    );
    if (codeCollision) {
      alert(`El código '${cleanCode}' ya pertenece a otro producto ('${codeCollision.name}').`);
      return;
    }

    const updated = products.map((p) => {
      if (p.id === editingProduct.id) {
        return {
          ...p,
          name: cleanName,
          code: cleanCode,
          categoryId: editCategoryId,
          unit: editUnit,
        };
      }
      return p;
    });

    saveProducts(updated);
    setProducts(updated);
    setEditModalOpen(false);
    setEditingProduct(null);
    setMsg({ text: `Producto '${cleanCode}' actualizado con éxito.`, type: 'success' });
  };

  // Open Delete Request Modal
  const handleRequestDelete = (p: Product) => {
    setMsg({ text: '', type: '' });
    setDeleteError('');

    const breakdown: { whId: string; whName: string; stock: number }[] = [];
    Object.entries(p.stockByWarehouse || {}).forEach(([whId, stock]) => {
      const qty = Number(stock) || 0;
      if (qty > 0) {
        const whObj = warehouses.find((w) => w.id === whId);
        breakdown.push({
          whId,
          whName: whObj ? `${whObj.id} - ${whObj.name}` : whId,
          stock: qty,
        });
      }
    });

    setProductToDelete(p);
    setStockBreakdown(breakdown);
    setDischargeNotes(
      breakdown.length > 0
        ? `Descargo de existencias por baja y eliminación del producto ${p.code} del catálogo`
        : ''
    );
    setDeleteModalOpen(true);
  };

  // Confirm Product Deletion (and process stock discharges if any)
  const handleConfirmDelete = () => {
    if (!productToDelete) return;

    const totalStock = stockBreakdown.reduce((acc, curr) => acc + curr.stock, 0);

    // If stock > 0, concept note is MANDATORY
    if (totalStock > 0 && !dischargeNotes.trim()) {
      setDeleteError('El concepto o motivo del descargo es obligatorio para dar de baja las existencias.');
      return;
    }

    // Process discharge movements if stock exists
    if (stockBreakdown.length > 0) {
      stockBreakdown.forEach((item) => {
        addMovement({
          id: `mov-del-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          movementNumber: `DSC-DEL-${Date.now().toString().slice(-4)}`,
          type: 'DESCARGO',
          docRef: `ELIM-${productToDelete.code}-${new Date().toLocaleDateString('es-VE').replace(/\//g, '')}`,
          date: new Date().toLocaleString('es-VE'),
          responsibleUser: 'ADMINISTRADOR',
          sourceWarehouseId: item.whId,
          targetWarehouseId: item.whId,
          notes: dischargeNotes.trim(),
          items: [
            {
              productId: productToDelete.id,
              productCode: productToDelete.code,
              productName: productToDelete.name,
              quantity: item.stock,
              unit: productToDelete.unit,
            },
          ],
        });
      });
    }

    // Remove product from list
    const updated = products.filter((p) => p.id !== productToDelete.id);
    saveProducts(updated);
    setProducts(updated);

    setDeleteModalOpen(false);
    setProductToDelete(null);
    setStockBreakdown([]);
    setDischargeNotes('');

    if (totalStock > 0) {
      setMsg({
        text: `Producto '${productToDelete.name}' eliminado del catálogo. Se registraron los descargos correspondientes por un total de ${totalStock} ${productToDelete.unit}.`,
        type: 'success',
      });
    } else {
      setMsg({
        text: `Producto '${productToDelete.name}' eliminado del catálogo.`,
        type: 'success',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Formulario Izquierdo: Nuevo Producto */}
      <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit sticky top-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
          <PackageSearch className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-bold text-slate-900">Nuevo Producto</h2>
        </div>

        {msg.text && (
          <div
            className={`mb-4 p-3 border rounded-xl text-xs font-bold flex items-center gap-2 ${
              msg.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {msg.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleAddProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Código del Producto
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: PAN-001"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-sm text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nombre / Descripción
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pan Canilla Tradicional"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Categoría
              </label>
              <CustomSelect
                value={categoryId}
                onChange={setCategoryId}
                accentColor="rose"
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  badge: c.codePrefix,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Unidad
              </label>
              <CustomSelect
                value={unit}
                onChange={(val) => setUnit(val as UnitOfMeasure)}
                accentColor="rose"
                options={[
                  { value: 'unidades', label: 'Unidades (uds)' },
                  { value: 'kg', label: 'Kilogramos (kg)' },
                  { value: 'L', label: 'Litros (L)' },
                ]}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar al Catálogo</span>
          </button>
        </form>
      </div>

      {/* Lista Derecha: Catálogo con Buscador y Filtro */}
      <div className="lg:col-span-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Box className="w-5 h-5 text-red-600 shrink-0" />
            <span>Catálogo de Productos ({products.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Mostrando {filteredProducts.length} de {products.length} productos
          </span>
        </div>

        {/* Buscador y Filtro por Categoría */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-5 relative">
            <CustomSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              accentColor="rose"
              icon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
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

        {/* Listado de Productos */}
        <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
              {products.length === 0
                ? 'No hay productos registrados en el sistema.'
                : 'No se encontraron productos que coincidan con la búsqueda.'}
            </div>
          ) : (
            filteredProducts.map((p) => {
              const cat = categories.find((c) => c.id === p.categoryId);
              const totalStock = Object.values(p.stockByWarehouse || {}).reduce(
                (acc: number, curr: any) => acc + (Number(curr) || 0),
                0
              );

              return (
                <div
                  key={p.id}
                  className="p-3.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 shadow-2xs transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded shrink-0">
                        {p.code}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-semibold text-[11px]">
                        {cat?.name || 'Sin Categoría'}
                      </span>
                      <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-semibold text-[11px]">
                        Medida: {p.unit}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-extrabold text-[11px]">
                        Existencias: {totalStock}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(p)}
                      className="p-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-xs"
                      title="Editar Producto (Ventana Flotante)"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestDelete(p)}
                      className="p-2 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg border border-red-200 transition-colors shadow-xs"
                      title="Eliminar Producto del Catálogo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL FLOTANTE: Editar Producto */}
      {editModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Editar Producto [{editingProduct.code}]</span>
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Código del Producto
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre / Descripción
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Categoría
                  </label>
                  <CustomSelect
                    value={editCategoryId}
                    onChange={setEditCategoryId}
                    accentColor="blue"
                    options={categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                      badge: c.codePrefix,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Unidad de Medida
                  </label>
                  <CustomSelect
                    value={editUnit}
                    onChange={(val) => setEditUnit(val as UnitOfMeasure)}
                    accentColor="blue"
                    options={[
                      { value: 'unidades', label: 'Unidades (uds)' },
                      { value: 'kg', label: 'Kilogramos (kg)' },
                      { value: 'L', label: 'Litros (L)' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>Actualizar Producto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE: Eliminar Producto (Con Descargo Obligatorio de Existencias por Almacén) */}
      {deleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5 shrink-0" />
                <span>Eliminar Producto '{productToDelete.code}'</span>
              </h3>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500 block">Código: {productToDelete.code}</span>
                  <span className="font-extrabold text-slate-900 text-sm">{productToDelete.name}</span>
                </div>
                <span className="bg-red-100 text-red-800 font-extrabold text-xs px-2.5 py-1 rounded-lg">
                  {stockBreakdown.reduce((acc, c) => acc + c.stock, 0)} {productToDelete.unit} en stock
                </span>
              </div>

              {stockBreakdown.length > 0 ? (
                <>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Este producto tiene existencias registradas en almacén:</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-1.5 max-h-36 overflow-y-auto">
                      {stockBreakdown.map((item) => (
                        <div
                          key={item.whId}
                          className="flex items-center justify-between text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.whName}</span>
                          </span>
                          <span className="text-red-700 font-black bg-red-50 px-2 py-0.5 rounded">
                            Descargo: {item.stock} {productToDelete.unit}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-amber-900 font-medium pt-1">
                      Para garantizar la consistencia en los inventarios, se registrará automáticamente un movimiento de <strong className="text-red-700">DESCARGO</strong> por cada almacén en la auditoría del sistema.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                      Concepto / Motivo del Descargo (Obligatorio) <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={dischargeNotes}
                      onChange={(e) => {
                        setDischargeNotes(e.target.value);
                        if (deleteError) setDeleteError('');
                      }}
                      rows={2}
                      placeholder="Escriba la justificación o razón de la eliminación y descargo..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    {deleteError && (
                      <p className="text-[11px] font-bold text-red-600 mt-1">{deleteError}</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-600 font-medium">
                  Este producto no tiene existencias registradas en ningún almacén. ¿Está seguro de que desea eliminarlo permanentemente del catálogo?
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-[0.98]"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {stockBreakdown.length > 0
                    ? 'Descargar Existencias y Eliminar'
                    : 'Eliminar Producto'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
