import { CANVAS_MAX_PX, CANVAS_MIN_PX, CANVAS_PRESETS, type CanvasPresetId, MM_PER_CM, MM_PER_IN, PX_TO_MM, type CanvasUnit } from './constants';

export function clampCanvasPx(value: number): number {
  return Math.min(CANVAS_MAX_PX, Math.max(CANVAS_MIN_PX, value));
}

export function convertPxToUnit(px: number, unit: CanvasUnit): number {
  if (unit === 'px') return px;
  const mm = px * PX_TO_MM;
  if (unit === 'mm') return mm;
  if (unit === 'cm') return mm / MM_PER_CM;
  return mm / MM_PER_IN;
}

export function convertUnitToPx(value: number, unit: CanvasUnit): number {
  if (unit === 'px') return value;
  if (unit === 'mm') return value / PX_TO_MM;
  if (unit === 'cm') return (value * MM_PER_CM) / PX_TO_MM;
  return (value * MM_PER_IN) / PX_TO_MM;
}

export type DragEdge = 'left' | 'right' | 'top' | 'bottom';

export function computeCanvasSizeFromDrag(params: {
  edge: DragEdge;
  startWidthPx: number;
  startHeightPx: number;
  deltaX: number;
  deltaY: number;
}): { widthPx: number; heightPx: number } {
  const { edge, startWidthPx, startHeightPx, deltaX, deltaY } = params;

  if (edge === 'left') {
    return { widthPx: clampCanvasPx(startWidthPx - deltaX), heightPx: clampCanvasPx(startHeightPx) };
  }
  if (edge === 'right') {
    return { widthPx: clampCanvasPx(startWidthPx + deltaX), heightPx: clampCanvasPx(startHeightPx) };
  }
  if (edge === 'top') {
    return { widthPx: clampCanvasPx(startWidthPx), heightPx: clampCanvasPx(startHeightPx - deltaY) };
  }
  return { widthPx: clampCanvasPx(startWidthPx), heightPx: clampCanvasPx(startHeightPx + deltaY) };
}

export function presetToPx(presetId: CanvasPresetId): { widthPx: number; heightPx: number } | null {
  const preset = CANVAS_PRESETS.find((p) => p.id === presetId);
  if (!preset || preset.id === 'custom') return null;
  return {
    widthPx: Math.round(convertUnitToPx(preset.width, preset.unit)),
    heightPx: Math.round(convertUnitToPx(preset.height, preset.unit)),
  };
}

export function matchCanvasPresetId(widthPx: number, heightPx: number): CanvasPresetId {
  for (const preset of CANVAS_PRESETS) {
    if (preset.id === 'custom') continue;
    const w = Math.round(convertUnitToPx(preset.width, preset.unit));
    const h = Math.round(convertUnitToPx(preset.height, preset.unit));
    if (w === Math.round(widthPx) && h === Math.round(heightPx)) return preset.id;
  }
  return 'custom';
}
