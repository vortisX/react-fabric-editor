import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange?: (value: string) => void;
  options: Option[];
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, options, className }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-7 px-2 text-xs bg-[#f5f5f5] rounded border border-transparent hover:border-gray-300 flex items-center justify-between cursor-pointer transition-colors"
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <svg className={cn('w-3 h-3 text-gray-400 transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange?.(opt.value); setOpen(false); }}
              className={cn(
                'px-2 py-1.5 text-xs cursor-pointer hover:bg-blue-50 transition-colors',
                opt.value === value && 'bg-blue-50 text-blue-600 font-medium'
              )}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
