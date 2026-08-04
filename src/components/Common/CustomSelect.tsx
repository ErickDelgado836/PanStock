import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
  sublabel?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  accentColor?: 'amber' | 'emerald' | 'rose' | 'slate' | 'blue' | 'indigo';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  className = '',
  icon,
  searchable,
  accentColor = 'slate',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Determine if search input should be shown (if explicitly set to true OR more than 5 options)
  const showSearch = searchable !== undefined ? searchable : options.length > 5;

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.badge && opt.badge.toLowerCase().includes(q)) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  });

  // Border & Accent color styling dynamically based on accentColor prop
  const borderFocusClasses = {
    amber: 'border-amber-400 focus:ring-amber-500/20 active:border-amber-500',
    emerald: 'border-emerald-400 focus:ring-emerald-500/20 active:border-emerald-500',
    rose: 'border-rose-400 focus:ring-rose-500/20 active:border-rose-500',
    blue: 'border-blue-400 focus:ring-blue-500/20 active:border-blue-500',
    indigo: 'border-indigo-400 focus:ring-indigo-500/20 active:border-indigo-500',
    slate: 'border-slate-300 focus:ring-slate-400/20 active:border-slate-400',
  }[accentColor];

  const selectedBgClasses = {
    amber: 'bg-amber-50/90 text-amber-950 border-amber-300',
    emerald: 'bg-emerald-50/90 text-emerald-950 border-emerald-300',
    rose: 'bg-rose-50/90 text-rose-950 border-rose-300',
    blue: 'bg-blue-50/90 text-blue-950 border-blue-300',
    indigo: 'bg-indigo-50/90 text-indigo-950 border-indigo-300',
    slate: 'bg-slate-100 text-slate-900 border-slate-300',
  }[accentColor];

  const badgeBgClasses = {
    amber: 'bg-amber-100 text-amber-900 border-amber-300',
    emerald: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    rose: 'bg-rose-100 text-rose-900 border-rose-300',
    blue: 'bg-blue-100 text-blue-900 border-blue-300',
    indigo: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    slate: 'bg-slate-200 text-slate-800 border-slate-300',
  }[accentColor];

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchTerm('');
          }
        }}
        className={`w-full min-h-[42px] px-3 py-2 bg-white border rounded-xl text-left transition-all flex items-center justify-between gap-2 shadow-2xs ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
            : `cursor-pointer hover:bg-slate-50 ${isOpen ? `ring-2 ${borderFocusClasses}` : 'border-slate-300 hover:border-slate-400'}`
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
              {selectedOption.badge && (
                <span className={`px-2 py-0.5 border rounded-md font-black text-[11px] shrink-0 ${badgeBgClasses}`}>
                  {selectedOption.badge}
                </span>
              )}
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-[10px] text-slate-500 font-semibold truncate hidden sm:inline">
                  {selectedOption.sublabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-semibold text-xs truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-xl border border-slate-300 rounded-2xl shadow-2xl z-50 p-2 space-y-1.5 max-h-[190px] sm:max-h-[340px] flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Search inside Dropdown */}
          {showSearch && (
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar opción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
              />
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto space-y-1 flex-1 pr-0.5 custom-scrollbar touch-pan-y">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 font-semibold">
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2.5 border ${
                      opt.disabled
                        ? 'opacity-50 cursor-not-allowed bg-slate-50 border-transparent text-slate-400'
                        : isSelected
                        ? `${selectedBgClasses} font-bold shadow-xs`
                        : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                      {opt.badge && (
                        <span
                          className={`px-2 py-0.5 border rounded-md font-black text-[11px] shrink-0 ${
                            isSelected
                              ? badgeBgClasses
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold leading-snug break-words">
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-slate-500 font-medium truncate">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 shrink-0 text-slate-800" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
