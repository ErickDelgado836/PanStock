import React, { useState, useRef, useEffect } from 'react';
import { Product, Category } from '../../types';
import { Search, ChevronDown, Check, X, Filter, Tag, Package, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductSearchSelectProps {
  products: Product[];
  categories: Category[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  warehouseId?: string;
  mustHaveStock?: boolean;
  placeholder?: string;
  label?: string;
}

export const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  products,
  categories,
  selectedProductId,
  onSelectProduct,
  warehouseId,
  mustHaveStock = false,
  placeholder = 'Buscar por código, nombre o subgrupo...',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const amount = direction === 'left' ? -160 : 160;
      categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Filter products by stock requirement if specified
  const baseProducts = products.filter((p) => {
    if (!mustHaveStock || !warehouseId) return true;
    return (p.stockByWarehouse[warehouseId] || 0) > 0;
  });

  // Filter products by search query and category/sub-group
  const filteredProducts = baseProducts.filter((p) => {
    const cat = categories.find((c) => c.id === p.categoryId);
    const catName = cat ? cat.name.toLowerCase() : '';

    // Category filter
    if (selectedCategoryFilter !== 'ALL' && p.categoryId !== selectedCategoryFilter) {
      return false;
    }

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      catName.includes(q)
    );
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-black uppercase text-slate-700 mb-1 tracking-wider">
          {label}
        </label>
      )}

      {/* Selected Box / Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[46px] px-3 py-2 bg-slate-50 hover:bg-white border rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 shadow-2xs ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-white'
            : 'border-slate-300/80 hover:border-slate-400'
        }`}
      >
        {selectedProduct ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 overflow-hidden flex-1 py-0.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300/80 rounded-md font-black text-xs shrink-0">
                {selectedProduct.code}
              </span>
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight break-words">
                {selectedProduct.name}
              </span>
            </div>
            {warehouseId && (
              <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md shrink-0 self-start sm:self-center">
                Stock: {selectedProduct.stockByWarehouse[warehouseId] || 0} {selectedProduct.unit}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 font-bold text-xs sm:text-sm">
            {placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0 text-slate-400 self-center">
          {selectedProduct && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectProduct('');
              }}
              className="p-1 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
              title="Limpiar selección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-xl border border-slate-300 rounded-2xl shadow-2xl z-50 p-2.5 space-y-2 max-h-[280px] sm:max-h-[360px] flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escriba código, nombre o subgrupo..."
              className="w-full pl-9 pr-8 py-2 bg-slate-100/80 hover:bg-slate-100 border border-slate-300/70 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600 focus:bg-white"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sub-group / Category Filter Pills with Horizontal Navigation & Visible Scrollbar */}
          <div className="relative flex items-center gap-1 border-b border-slate-200 pb-1.5 shrink-0 bg-slate-50/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => scrollCategories('left')}
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg shrink-0 transition-colors"
              title="Desplazar subgrupos a la izquierda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={categoryScrollRef}
              onWheel={(e) => {
                if (e.deltaY !== 0 && categoryScrollRef.current) {
                  categoryScrollRef.current.scrollLeft += e.deltaY;
                }
              }}
              className="flex items-center gap-1.5 overflow-x-auto touch-auto py-0.5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 flex-1"
              style={{ scrollbarWidth: 'thin' }}
            >
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all shrink-0 ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Todos los Subgrupos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all shrink-0 ${
                    selectedCategoryFilter === cat.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollCategories('right')}
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg shrink-0 transition-colors"
              title="Desplazar subgrupos a la derecha"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Product Items List */}
          <div className="overflow-y-auto flex-1 space-y-1 pr-1">
            {filteredProducts.length === 0 ? (
              <div className="py-6 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-1.5">
                <Package className="w-6 h-6 text-slate-300" />
                <span>No se encontraron productos que coincidan.</span>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = p.id === selectedProductId;
                const cat = categories.find((c) => c.id === p.categoryId);
                const stockVal = warehouseId ? p.stockByWarehouse[warehouseId] || 0 : undefined;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProduct(p.id);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border ${
                      isSelected
                        ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-bold'
                        : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded font-black text-[11px] shrink-0 mt-0.5">
                        {p.code}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug break-words">
                          {p.name}
                        </div>
                        {cat && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-wider mt-0.5">
                            <Tag className="w-2.5 h-2.5 text-amber-600" />
                            {cat.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {stockVal !== undefined && (
                        <span
                          className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                            stockVal > 0
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          Stock: {stockVal} {p.unit}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
