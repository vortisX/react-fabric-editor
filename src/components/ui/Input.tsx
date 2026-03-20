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

/** 把数值统一保留 1 位小数，减少输入框里出现过长浮点值。 */
const round1 = (n: number) => Math.round(n * 10) / 10;

/** 通用数字输入框，支持回车提交、失焦提交与上下方向键步进。 */
export const NumberInput: React.FC<NumberInputProps> = ({
  value, onChange, min, max, step = 1, readOnly = false, className,
}) => {
  const [local, setLocal] = useState(String(round1(value)));

  useEffect(() => { setLocal(String(round1(value))); }, [value]);

  /** 把本地字符串提交为数值，并应用最小值/最大值限制。 */
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
        // 上下键提供轻量级步进能力，方便面板里快速微调数值。
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

/** 自动高度文本域，会根据内容在最小/最大行数之间伸缩。 */
export const TextArea: React.FC<TextAreaProps> = ({
  value, onChange, placeholder, minRows = 2, maxRows = 6, className,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  /** 根据 scrollHeight 自动调整 textarea 高度，避免出现多余滚动条。 */
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
