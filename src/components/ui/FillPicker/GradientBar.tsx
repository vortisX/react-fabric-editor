import React, { useRef, useState } from 'react';
import { cn } from '../../../utils/cn';
import type { GradientColorStop } from '../../../types/schema';
import { lerpColor } from './utils';

interface GradientBarProps {
    colorStops: GradientColorStop[];
    direction: 'horizontal' | 'vertical';
    activeIndex: number;
    onChange: (stops: GradientColorStop[], activeIdx: number) => void;
}

/** 渐变预览条与色标拖拽区域，负责新增、移动、删除渐变 stop。 */
export const GradientBar: React.FC<GradientBarProps> = ({
    colorStops,
    direction,
    activeIndex,
    onChange,
}) => {
    const barRef = useRef<HTMLDivElement>(null);
    const [removingIdx, setRemovingIdx] = useState<number | null>(null);

    const dir = direction === 'horizontal' ? 'to right' : 'to bottom';
    const stops = colorStops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
    const bgStyle = `linear-gradient(${dir}, ${stops})`;

    /** 把鼠标横向位置转换成 0~1 之间的渐变 offset。 */
    const getOffset = (clientX: number) => {
        const rect = barRef.current?.getBoundingClientRect();
        if (!rect) return 0;
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        return Math.round((x / rect.width) * 100) / 100;
    };

    /** 点击渐变条空白处 → 添加色标 */
    const handleBarClick = (e: React.MouseEvent) => {
        const rect = barRef.current?.getBoundingClientRect();
        if (!rect) return;
        const offset = getOffset(e.clientX);
        // 避免在已有色标太近处重复添加。
        if (colorStops.some((s) => Math.abs(s.offset - offset) < 0.03)) return;
        // 插值颜色。
        const sorted = [...colorStops].sort((a, b) => a.offset - b.offset);
        let color = '#888888';
        for (let i = 0; i < sorted.length - 1; i++) {
            if (offset >= sorted[i].offset && offset <= sorted[i + 1].offset) {
                const t = (offset - sorted[i].offset) / (sorted[i + 1].offset - sorted[i].offset || 1);
                color = lerpColor(sorted[i].color, sorted[i + 1].color, t);
                break;
            }
        }
        const newStops = [...colorStops, { offset, color }].sort((a, b) => a.offset - b.offset);
        const newIdx = newStops.findIndex((s) => s.offset === offset);
        onChange(newStops, newIdx >= 0 ? newIdx : 0);
    };

    /** 色标拖拽（含拖离删除） */
    const handleStopPointerDown = (idx: number) => (e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const barRect = barRef.current?.getBoundingClientRect();
        if (!barRect) return;

        let currentStops = [...colorStops];
        let currentIdx = idx;
        let removed = false;

        /** 拖拽过程中实时更新色标位置，并处理“拖离删除”态。 */
        const onMove = (me: PointerEvent) => {
            const dy = Math.abs(me.clientY - barRect.bottom);
            const canRemove = currentStops.length > 2 && dy > 30;

            if (canRemove && !removed) {
                setRemovingIdx(currentIdx);
            } else {
                setRemovingIdx(null);
            }

            if (!canRemove) {
                removed = false;
                const offset = getOffset(me.clientX);
                currentStops = colorStops.map((s, i) => (i === idx ? { ...s, offset } : s));
                const sorted = [...currentStops].sort((a, b) => a.offset - b.offset);
                currentIdx = sorted.findIndex((s) => s === currentStops[idx]);
                onChange(sorted, currentIdx >= 0 ? currentIdx : 0);
            }
        };

        /** 拖拽结束时决定是保留当前位置，还是直接删除当前色标。 */
        const onUp = (me: PointerEvent) => {
            target.releasePointerCapture(me.pointerId);
            target.removeEventListener('pointermove', onMove);
            target.removeEventListener('pointerup', onUp);
            setRemovingIdx(null);

            const dy = Math.abs(me.clientY - barRect.bottom);
            if (colorStops.length > 2 && dy > 30) {
                // 拖离删除。
                const newStops = colorStops.filter((_, i) => i !== idx);
                onChange(newStops, Math.min(activeIndex, newStops.length - 1));
            }
        };

        onChange(colorStops, idx); // 选中当前 stop，便于下面的颜色/位置编辑面板同步切换。
        target.addEventListener('pointermove', onMove);
        target.addEventListener('pointerup', onUp);
    };

    return (
        <div className="flex flex-col gap-0">
            {/* 渐变预览条 */}
            <div
                ref={barRef}
                className="relative h-6 rounded-md cursor-crosshair border border-gray-200 shadow-inner"
                style={{ background: bgStyle }}
                onClick={handleBarClick}
            />
            {/* 色标手柄区域 — 位于渐变条正下方 */}
            <div className="relative h-4 mt-0.5" style={{ marginLeft: 0, marginRight: 0 }}>
                {colorStops.map((stop, i) => {
                    const isActive = i === activeIndex;
                    const isRemoving = i === removingIdx;
                    return (
                        <div
                            key={i}
                            className="absolute top-0 flex flex-col items-center"
                            style={{
                                left: `calc(${stop.offset * 100}% - 6px)`,
                                opacity: isRemoving ? 0.3 : 1,
                                transition: 'opacity 0.15s',
                            }}
                            onPointerDown={handleStopPointerDown(i)}
                        >
                            {/* 上三角指向渐变条 */}
                            <svg width="12" height="5" viewBox="0 0 12 5" className="shrink-0">
                                <polygon
                                    points="6,0 12,5 0,5"
                                    fill={isActive ? '#3b82f6' : '#d1d5db'}
                                />
                            </svg>
                            {/* 色标圆点 */}
                            <div
                                className={cn(
                                    'w-3 h-3 rounded-full border-2 cursor-grab shadow-sm',
                                    isActive ? 'border-blue-500 ring-1 ring-blue-300/60' : 'border-gray-300',
                                )}
                                style={{ backgroundColor: stop.color, marginTop: '-1px' }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
