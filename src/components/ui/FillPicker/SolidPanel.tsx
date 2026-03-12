import React from 'react';
import type { FillStyle } from '../../../types/schema';
import { PresetGrid, ColorInputRow } from './shared';

interface FillPanelProps {
    value: FillStyle;
    onChange?: (fill: FillStyle) => void;
}

export const SolidPanel: React.FC<FillPanelProps> = ({ value, onChange }) => {
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
