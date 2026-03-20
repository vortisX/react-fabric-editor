import React, { useState } from 'react';
import { cn } from '../../../utils/cn';
import { PRESET_COLORS } from './utils';

/** 预设颜色网格，供纯色和渐变 stop 复用。 */
export const PresetGrid: React.FC<{ currentColor: string; onSelect: (c: string) => void }> = ({
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

/** 颜色输入行，组合了原生 color input 与 HEX 文本输入。 */
export const ColorInputRow: React.FC<{ color: string; onChange: (c: string) => void }> = ({ color, onChange }) => {
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
                        // 输入非法 hex 时回退到外部当前颜色，避免半成品值长期停留在输入框里。
                        if (!/^#[0-9a-fA-F]{6}$/.test(hex)) setHex(color);
                    }}
                    className="flex-1 h-full px-1 text-xs bg-transparent outline-none font-mono uppercase text-gray-700"
                    maxLength={6}
                />
            </div>
        </div>
    );
};

/** 填充类型切换按钮。 */
export const TypeButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
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

/** 渐变方向切换按钮。 */
export const DirectionButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon: React.ReactNode }> = ({
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

/** 横向渐变图标。 */
export const HorizontalIcon = () => (
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

/** 纵向渐变图标。 */
export const VerticalIcon = () => (
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
