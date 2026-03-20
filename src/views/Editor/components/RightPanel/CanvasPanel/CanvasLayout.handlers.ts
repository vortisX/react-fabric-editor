import { useEditorStore } from '../../../../../store/useEditorStore';
import { CANVAS_PRESETS, type CanvasPresetId } from '../../../../../core/canvasPresets';
import { presetToPx, convertUnitToPx } from '../../../../../core/canvasMath';
import { CANVAS_MIN_PX, CANVAS_MAX_PX, type CanvasUnit } from '../../../../../core/constants';
import type { FillStyle, GradientFill, PageBackground } from '../../../../../types/schema';

/**
 * 把 Schema 里的页面背景转换成 FillPicker 可消费的填充结构。
 * 图片背景暂时视为纯白填充，因为当前 FillPicker 不负责编辑背景图。
 */
export function normalizeFillFromBackground(bg: PageBackground): FillStyle {
  if (bg.type === 'color') return { type: 'solid', color: bg.value };
  if (bg.type === 'gradient') return bg.value;
  return { type: 'solid', color: '#ffffff' };
}

/** 把 FillPicker 返回的填充结构重新转换成可落库的页面背景数据。 */
export function nextBackgroundFromFill(fill: FillStyle): PageBackground {
  if (fill.type === 'solid') return { type: 'color', value: fill.color };
  // 渐变类型：fill 本身即为 GradientFill，直接包装成 GradientBackground
  return { type: 'gradient', value: fill as GradientFill };
}

/**
 * 处理画布预设切换。
 * 这里直接通过 getState() 更新 Store，保持处理逻辑与 React 生命周期解耦。
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
 * 处理手动输入的画布尺寸。
 * 校验失败时返回 i18n key，成功时返回 null，翻译工作由调用方通过 `t()` 完成。
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
