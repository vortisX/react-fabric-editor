import React, { useRef, useCallback, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface SliderProps {
  value: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

/** 通用滑块组件，支持拖拽过程回调与结束回调分离。 */
export const Slider: React.FC<SliderProps> = ({
  value, onChange, onChangeEnd, min = 0, max = 100, step = 1, className,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const percent = ((value - min) / (max - min)) * 100;

  /** 让指针事件始终拿到最新值，避免闭包里缓存旧 value。 */
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  /** 把鼠标横向位置换算成滑块数值，并按 step 吸附。 */
  const getValueFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return valueRef.current;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, stepped));
  }, [min, max, step]);

  /** 根据当前位置触发拖拽中的 onChange。 */
  const handleDrag = useCallback((clientX: number) => {
    const nextValue = getValueFromClientX(clientX);
    valueRef.current = nextValue;
    onChange?.(nextValue);
  }, [getValueFromClientX, onChange]);

  /** 按下时立即进入拖拽并同步当前点击位置对应的值。 */
  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handleDrag(e.clientX);
  };

  return (
    <div
      ref={trackRef}
      className={cn('relative h-5 flex items-center cursor-pointer select-none', className)}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => { if (e.buttons === 1) handleDrag(e.clientX); }}
      onPointerUp={() => onChangeEnd?.(valueRef.current)}
      onPointerCancel={() => onChangeEnd?.(valueRef.current)}
    >
      {/* 轨道：底层灰色，已选区域用主色覆盖。 */}
      <div className="absolute w-full h-1 bg-gray-200 rounded-full">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percent}%` }} />
      </div>
      {/* 拖块：始终跟随 percent 定位。 */}
      <div
        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -translate-x-1/2 shadow-sm"
        style={{ left: `${percent}%` }}
      />
    </div>
  );
};
