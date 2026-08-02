import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Warehouse, Category, UserProfile, PhysicalAuditItem } from '../types';
import { addPhysicalAudit, getPhysicalAudits } from '../services/storage';
import { ConfirmationModal } from './ConfirmationModal';
import { X, ClipboardCheck, Check, Plus, Minus, Equal } from 'lucide-react';

interface PhysicalAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: Warehouse;
  category: Category;
  products: Product[];
  currentUser: UserProfile;
}

export const PhysicalAuditModal: React.FC<PhysicalAuditModalProps> = ({
  isOpen,
  onClose,
  warehouse,
  category,
  products,
  currentUser,
}) => {
  const [physicalCounts, setPhysicalCounts] = useState<{ [productId: string]: number | string }>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const allAudits = getPhysicalAudits();

      const initial: { [key: string]: number | string } = {};
      products.forEach((p) => {
        const sysStock = p.stockByWarehouse[warehouse.id] || 0;
        let lastItem = null;
        for (const a of allAudits) {
          if (a.warehouseId === warehouse.id) {
            const found = a.items.find((i) => i.productId === p.id);
            if (found) {
              lastItem = found;
              break;
            }
          }
        }
        // If an audit was already recorded previously, load its physical stock; otherwise default to system stock
        initial[p.id] = lastItem ? lastItem.physicalStock : sysStock;
      });
      setPhysicalCounts(initial);
    }
  }, [isOpen, products, warehouse]);

  const handlePhysicalChange = (productId: string, rawVal: string) => {
    const val = rawVal.replace(',', '.');
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setPhysicalCounts((prev) => ({
        ...prev,
        [productId]: val,
      }));
    }
  };

  const auditItems: PhysicalAuditItem[] = products.map((p) => {
    const sysStock = p.stockByWarehouse[warehouse.id] || 0;
    const rawCount = physicalCounts[p.id];
    const physStock =
      rawCount === undefined || rawCount === ''
        ? 0
        : typeof rawCount === 'number'
        ? rawCount
        : parseFloat(String(rawCount).replace(',', '.')) || 0;
    const diff = physStock - sysStock;
    return {
      productId: p.id,
      productCode: p.code,
      productName: p.name,
      unit: p.unit,
      systemStock: sysStock,
      physicalStock: physStock,
      difference: diff,
    };
  });

  const handleSaveAudit = () => {
    const auditDateStr = new Date().toLocaleString('es-VE');

    const record = {
      id: `audit-${Date.now()}`,
      warehouseId: warehouse.id,
      categoryId: category.id,
      date: auditDateStr,
      responsibleUser: currentUser.username,
      items: auditItems,
    };

    // Save physical audit record ONLY (does NOT touch or alter system stock)
    addPhysicalAudit(record);
    setConfirmOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-3xl max-h-[88vh] sm:max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
          >
            {/* Header */}
            <div className="shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white p-5 sm:p-6 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-600 rounded-xl">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Realizar Conteo de Inventario Físico</h2>
                  <p className="text-xs text-amber-300 font-medium mt-0.5">
                    Almacén: <strong>{warehouse.code} - {warehouse.name}</strong> • Categoría: <strong>{category.name}</strong>
                    {products.length === 1 && (
                      <span> • Producto: <strong>{products[0].name}</strong></span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 min-h-0">
              <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Ingrese la cifra real observada en el conteo físico. El sistema calculará automáticamente las diferencias (Faltantes en rojo, Sobrantes en verde).
              </p>

              <div className="border border-slate-200 rounded-xl overflow-x-auto touch-auto mb-6">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Producto</th>
                      <th className="p-3 text-center">Existencia Sistema</th>
                      <th className="p-3 text-center">Conteo Físico Real</th>
                      <th className="p-3 text-center">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditItems.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-800">{item.productCode}</td>
                        <td className="p-3 font-bold text-slate-900">{item.productName}</td>
                        <td className="p-3 text-center font-bold text-slate-600">
                          {item.systemStock} {item.unit}
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={physicalCounts[item.productId] ?? item.systemStock}
                            onChange={(e) => handlePhysicalChange(item.productId, e.target.value)}
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-black text-xs text-slate-900 focus:ring-2 focus:ring-red-500 font-mono"
                          />
                        </td>
                        <td className="p-3 text-center">
                          {item.difference > 0 ? (
                            <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                              <Plus className="w-3 h-3" />+{item.difference.toFixed(2)} (Sobra)
                            </span>
                          ) : item.difference < 0 ? (
                            <span className="inline-flex items-center gap-1 font-black text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                              <Minus className="w-3 h-3" />{item.difference.toFixed(2)} (Falta)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                              <Equal className="w-3 h-3" />0.00 (Correcto)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Guardar Conteo e Inventario Físico</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSaveAudit}
        title="¿Guardar Conteo Físico de Inventario?"
        message={`¿Está seguro que desea guardar este inventario físico para ${
          products.length === 1
            ? `el producto "${products[0].name}"`
            : `la categoría "${category.name}" (${products.length} productos)`
        } en el almacén [${warehouse.code} ${warehouse.name}]? Se registrará la fecha y usuario responsable.`}
        type="AUDIT"
        confirmText="Sí, Guardar Inventario Físico"
      />
    </>
  );
};
