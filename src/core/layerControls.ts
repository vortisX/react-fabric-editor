import { FabricObject, Control, controlsUtils, FabricImage } from 'fabric';
import { applyCursorsToControls } from './cursors';

// ==================== 圆角矩形路径工具 ====================

/**
 * Draws a rounded rectangle path. Falls back to a plain rect in environments
 * that do not support the native roundRect API.
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// ==================== 胶囊控制点渲染 ====================

/**
 * Custom render function for ml/mr side handles.
 * Draws a vertical pill (capsule) shape that follows the object's rotation.
 */
const renderVerticalPill = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Record<string, unknown>,
  fabricObj: FabricObject,
): void => {
  ctx.save();
  ctx.translate(left, top);
  // 跟随对象旋转角度，保持胶囊方向与对象一致
  const angle = ((fabricObj.angle ?? 0) * Math.PI) / 180;
  ctx.rotate(angle);
  ctx.fillStyle =
    (styleOverride?.cornerColor as string) || fabricObj.cornerColor || '#ffffff';
  ctx.strokeStyle =
    (styleOverride?.cornerStrokeColor as string) || fabricObj.cornerStrokeColor || '#18a0fb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundedRect(ctx, -3, -7, 6, 14, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

// ==================== 公共宽度调整处理器 ====================

/**
 * Shared action handler for ml/mr width-resize controls.
 * Works for both text and image layers:
 * - All objects: delegates to fabric's changeWidth
 * - Text objects (duck-typed via autoFitHeight): also re-wraps lines and fits height
 */
const handleWidth = (
  eventData: unknown,
  transform: unknown,
  x: number,
  y: number,
): boolean => {
  const changed = (
    controlsUtils.changeWidth as unknown as (
      a: unknown, b: unknown, c: number, d: number,
    ) => boolean
  )(eventData, transform, x, y);

  const t = (transform as { target?: unknown })?.target;
  // 鸭子类型检测文字图层：有 autoFitHeight 方法则为 CustomTextbox，需要额外重排
  if (
    changed &&
    t !== null &&
    t !== undefined &&
    typeof (t as Record<string, unknown>).autoFitHeight === 'function'
  ) {
    const tb = t as {
      initDimensions: () => void;
      autoFitHeight: () => void;
      canvas?: { requestRenderAll: () => void };
    };
    tb.initDimensions();
    tb.autoFitHeight();
    tb.canvas?.requestRenderAll();
  }

  return changed;
};

// ==================== 公共图层控制点应用 ====================

/**
 * Applies the shared layer control style to any Fabric object (text or image):
 * - Hides top / bottom / default-rotation (mtr) handles
 * - Replaces left / right handles with vertical pill shapes
 * - Adds Figma-style invisible corner rotation zones
 * - Applies custom SVG resize & rotation cursors
 */
export function applyLayerControls(obj: FabricObject): void {
  const controls = obj.controls as Record<string, Control & { _isEnhanced?: boolean }>;
  if (!controls) return;

  // 隐藏上下拉伸手柄和原始旋转手柄
  if (controls.mtr) controls.mtr.visible = false;
  
  // 对于非图片对象（如文本），隐藏上下手柄；图片对象保留以便调整高度/拉伸
  const isImage = obj instanceof FabricImage;
  if (!isImage) {
    if (controls.mt) controls.mt.visible = false;
    if (controls.mb) controls.mb.visible = false;
  }

  // 将左右手柄替换为胶囊形状
  // 对于非图片对象（如文本），使用 handleWidth (changeWidth) 以改变 width 属性（重排文字）
  // 对于图片对象，保留默认的 scalingX 行为（改变 scaleX），但应用自定义渲染

  if (controls.ml && !controls.ml._isEnhanced) {
    controls.ml.render = renderVerticalPill;
    if (!isImage) {
      controls.ml.actionHandler = handleWidth as unknown as Control['actionHandler'];
      controls.ml.actionName = 'resizing';
    }
    controls.ml._isEnhanced = true;
  }
  if (controls.mr && !controls.mr._isEnhanced) {
    controls.mr.render = renderVerticalPill;
    if (!isImage) {
      controls.mr.actionHandler = handleWidth as unknown as Control['actionHandler'];
      controls.mr.actionName = 'resizing';
    }
    controls.mr._isEnhanced = true;
  }

  // 应用自定义 SVG 光标 + Figma 风格四角透明旋转热区
  applyCursorsToControls(obj);
}
