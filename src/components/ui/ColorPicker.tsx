import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '../../utils/cn';

interface ColorPickerProps {
  value: string;
  onChange?: (color: string) => void;
  size?: 'small' | 'medium';
  allowClear?: boolean;
}

const PRESET_COLORS = [
  '#000000', '#333333', '#555555', '#888888', '#aaaaaa', '#cccccc', '#eeeeee', '#ffffff',
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
  '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value, onChange, size = 'medium', allowClear = false,
}) => {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value || '#000000');
  const [prevValue, setPrevValue] = useState(value);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  if (value !== prevValue) {
    setPrevValue(value);
    setHex(value || '#000000');
  }

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelW = 232;
    const panelH = 260;
    let top = rect.bottom + 6;
    let left = rect.left;
    if (top + panelH > window.innerHeight) top = rect.top - panelH - 6;
    if (left + panelW > window.innerWidth) left = window.innerWidth - panelW - 8;
    setPos({ top, left });
  }, []);

  const toggle = () => {
    if (!open) updatePos();
    setOpen(!open);
  };

  const commit = useCallback((color: string) => {
    setHex(color);
    onChange?.(color);
  }, [onChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const swatchSize = size === 'small' ? 'w-5 h-5' : 'w-6 h-6';
  const isTransparent = !hex || hex === 'transparent';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className={cn(
          swatchSize,
          'rounded-md border border-gray-200 cursor-pointer hover:border-gray-400 transition-all shrink-0 shadow-sm hover:shadow',
          open && 'ring-2 ring-blue-400/40 border-blue-300'
        )}
        style={{
          backgroundColor: isTransparent ? undefined : hex,
          backgroundImage: isTransparent
            ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
            : undefined,
          backgroundSize: isTransparent ? '6px 6px' : undefined,
          backgroundPosition: isTransparent ? '0 0, 0 3px, 3px -3px, -3px 0px' : undefined,
        }}
      />
      {open && ReactDOM.createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 99999,
            animation: 'tooltip-in-bottom 0.15s cubic-bezier(0.16,1,0.3,1) both',
          }}
          className="bg-white rounded-xl shadow-2xl border border-gray-200/80 p-3 w-58"
        >
          {/* Color swatches */}
          <div className="grid grid-cols-8 gap-1.5 mb-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => commit(c)}
                className={cn(
                  'w-6 h-6 rounded-md cursor-pointer transition-all hover:scale-110 border',
                  hex.toLowerCase() === c.toLowerCase()
                    ? 'ring-2 ring-blue-400 ring-offset-1 border-blue-300'
                    : c === '#ffffff' ? 'border-gray-200' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 mb-3" />

          {/* Native color input (styled) + Hex input */}
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shrink-0 cursor-pointer hover:border-gray-300 transition-colors">
              <input
                type="color"
                value={isTransparent ? '#000000' : hex}
                onChange={(e) => commit(e.target.value)}
                className="absolute inset-0 w-[150%] h-[150%] -top-1 -left-1 cursor-pointer border-0 p-0"
              />
            </div>
            <div className="flex-1 flex items-center h-8 bg-gray-50 rounded-lg border border-gray-200 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-200 transition-all overflow-hidden">
              <span className="pl-2 text-gray-400 text-xs select-none">#</span>
              <input
                type="text"
                value={(hex || '').replace(/^#/, '')}
                onChange={(e) => {
                  const v = '#' + e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                  setHex(v);
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) commit(v);
                }}
                onBlur={() => {
                  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) setHex(value || '#000000');
                }}
                className="flex-1 h-full px-1 text-xs bg-transparent outline-none font-mono uppercase text-gray-700"
                maxLength={6}
              />
            </div>
            {allowClear && (
              <button
                type="button"
                onClick={() => { commit(''); setOpen(false); }}
                className="h-8 px-2 text-[11px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
              >
                清除
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
