import { CANVAS_MAX_PX, CANVAS_MIN_PX, MM_PER_CM, MM_PER_IN, PX_TO_MM, type CanvasUnit } from './constants';
import { CANVAS_PRESETS, type CanvasPresetId } from './canvasPresets';

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

  // 左边向左拉(deltaX<0)→变宽；右边向右拉(deltaX>0)→变宽；上下边不影响宽度
  const newWidth =
    edge === 'left'  ? startWidthPx  - deltaX :
    edge === 'right' ? startWidthPx  + deltaX :
    startWidthPx;

  // 上边向上拉(deltaY<0)→变高；下边向下拉(deltaY>0)→变高；左右边不影响高度
  const newHeight =
    edge === 'top'    ? startHeightPx - deltaY :
    edge === 'bottom' ? startHeightPx + deltaY :
    startHeightPx;

  return { widthPx: clampCanvasPx(newWidth), heightPx: clampCanvasPx(newHeight) };
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
