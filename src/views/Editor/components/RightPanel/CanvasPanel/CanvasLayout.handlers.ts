import { useEditorStore } from '../../../../../store/useEditorStore';
import { CANVAS_PRESETS, type CanvasPresetId } from '../../../../../core/canvas/canvasPresets';
import { presetToPx, convertUnitToPx } from '../../../../../core/canvas/canvasMath';
import { CANVAS_MIN_PX, CANVAS_MAX_PX, type CanvasUnit } from '../../../../../core/config/constants';
import type { FillStyle, GradientFill, PageBackground } from '../../../../../types/schema';

/**
 * 将 Schema 中的 PageBackground 转换为 FillPicker 所需的 FillStyle
 * 处理纯色与渐变背景，确保 FillPicker 能正确解析与展示
 */
export function normalizeFillFromBackground(bg: PageBackground): FillStyle {
  if (bg.type === 'color') return { type: 'solid', color: bg.value };
  if (bg.type === 'gradient') return bg.value;
  return { type: 'solid', color: '#ffffff' };
}

/** 
 * 根据 FillPicker 返回的 FillStyle 构造下一个 PageBackground 对象
 */
export function nextBackgroundFromFill(fill: FillStyle): PageBackground {
  if (fill.type === 'solid') return { type: 'color', value: fill.color };
  // 如果是渐变，因为 schema 里的 gradient 类型和 FillStyle 里的 gradient 数据结构一致
  return { type: 'gradient', value: fill as GradientFill };
}

/**
 * 处理预设尺寸下拉框的切换事件
 * 内部直接通过 getState() 操作 Store，避免把逻辑堆在 React 组件里
 */
export function handlePresetChange(presetId: CanvasPresetId): void {
  const preset = CANVAS_PRESETS.find((p) => p.id === presetId);
  if (!preset || preset.id === 'custom') return;

  const next = presetToPx(preset.id);
  if (!next) return;

  const { setCanvasUnit, setCanvasSizePx, requestFit } = useEditorStore.getState();
  setCanvasUnit(preset.unit);
  setCanvasSizePx(next.widthPx, next.heightPx, { commit: true });
  // 切换预设后，画布尺寸通常会发生较大变化，因此自动触发一次适应画布操作
  requestFit();
}

/**
 * 处理画布宽度或高度输入框的数值修改
 * 如果输入合法则提交到 Store，否则返回对应的错误文案 i18n key，让组件层去抛出提示
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
