import React, { useRef, useCallback } from 'react';
import { cn } from '../../utils/cn';

interface SliderProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value, onChange, min = 0, max = 100, step = 1, className,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const percent = ((value - min) / (max - min)) * 100;

  const handleDrag = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    onChange?.(Math.max(min, Math.min(max, stepped)));
  }, [min, max, step, onChange]);

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
    >
      {/* 轨道 */}
      <div className="absolute w-full h-1 bg-gray-200 rounded-full">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percent}%` }} />
      </div>
      {/* 拖块 */}
      <div
        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -translate-x-1/2 shadow-sm"
        style={{ left: `${percent}%` }}
      />
    </div>
  );
};
