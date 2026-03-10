import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import type { FillStyle, GradientColorStop } from '../../types/schema';

// ─── 工具函数 ──────────────────────────────────────────────

function fillToDisplayColor(fill: FillStyle): string {
    if (fill.type === 'solid') return fill.color;
    return fill.colorStops[0]?.color ?? '#000000';
}

function fillToCssBackground(fill: FillStyle): string {
    if (fill.type === 'solid') return fill.color;
    const dir = fill.direction === 'horizontal' ? 'to right' : 'to bottom';
    const stops = fill.colorStops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
    return `linear-gradient(${dir}, ${stops})`;
}

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

/** 在两个颜色之间线性插值 */
function lerpColor(a: string, b: string, t: number): string {
    const [r1, g1, b1] = hexToRgb(a);
    const [r2, g2, b2] = hexToRgb(b);
    return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

const DEFAULT_GRADIENT_STOPS: GradientColorStop[] = [
    { offset: 0, color: '#000000' },
    { offset: 1, color: '#ffffff' },
];

const PRESET_COLORS = [
    '#000000', '#333333', '#555555', '#888888', '#aaaaaa', '#cccccc', '#eeeeee', '#ffffff',
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
];

// ─── Props ─────────────────────────────────────────────────

interface FillPickerProps {
    value: FillStyle;
    onChange?: (fill: FillStyle) => void;
    size?: 'small' | 'medium';
}

// ─── 组件 ──────────────────────────────────────────────────

export const FillPicker: React.FC<FillPickerProps> = ({ value, onChange, size = 'medium' }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const updatePos = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const panelW = 248;
        const panelH = 380;
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

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={toggle}
                className={cn(
                    swatchSize,
                    'rounded-md border border-gray-200 cursor-pointer hover:border-gray-400 transition-all shrink-0 shadow-sm hover:shadow',
                    open && 'ring-2 ring-blue-400/40 border-blue-300',
                )}
                style={{ background: fillToCssBackground(value) }}
            />
            {open &&
                ReactDOM.createPortal(
                    <div
                        ref={panelRef}
                        style={{
                            position: 'fixed',
                            top: pos.top,
                            left: pos.left,
                            zIndex: 99999,
                            animation: 'tooltip-in-bottom 0.15s cubic-bezier(0.16,1,0.3,1) both',
                        }}
                        className="bg-white rounded-xl shadow-2xl border border-gray-200/80 p-3 w-62"
                    >
                        <FillPanel value={value} onChange={onChange} />
                    </div>,
                    document.body,
                )}
        </>
    );
};

// ─── 面板内部 ──────────────────────────────────────────────

interface FillPanelProps {
    value: FillStyle;
    onChange?: (fill: FillStyle) => void;
}

