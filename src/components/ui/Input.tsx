import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

// ==================== NumberInput ====================
interface NumberInputProps {
  value: number;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
  className?: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export const NumberInput: React.FC<NumberInputProps> = ({
  value, onChange, min, max, step = 1, readOnly = false, className,
}) => {
  const [local, setLocal] = useState(String(round1(value)));

  useEffect(() => { setLocal(String(round1(value))); }, [value]);

  const commit = () => {
    const n = parseFloat(local);
    if (isNaN(n)) { setLocal(String(round1(value))); return; }
    const clamped = round1(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
    onChange?.(clamped);
    setLocal(String(clamped));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      readOnly={readOnly}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'ArrowUp') { e.preventDefault(); onChange?.(round1((parseFloat(local) || 0) + step)); }
        if (e.key === 'ArrowDown') { e.preventDefault(); onChange?.(round1((parseFloat(local) || 0) - step)); }
      }}
      className={cn(
        'w-full h-6 px-1.5 text-xs bg-transparent outline-none text-gray-700 tabular-nums',
        readOnly && 'cursor-not-allowed opacity-60',
        className
      )}
    />
  );
};

// ==================== TextArea ====================
interface TextAreaProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  className?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  value, onChange, placeholder, minRows = 2, maxRows = 6, className,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineH = parseInt(getComputedStyle(el).lineHeight) || 18;
    const minH = lineH * minRows;
    const maxH = lineH * maxRows;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minH), maxH)}px`;
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full text-xs bg-[#f5f5f5] rounded-md p-2 outline-none resize-none border border-transparent',
        'hover:border-gray-300 focus:border-blue-400 focus:bg-white transition-colors',
        className
      )}
    />
  );
};
