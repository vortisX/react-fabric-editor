import { useEditorStore } from '../../../../../store/useEditorStore';
import { CANVAS_PRESETS, type CanvasPresetId } from '../../../../../core/canvasPresets';
import { presetToPx, convertUnitToPx } from '../../../../../core/canvasMath';
import { CANVAS_MIN_PX, CANVAS_MAX_PX, type CanvasUnit } from '../../../../../core/constants';
import type { FillStyle, GradientFill, PageBackground } from '../../../../../types/schema';

/**
 * Converts a PageBackground to a FillStyle for use with FillPicker.
 * Image backgrounds are treated as white solid fill (not editable via FillPicker).
 */
export function normalizeFillFromBackground(bg: PageBackground): FillStyle {
  if (bg.type === 'color') return { type: 'solid', color: bg.value };
  if (bg.type === 'gradient') return bg.value;
  return { type: 'solid', color: '#ffffff' };
}

/**
 * Converts a FillStyle back to a PageBackground for storage in the schema.
 */
export function nextBackgroundFromFill(fill: FillStyle): PageBackground {
  if (fill.type === 'solid') return { type: 'color', value: fill.color };
  // 渐变类型：fill 本身即为 GradientFill，直接包装成 GradientBackground
  return { type: 'gradient', value: fill as GradientFill };
}

/**
 * Handles canvas preset selection.
 * Updates unit and canvas size in the store via getState() to stay decoupled from React lifecycle.
 */
export function handlePresetChange(presetId: CanvasPresetId): void {
  const preset = CANVAS_PRESETS.find((p) => p.id === presetId);
  if (!preset || preset.id === 'custom') return;

  const next = presetToPx(preset.id);
  if (!next) return;

  const { setCanvasUnit, setCanvasSizePx, requestFit } = useEditorStore.getState();
  setCanvasUnit(preset.unit);
  setCanvasSizePx(next.widthPx, next.heightPx, { commit: true });
  // 切换预设后自动适应画布，防止画布过大或过小。
  requestFit();
}

/**
 * Handles manual dimension input change.
 * Returns the i18n error key on validation failure, or null on success.
 * The caller is responsible for translating the key via t().
 */
export function applyDimensionChange(
  kind: 'width' | 'height',
  valueInUnit: number | null,
  unit: CanvasUnit,
): 'rightPanel.canvasWidthError' | 'rightPanel.canvasHeightError' | null {
  if (valueInUnit === null) return null;

  const nextPx = Math.round(convertUnitToPx(valueInUnit, unit));
  const valid = nextPx >= CANVAS_MIN_PX && nextPx <= CANVAS_MAX_PX;

  if (!valid) {
    return kind === 'width' ? 'rightPanel.canvasWidthError' : 'rightPanel.canvasHeightError';
  }

  const { document, setCanvasSizePx } = useEditorStore.getState();
  if (!document) return null;

  const widthPx = document.global.width;
  const heightPx = document.global.height;

  if (kind === 'width') {
    setCanvasSizePx(nextPx, heightPx, { commit: true });
  } else {
    setCanvasSizePx(widthPx, nextPx, { commit: true });
  }

  return null;
}
