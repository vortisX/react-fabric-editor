import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';

interface ColorPickerProps {
  value: string;
  onChange?: (color: string) => void;
  size?: 'small' | 'medium';
  allowClear?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value, onChange, size = 'medium', allowClear = false,
}) => {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value || '#000000');
  const [prevValue, setPrevValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  if (value !== prevValue) {
    setPrevValue(value);
    setLocal(value || '#000000');
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const commit = useCallback((color: string) => {
    setLocal(color);
    onChange?.(color);
  }, [onChange]);

  const swatchSize = size === 'small' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(swatchSize, 'rounded border border-gray-300 cursor-pointer hover:border-gray-400 transition-colors flex-shrink-0')}
        style={{ backgroundColor: local }}
      />
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-52">
          <input
            type="color"
            value={local}
            onChange={(e) => commit(e.target.value)}
            className="w-full h-32 rounded cursor-pointer border-0 p-0"
          />
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={local}
              onChange={(e) => {
                setLocal(e.target.value);
                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) commit(e.target.value);
              }}
              onBlur={() => {
                if (!/^#[0-9a-fA-F]{6}$/.test(local)) setLocal(value || '#000000');
              }}
              className="flex-1 h-6 px-2 text-xs bg-[#f5f5f5] rounded border border-transparent outline-none font-mono uppercase"
            />
            {allowClear && (
              <button
                type="button"
                onClick={() => { commit(''); setOpen(false); }}
                className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer"
              >
                清除
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
