import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { Product, Warehouse, MovementRecord, UserProfile } from '../types';
import { getProducts, getWarehouses, getMovements, calculateTotalStock, subscribeToStorage } from '../services/storage';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import {
  Building2,
  Package,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Clock,
  Layers,
  FileText,
  Sparkles,
  PieChart as LucidePieChart,
  Activity,
} from 'lucide-react';

interface DashboardProps {
  currentUser: UserProfile;
  onOpenEntradas: () => void;
  onOpenTraslados: () => void;
  onOpenDescargos: () => void;
  onNavigateToTab: (tab: string) => void;
  onOpenGlobalCatalog: () => void;
}

const WAREHOUSE_COLORS = [
  '#DC2626', // Red
  '#2563EB', // Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#0891B2', // Cyan
  '#4F46E5', // Indigo
  '#65A30D', // Lime
  '#475569', // Slate
];

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  onOpenEntradas,
  onOpenTraslados,
  onOpenDescargos,
  onNavigateToTab,
  onOpenGlobalCatalog,
}) => {
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses);
  const [movements, setMovements] = useState<MovementRecord[]>(getMovements);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const renderCustom3DShape = useCallback((props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g className="cursor-pointer">
        {/* Ambient Soft Outer Elevation Drop-Shadow for 3D Depth */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.2}
        />
        {/* Glow Layer */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 1}
          outerRadius={outerRadius + 5}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.35}
        />
        {/* Main 3D Lifted Active Sector */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 4}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke="#ffffff"
          strokeWidth={3}
        />
        {/* Bevel Highlight Top Arc */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 5}
          outerRadius={innerRadius - 1}
          startAngle={startAngle}
          endAngle={endAngle}
          fill="#ffffff"
          opacity={0.85}
        />
      </g>
    );
  }, []);

  const loadData = useCallback(() => {
    setProducts(getProducts());
    setWarehouses(getWarehouses());
    setMovements(getMovements());
  }, []);

  useEffect(() => {
    loadData();
    return subscribeToStorage(loadData);
  }, [loadData]);

  // Compute Total Stock Units across system with stable memoization
  const { warehouseDistribution, grandTotalUnits } = useMemo(() => {
    let total = 0;
    const dist = warehouses.map((w, index) => {
      let whTotal = 0;
      products.forEach((p) => {
        whTotal += Number(p.stockByWarehouse[w.id] || 0);
      });
      total += whTotal;
      return {
        name: w.name,
        code: w.code,
        totalUnits: whTotal,
        percentage: 0,
        color: WAREHOUSE_COLORS[index % WAREHOUSE_COLORS.length],
      };
    });

    dist.forEach((w) => {
      w.percentage = total > 0 ? Number(((w.totalUnits / total) * 100).toFixed(1)) : 0;
    });

    return { warehouseDistribution: dist, grandTotalUnits: total };
  }, [products, warehouses]);

  // Expiring items memoized
  const expiringCount = useMemo(() => {
    const today = new Date();
    return products.filter((p) => {
      if (!p.expirationDate) return false;
      const exp = new Date(p.expirationDate);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }).length;
  }, [products]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-3xl p-8 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="bg-red-600 text-white font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
            PanStock Española C.A
          </span>
          <h1 className="text-3xl font-black tracking-tight mt-2">
            Control de Inventarios y Almacenes
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Bienvenido, <strong>{currentUser.username}</strong>. Sistema activo con 10 almacenes sincronizados en tiempo real.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {currentUser.permissions.canEntries && (
            <button
              onClick={onOpenEntradas}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-200" />
              <span>Entrada (Ingreso)</span>
            </button>
          )}

          {currentUser.permissions.canTransfers && (
            <button
              onClick={onOpenTraslados}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4 text-amber-200" />
              <span>Traslado Interno</span>
            </button>
          )}

          {currentUser.permissions.canExits && (
            <button
              onClick={onOpenDescargos}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4 text-rose-200" />
              <span>Descargo (Salida)</span>
            </button>
          )}

          {currentUser.permissions.canSales && (
            <button
              onClick={() => onNavigateToTab('VENTAS')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 text-blue-200" />
              <span>Productos Vendidos</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-slate-100 rounded-2xl text-slate-800">
            <Package className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Existencia Unidades
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {grandTotalUnits.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-slate-100 rounded-2xl text-slate-800">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Almacenes Activos
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">10 Depósitos</h3>
          </div>
        </div>

        <div
          onClick={onOpenGlobalCatalog}
          className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 sm:gap-4 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
          title="Haga clic para abrir el listado de artículos de inventario y servicios"
        >
          <div className="p-3 bg-emerald-50 group-hover:bg-emerald-600 rounded-2xl text-emerald-600 group-hover:text-white transition-all shadow-2xs shrink-0">
            <Layers className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 block leading-tight">
              Artículos de Inventario y Servicios
            </span>
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {products.length} Items
              </h3>
              <span className="text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 group-hover:bg-emerald-100 px-2.5 py-0.5 rounded-lg transition-all border border-emerald-200/60 shrink-0">
                Ver Lista →
              </span>
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateToTab('VENCIMIENTO')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="p-3.5 bg-amber-50 rounded-2xl text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Próximos a Vencer
            </span>
            <h3 className="text-2xl font-black text-amber-600 mt-0.5">{expiringCount} Alertas</h3>
          </div>
        </div>
      </div>

      {/* Warehouse Inventory Percentage Distribution Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="border-b border-slate-100 pb-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <span>Distribución Porcentual de Existencias por Almacén (%)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Porcentaje real del volumen total de inventario almacenado en cada uno de los 10 depósitos
              </p>
            </div>
          </div>

          {/* Professional Non-Redundant Executive Summary Pills under Header */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <div className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 px-3 py-1 rounded-xl border border-slate-200/80 font-medium">
              <span className="text-slate-400 font-semibold">Total Red:</span>
              <span className="font-mono font-black text-slate-900">{grandTotalUnits.toLocaleString()} u.</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 px-3 py-1 rounded-xl border border-slate-200/80 font-medium">
              <span className="text-slate-400 font-semibold">Mayor Concentración:</span>
              <span className="font-mono font-bold text-red-600">
                {warehouseDistribution[0]?.code} ({warehouseDistribution[0]?.percentage}%)
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200/80 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold">10 Depósitos Activos</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* 3D Centered Donut Stage - Clean White Card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-5 relative bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center overflow-hidden h-[340px] sm:h-[380px] min-h-[340px]"
          >
            {/* Center Donut Badge - Exactly Aligned to Center (50%, 50%) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
              <div
                className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl flex flex-col items-center justify-center p-2 sm:p-3 text-center transition-all duration-200 ${
                  activePieIndex !== null
                    ? 'scale-105 shadow-2xl border-amber-300 ring-4 ring-amber-500/10'
                    : 'shadow-md ring-4 ring-slate-50'
                }`}
              >
                {activePieIndex !== null && warehouseDistribution[activePieIndex] ? (
                  <div className="space-y-0.5 animate-fadeIn">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase block tracking-wider font-mono text-amber-700">
                      {warehouseDistribution[activePieIndex].code}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-none font-mono tracking-tight">
                      {warehouseDistribution[activePieIndex].percentage}%
                    </span>
                    <span className="text-[11px] font-extrabold text-slate-600 block leading-tight truncate max-w-[95px] sm:max-w-[110px] mx-auto">
                      {warehouseDistribution[activePieIndex].totalUnits.toLocaleString()} u.
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 block truncate max-w-[100px] mx-auto">
                      {warehouseDistribution[activePieIndex].name}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                      Total Inventario
                    </span>
                    <span className="text-base sm:text-xl font-black text-slate-900 block leading-none font-mono">
                      {grandTotalUnits.toLocaleString()}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-600 block">
                      10 Depósitos
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Centered Responsive Pie Chart Container */}
            <div className="w-full h-full relative z-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                <PieChart>
                  <Pie
                    data={warehouseDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={102}
                    paddingAngle={3.5}
                    dataKey="totalUnits"
                    nameKey="name"
                    isAnimationActive={false}
                    activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                    activeShape={renderCustom3DShape}
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(null)}
                    onClick={(_, index) => setActivePieIndex(activePieIndex === index ? null : index)}
                  >
                    {warehouseDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Detailed Warehouse Percentage Progress Bars */}
          <div className="lg:col-span-7 space-y-2">
            {warehouseDistribution.map((w, index) => {
              const isActive = activePieIndex === index;
              return (
                <div
                  key={w.code}
                  onMouseEnter={() => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  onClick={() => setActivePieIndex(activePieIndex === index ? null : index)}
                  className={`p-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 border border-amber-300 shadow-md translate-x-1.5 scale-[1.01]'
                      : 'hover:bg-slate-50/80 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-2.5">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 shadow-2xs transition-transform duration-200 ${
                          isActive ? 'scale-125 ring-2 ring-amber-400/50' : ''
                        }`}
                        style={{ backgroundColor: w.color }}
                      />
                      <span className={isActive ? 'text-amber-900 font-black' : 'text-slate-800'}>
                        <strong className="font-mono font-black">{w.code}</strong> - {w.name}
                      </span>
                    </span>
                    <span className={`font-mono ${isActive ? 'font-black text-amber-900 text-sm' : 'font-extrabold text-slate-800'}`}>
                      {w.totalUnits.toLocaleString()} u. ({w.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/70 mt-1.5 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isActive ? 'brightness-110 shadow-md' : ''
                      }`}
                      style={{
                        width: `${Math.max(w.percentage, w.totalUnits > 0 ? 2 : 0)}%`,
                        backgroundColor: w.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Log Preview */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600" />
            <span>Últimos Movimientos de Inventario Registrados</span>
          </h3>

          <button
            onClick={() => onNavigateToTab('NOTAS')}
            className="text-xs font-bold text-red-600 hover:underline"
          >
            Ver todos los comprobantes &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {movements.slice(0, 5).map((m) => (
            <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {m.movementNumber}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{m.type}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-mono">Ref: {m.docRef}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Resp: <strong>{m.responsibleUser}</strong> • Fecha: {m.date}
                  </p>
                </div>
              </div>

              <span className="bg-slate-50 text-slate-700 px-3 py-1 rounded-lg border font-bold">
                {m.items.length} item(s)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