const FillPanel: React.FC<FillPanelProps> = ({ value, onChange }) => {
    const isGradient = value.type === 'linear';
    const { t } = useTranslation();

    const handleTypeSwitch = (type: 'solid' | 'linear') => {
        if (type === 'solid' && value.type !== 'solid') {
            onChange?.({ type: 'solid', color: fillToDisplayColor(value) });
        } else if (type === 'linear' && value.type !== 'linear') {
            const baseColor = value.type === 'solid' ? value.color : '#000000';
            onChange?.({
                type: 'linear',
                direction: 'horizontal',
                colorStops: [
                    { offset: 0, color: baseColor },
                    { offset: 1, color: '#ffffff' },
                ],
            });
        }
    };

    return (
        <div className="flex flex-col gap-3">
            {/* 填充类型切换 */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                <TypeButton active={!isGradient} onClick={() => handleTypeSwitch('solid')} label={t('rightPanel.solidFill')} />
                <TypeButton active={isGradient} onClick={() => handleTypeSwitch('linear')} label={t('rightPanel.gradientFill')} />
            </div>

            {isGradient ? (
                <GradientPanel value={value} onChange={onChange} />
            ) : (
                <SolidPanel value={value} onChange={onChange} />
            )}
        </div>
    );
};

// ─── 纯色面板 ──────────────────────────────────────────────

const SolidPanel: React.FC<FillPanelProps> = ({ value, onChange }) => {
    const color = value.type === 'solid' ? value.color : '#000000';
    const commit = (c: string) => onChange?.({ type: 'solid', color: c });

    return (
        <>
            <PresetGrid currentColor={color} onSelect={commit} />
            <div className="h-px bg-gray-100" />
            <ColorInputRow color={color} onChange={commit} />
        </>
    );
};

// ─── 渐变面板 ──────────────────────────────────────────────

const GradientPanel: React.FC<FillPanelProps> = ({ value, onChange }) => {
    const fill = value.type === 'linear' ? value : { type: 'linear' as const, direction: 'horizontal' as const, colorStops: DEFAULT_GRADIENT_STOPS };
    const [activeStopIdx, setActiveStopIdx] = useState(0);
    const activeStop = fill.colorStops[activeStopIdx] ?? fill.colorStops[0];
    const { t } = useTranslation();

    const updateFill = (patch: Partial<typeof fill>) => {
        onChange?.({ ...fill, ...patch });
    };

    const updateStopColor = (color: string) => {
        const newStops = fill.colorStops.map((s, i) => (i === activeStopIdx ? { ...s, color } : s));
        updateFill({ colorStops: newStops });
    };

    const handleStopChange = (newStops: GradientColorStop[], newActiveIdx: number) => {
        setActiveStopIdx(newActiveIdx);
        updateFill({ colorStops: newStops });
    };

    const handlePositionInput = (percent: number) => {
        const offset = Math.max(0, Math.min(100, percent)) / 100;
        const newStops = fill.colorStops.map((s, i) => (i === activeStopIdx ? { ...s, offset } : s));
        const sorted = [...newStops].sort((a, b) => a.offset - b.offset);
        const newIdx = sorted.findIndex((s) => s.offset === offset && s.color === activeStop.color);
        setActiveStopIdx(newIdx >= 0 ? newIdx : 0);
        updateFill({ colorStops: sorted });
    };

    return (
        <>
            {/* 渐变方向 */}
            <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-8 shrink-0">{t('rightPanel.gradientDirection')}</span>
                <div className="flex gap-1 flex-1">
                    <DirectionButton
                        active={fill.direction === 'horizontal'}
                        onClick={() => updateFill({ direction: 'horizontal' })}
                        label={t('rightPanel.gradientHorizontal')}
                        icon={<HorizontalIcon />}
                    />
                    <DirectionButton
                        active={fill.direction === 'vertical'}
                        onClick={() => updateFill({ direction: 'vertical' })}
                        label={t('rightPanel.gradientVertical')}
                        icon={<VerticalIcon />}
                    />
                </div>
            </div>

            {/* 渐变预览条 + Figma 风格色标 */}
            <GradientBar
                colorStops={fill.colorStops}
                direction={fill.direction}
                activeIndex={activeStopIdx}
                onChange={handleStopChange}
            />

            {/* 色标位置 — 行内输入 */}
            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center h-7 bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
                    <span className="pl-2 text-[10px] text-gray-400 select-none shrink-0">{t('rightPanel.gradientStopPosition', { percent: '' }).replace(/\s*%?\s*$/, '')}</span>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round((activeStop?.offset ?? 0) * 100)}
                        onChange={(e) => handlePositionInput(Number(e.target.value))}
                        className="w-10 h-full px-1 text-[11px] bg-transparent outline-none text-gray-700 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="pr-2 text-[10px] text-gray-400 select-none">%</span>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {fill.colorStops.length} {t('rightPanel.gradientStopInfo', { current: activeStopIdx + 1, total: fill.colorStops.length }).split(' ')[0]}
                </span>
            </div>

            {/* 当前色标颜色选择 */}
            <PresetGrid currentColor={activeStop?.color ?? '#000000'} onSelect={updateStopColor} />
            <div className="h-px bg-gray-100" />
            <ColorInputRow color={activeStop?.color ?? '#000000'} onChange={updateStopColor} />
        </>
    );
};

