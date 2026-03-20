import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FillStyle, GradientColorStop } from '../../../types/schema';
import { DEFAULT_GRADIENT_STOPS, fillToDisplayColor } from './utils';
import { TypeButton, DirectionButton, HorizontalIcon, VerticalIcon, PresetGrid, ColorInputRow } from './shared';
import { SolidPanel } from './SolidPanel';
import { GradientBar } from './GradientBar';

interface FillPanelProps {
    value: FillStyle;
    onChange?: (fill: FillStyle) => void;
}

/** 渐变填充编辑面板，负责方向、色标位置和颜色调整。 */
export const GradientPanel: React.FC<FillPanelProps> = ({ value, onChange }) => {
    const fill = value.type === 'linear' ? value : { type: 'linear' as const, direction: 'horizontal' as const, colorStops: DEFAULT_GRADIENT_STOPS };
    const [activeStopIdx, setActiveStopIdx] = useState(0);
    const activeStop = fill.colorStops[activeStopIdx] ?? fill.colorStops[0];
    const { t } = useTranslation();

    /** 合并渐变 patch 并向外回传完整 FillStyle。 */
    const updateFill = (patch: Partial<typeof fill>) => {
        onChange?.({ ...fill, ...patch });
    };

    /** 更新当前激活色标的颜色。 */
    const updateStopColor = (color: string) => {
        const newStops = fill.colorStops.map((s, i) => (i === activeStopIdx ? { ...s, color } : s));
        updateFill({ colorStops: newStops });
    };

    /** 处理 GradientBar 回传的新色标数组与新的激活索引。 */
    const handleStopChange = (newStops: GradientColorStop[], newActiveIdx: number) => {
        setActiveStopIdx(newActiveIdx);
        updateFill({ colorStops: newStops });
    };

    /** 根据用户输入的百分比更新当前激活色标位置。 */
    const handlePositionInput = (percent: number) => {
        const offset = Math.max(0, Math.min(100, percent)) / 100;
        const newStops = fill.colorStops.map((s, i) => (i === activeStopIdx ? { ...s, offset } : s));
        const sorted = [...newStops].sort((a, b) => a.offset - b.offset);
        // 为什么更新后要重新计算 activeIdx：
        // 色标排序后原来的索引可能失效，如果不重算，后续颜色编辑会作用到错误的 stop 上。
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

/** 填充面板总入口，在纯色与渐变两种编辑器之间切换。 */
export const FillPanel: React.FC<FillPanelProps> = ({ value, onChange }) => {
    const isGradient = value.type === 'linear';
    const { t } = useTranslation();

    /** 切换填充类型，并为目标类型构造一份合理的默认值。 */
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
