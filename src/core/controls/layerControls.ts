import { FabricObject, Control, controlsUtils, FabricImage, Group } from 'fabric';
import { EDITOR_GLOBAL_STYLE } from '../config/constants';
import { applyCursorsToControls } from './cursors';

// ==================== ???????? ====================

/**
 * ?????????
 * ??????????? `roundRect`?????????????????????
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

// ==================== ??????? ====================

/**
 * ??? ml/mr ???????
 * ??????????????
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
  const angle = ((fabricObj.angle ?? 0) * Math.PI) / 180;
  ctx.rotate(angle);
  ctx.fillStyle =
    (styleOverride?.cornerColor as string) || fabricObj.cornerColor || '#ffffff';
  ctx.strokeStyle =
    (styleOverride?.cornerStrokeColor as string) || fabricObj.cornerStrokeColor || '#18a0fb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundedRect(ctx, -3, -14, 6, 28, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

/**
 * ??? mt/mb ???????
 * ??????????????
 */
const renderHorizontalPill = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Record<string, unknown>,
  fabricObj: FabricObject,
): void => {
  ctx.save();
  ctx.translate(left, top);
  const angle = ((fabricObj.angle ?? 0) * Math.PI) / 180;
  ctx.rotate(angle);
  ctx.fillStyle =
    (styleOverride?.cornerColor as string) || fabricObj.cornerColor || '#ffffff';
  ctx.strokeStyle =
    (styleOverride?.cornerStrokeColor as string) || fabricObj.cornerStrokeColor || '#18a0fb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundedRect(ctx, -14, -3, 28, 6, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

type EnhancedControl = Control & { _isEnhanced?: boolean };

type EdgeControlConfig = {
  key: 'ml' | 'mr' | 'mt' | 'mb';
  x: number;
  y: number;
  cursorStyle: string;
  actionHandler?: Control['actionHandler'];
  actionName?: string;
};

/** ???????????????? Group ????????????? */
const ensureEdgeControl = (
  controls: Record<string, EnhancedControl>,
  config: EdgeControlConfig,
): EnhancedControl => {
  const existing = controls[config.key];
  if (existing) return existing;

  const control = new Control({
    x: config.x,
    y: config.y,
    cursorStyle: config.cursorStyle,
    actionHandler: config.actionHandler,
    actionName: config.actionName,
  }) as EnhancedControl;
  controls[config.key] = control;
  return control;
};

// ==================== ????????? ====================

/**
 * ml/mr ??????????
 * ???????????? width ??????????
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

  const target = (transform as { target?: unknown })?.target;
  if (
    changed &&
    target !== null &&
    target !== undefined &&
    typeof (target as Record<string, unknown>).autoFitHeight === 'function'
  ) {
    const textbox = target as {
      initDimensions: () => void;
      autoFitHeight: () => void;
      canvas?: { requestRenderAll: () => void };
    };
    textbox.initDimensions();
    textbox.autoFitHeight();
    textbox.canvas?.requestRenderAll();
  }

  return changed;
};

// ==================== ????????? ====================

/**
 * ??? Fabric ?????????????
 * - ??????????
 * - ???????????????
 * - ??????????????????
 * - ??????????????
 */
export function applyLayerControls(obj: FabricObject): void {
  obj.set(EDITOR_GLOBAL_STYLE);

  const controls = obj.controls as Record<string, EnhancedControl>;
  if (!controls) return;

  if (controls.mtr) controls.mtr.visible = false;

  const supportsFullResize = obj instanceof FabricImage || obj instanceof Group;
  const sideResizeHandler = supportsFullResize
    ? (controlsUtils.scalingXOrSkewingY as unknown as Control['actionHandler'])
    : (handleWidth as unknown as Control['actionHandler']);

  const ml = ensureEdgeControl(controls, {
    key: 'ml',
    x: -0.5,
    y: 0,
    cursorStyle: 'ew-resize',
    actionHandler: sideResizeHandler,
    actionName: supportsFullResize ? 'scale' : 'resizing',
  });
  const mr = ensureEdgeControl(controls, {
    key: 'mr',
    x: 0.5,
    y: 0,
    cursorStyle: 'ew-resize',
    actionHandler: sideResizeHandler,
    actionName: supportsFullResize ? 'scale' : 'resizing',
  });

  if (!ml._isEnhanced) {
    ml.render = renderVerticalPill;
    ml._isEnhanced = true;
  }
  if (!mr._isEnhanced) {
    mr.render = renderVerticalPill;
    mr._isEnhanced = true;
  }

  const verticalResizeHandler =
    controlsUtils.scalingYOrSkewingX as unknown as Control['actionHandler'];

  const mt = ensureEdgeControl(controls, {
    key: 'mt',
    x: 0,
    y: -0.5,
    cursorStyle: 'ns-resize',
    actionHandler: verticalResizeHandler,
    actionName: 'scale',
  });
  const mb = ensureEdgeControl(controls, {
    key: 'mb',
    x: 0,
    y: 0.5,
    cursorStyle: 'ns-resize',
    actionHandler: verticalResizeHandler,
    actionName: 'scale',
  });

  if (!supportsFullResize) {
    mt.visible = false;
    mb.visible = false;
  } else {
    mt.visible = true;
    mb.visible = true;

    if (!mt._isEnhanced) {
      mt.render = renderHorizontalPill;
      mt._isEnhanced = true;
    }
    if (!mb._isEnhanced) {
      mb.render = renderHorizontalPill;
      mb._isEnhanced = true;
    }
  }

  applyCursorsToControls(obj);
}
