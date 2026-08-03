import React, { useRef, useEffect, useState } from 'react';
import { Warehouse } from '../types';
import { Building2, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { CustomSelect } from './Common/CustomSelect';

interface WarehouseTabsBarProps {
  warehouses: Warehouse[];
  selectedWarehouseId: string;
  onSelectWarehouse: (id: string) => void;
  allowedWarehouseIds: string[];
}

export const WarehouseTabsBar: React.FC<WarehouseTabsBarProps> = ({
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
  allowedWarehouseIds,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  const allowedWarehouses = warehouses.filter((w) =>
    allowedWarehouseIds.includes(w.id)
  );

  // Check scroll position to enable/disable scroll buttons
  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [warehouses, allowedWarehouseIds]);

  // Scroll active tab into view smoothly
  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
    setTimeout(checkScroll, 300);
  }, [selectedWarehouseId]);

  // Manual scroll function for left/right arrow buttons
  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const distance = 280;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 350);
  };

  // Convert mouse wheel vertical scroll to horizontal scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    if (e.deltaY !== 0) {
      scrollRef.current.scrollLeft += e.deltaY;
      checkScroll();
    }
  };

  // Mouse Drag to Scroll handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftPos(scrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.8; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeftPos - walk;
    checkScroll();
  };

  // Options for quick dropdown selector
  const selectOptions = allowedWarehouses.map((w) => ({
    value: w.id,
    label: `${w.code} - ${w.name}`,
    badge: w.code,
  }));

  return (
    <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Tab bar header & scroll controls container */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5 relative">
        {/* Left Scroll Button */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          className={`p-2 rounded-xl border text-slate-700 bg-slate-50 transition-all shrink-0 z-10 active:scale-95 ${
            canScrollLeft
              ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300 shadow-xs cursor-pointer'
              : 'opacity-40 cursor-not-allowed border-slate-200'
          }`}
          title="Desplazar almacenes a la izquierda"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Tabs Container */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}
          onScroll={checkScroll}
          className={`flex-1 overflow-x-auto flex gap-2 py-1 px-0.5 select-none touch-pan-x scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 scrollbar-track-slate-100 rounded-lg ${
            isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ scrollBehavior: 'smooth' }}
        >
          {allowedWarehouses.map((w) => {
            const isSelected = selectedWarehouseId === w.id;
            return (
              <button
                key={w.id}
                ref={isSelected ? activeTabRef : null}
                onClick={() => onSelectWarehouse(w.id)}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap flex items-center gap-2 shrink-0 active:scale-[0.98] ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/20 ring-2 ring-red-500/30'
                    : 'bg-slate-50 hover:bg-slate-100/90 text-slate-700 border border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <Building2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-red-600'}`} />
                <span>
                  {w.code} - {w.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          className={`p-2 rounded-xl border text-slate-700 bg-slate-50 transition-all shrink-0 z-10 active:scale-95 ${
            canScrollRight
              ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300 shadow-xs cursor-pointer'
              : 'opacity-40 cursor-not-allowed border-slate-200'
          }`}
          title="Desplazar almacenes a la derecha"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Dropdown Select for Instant Jump on Desktop */}
      <div className="w-full sm:w-64 shrink-0">
        <CustomSelect
          value={selectedWarehouseId}
          onChange={onSelectWarehouse}
          options={selectOptions}
          accentColor="rose"
          icon={<ListFilter className="w-4 h-4 text-red-600" />}
          placeholder="Buscar o seleccionar almacén..."
        />
      </div>
    </div>
  );
};
