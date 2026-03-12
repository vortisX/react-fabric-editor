import type { FillStyle, GradientColorStop } from '../../../types/schema';

export function fillToDisplayColor(fill: FillStyle): string {
    if (fill.type === 'solid') return fill.color;
    return fill.colorStops[0]?.color ?? '#000000';
}

export function fillToCssBackground(fill: FillStyle): string {
    if (fill.type === 'solid') return fill.color;
    const dir = fill.direction === 'horizontal' ? 'to right' : 'to bottom';
    const stops = fill.colorStops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
    return `linear-gradient(${dir}, ${stops})`;
}

export function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

/** 在两个颜色之间线性插值 */
export function lerpColor(a: string, b: string, t: number): string {
    const [r1, g1, b1] = hexToRgb(a);
    const [r2, g2, b2] = hexToRgb(b);
    return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export const DEFAULT_GRADIENT_STOPS: GradientColorStop[] = [
    { offset: 0, color: '#000000' },
    { offset: 1, color: '#ffffff' },
];

export const PRESET_COLORS = [
    '#000000', '#333333', '#555555', '#888888', '#aaaaaa', '#cccccc', '#eeeeee', '#ffffff',
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
];
