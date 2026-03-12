import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '../../../utils/cn';
import type { FillStyle } from '../../../types/schema';
import { fillToCssBackground } from './utils';
import { FillPanel } from './FillPanel';

export interface FillPickerProps {
    value: FillStyle;
    onChange?: (fill: FillStyle) => void;
    size?: 'small' | 'medium';
}

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
                            top: pos.top,
                            left: pos.left,
                            animation: 'tooltip-in-bottom 0.15s cubic-bezier(0.16,1,0.3,1) both',
                        }}
                        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200/80 p-3 w-62"
                    >
                        <FillPanel value={value} onChange={onChange} />
                    </div>,
                    document.body,
                )}
        </>
    );
};