// ─── 渐变预览条 — Figma 风格（色标在下方，拖拽删除） ──────

interface GradientBarProps {
    colorStops: GradientColorStop[];
    direction: 'horizontal' | 'vertical';
    activeIndex: number;
    onChange: (stops: GradientColorStop[], activeIdx: number) => void;
}

const GradientBar: React.FC<GradientBarProps> = ({
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
        // 避免在已有色标太近处重复添加
        if (colorStops.some((s) => Math.abs(s.offset - offset) < 0.03)) return;
        // 插值颜色
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

        const onUp = (me: PointerEvent) => {
            target.releasePointerCapture(me.pointerId);
            target.removeEventListener('pointermove', onMove);
            target.removeEventListener('pointerup', onUp);
            setRemovingIdx(null);

            const dy = Math.abs(me.clientY - barRect.bottom);
            if (colorStops.length > 2 && dy > 30) {
                // 拖离删除
                const newStops = colorStops.filter((_, i) => i !== idx);
                onChange(newStops, Math.min(activeIndex, newStops.length - 1));
            }
        };

        onChange(colorStops, idx); // 选中
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

// ─── 共享小组件 ────────────────────────────────────────────

const PresetGrid: React.FC<{ currentColor: string; onSelect: (c: string) => void }> = ({
    currentColor,
    onSelect,
}) => (
    <div className="grid grid-cols-8 gap-1.5">
        {PRESET_COLORS.map((c) => (
            <button
                key={c}
                type="button"
                onClick={() => onSelect(c)}
                className={cn(
                    'w-6 h-6 rounded-md cursor-pointer transition-all hover:scale-110 border',
                    currentColor.toLowerCase() === c.toLowerCase()
                        ? 'ring-2 ring-blue-400 ring-offset-1 border-blue-300'
                        : c === '#ffffff'
                            ? 'border-gray-200'
                            : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
            />
        ))}
    </div>
);

const ColorInputRow: React.FC<{ color: string; onChange: (c: string) => void }> = ({ color, onChange }) => {
    const [hex, setHex] = useState(color);
    const [prevColor, setPrevColor] = useState(color);

    if (color !== prevColor) {
        setPrevColor(color);
        setHex(color);
    }

    return (
        <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shrink-0 cursor-pointer hover:border-gray-300 transition-colors">
                <input
                    type="color"
                    value={hex || '#000000'}
                    onChange={(e) => {
                        setHex(e.target.value);
                        onChange(e.target.value);
                    }}
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
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
                    }}
                    onBlur={() => {
                        if (!/^#[0-9a-fA-F]{6}$/.test(hex)) setHex(color);
                    }}
                    className="flex-1 h-full px-1 text-xs bg-transparent outline-none font-mono uppercase text-gray-700"
                    maxLength={6}
                />
            </div>
        </div>
    );
};

const TypeButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            'flex-1 text-[11px] py-1 rounded-md cursor-pointer transition-all font-medium',
            active ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600',
        )}
    >
        {label}
    </button>
);

const DirectionButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon: React.ReactNode }> = ({
    active,
    onClick,
    label,
    icon,
}) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all border',
            active ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100',
        )}
    >
        {icon}
        {label}
    </button>
);

const HorizontalIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="3" width="10" height="6" rx="1" fill="url(#hg)" />
        <defs>
            <linearGradient id="hg" x1="1" y1="6" x2="11" y2="6">
                <stop stopColor="currentColor" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.15" />
            </linearGradient>
        </defs>
    </svg>
);

const VerticalIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="3" y="1" width="6" height="10" rx="1" fill="url(#vg)" />
        <defs>
            <linearGradient id="vg" x1="6" y1="1" x2="6" y2="11">
                <stop stopColor="currentColor" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.15" />
            </linearGradient>
        </defs>
    </svg>
);
