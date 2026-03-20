import React from 'react';
import type { FillStyle } from '../../../types/schema';
import { PresetGrid, ColorInputRow } from './shared';

interface FillPanelProps {
    value: FillStyle;
    onChange?: (fill: FillStyle) => void;
}

/** 纯色填充面板，只负责选择和输入单一颜色。 */
export const SolidPanel: React.FC<FillPanelProps> = ({ value, onChange }) => {
    const color = value.type === 'solid' ? value.color : '#000000';
    /** 把颜色字符串包装成 solid FillStyle 并向外提交。 */
    const commit = (c: string) => onChange?.({ type: 'solid', color: c });

    return (
        <>
            <PresetGrid currentColor={color} onSelect={commit} />
            <div className="h-px bg-gray-100" />
            <ColorInputRow color={color} onChange={commit} />
        </>
    );
};
