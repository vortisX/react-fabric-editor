import { FabricObject } from 'fabric';

// 严格定义样式覆写接口
interface StyleOverride {
  cornerColor?: string;
  cornerStrokeColor?: string;
}

// 严格定义控制点接口，消灭 any
interface FabricControl {
  visible?: boolean;
  render?: (ctx: CanvasRenderingContext2D, left: number, top: number, styleOverride: StyleOverride, fabricObj: FabricObject) => void;
  actionHandler?: unknown; // 补充操作处理器的类型
  getActionName?: unknown;
  _isEnhanced?: boolean; 
}

// ==========================================
// 🎨 全局基础皮肤配置
// ==========================================
export const setupGlobalUI = () => {
  const objProto = FabricObject.prototype as unknown as Record<string, unknown>;
  objProto.transparentCorners = false;
  objProto.cornerColor = '#ffffff';
  objProto.cornerStrokeColor = '#18a0fb';
  objProto.borderColor = '#18a0fb';
  objProto.cornerSize = 8;
  objProto.padding = 0;
  objProto.cornerStyle = 'circle';
  objProto.borderDashArray = undefined;
};

// ==========================================
// 🛠️ 高级胶囊画笔与控制点替换
// ==========================================
const renderHorizontalPill = (ctx: CanvasRenderingContext2D, left: number, top: number, styleOverride: StyleOverride, fabricObj: FabricObject) => {
  ctx.save();
  ctx.translate(left, top);
  ctx.fillStyle = styleOverride?.cornerColor || fabricObj.cornerColor || '#ffffff';
  ctx.strokeStyle = styleOverride?.cornerStrokeColor || fabricObj.cornerStrokeColor || '#18a0fb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-7, -3, 14, 6, 3);
  else ctx.rect(-7, -3, 14, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

const renderVerticalPill = (ctx: CanvasRenderingContext2D, left: number, top: number, styleOverride: StyleOverride, fabricObj: FabricObject) => {
  ctx.save();
  ctx.translate(left, top);
  ctx.fillStyle = styleOverride?.cornerColor || fabricObj.cornerColor || '#ffffff';
  ctx.strokeStyle = styleOverride?.cornerStrokeColor || fabricObj.cornerStrokeColor || '#18a0fb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-3, -7, 6, 14, 3);
  else ctx.rect(-3, -7, 6, 14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

export const applyCustomControls = (obj: FabricObject) => {
  const controls = obj.controls as Record<string, FabricControl>;
  // 偷偷拿到 Fabric 默认对象的控制点能力
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultControls = (FabricObject.prototype as any).controls as Record<string, FabricControl>;
  if (!controls) return;

  // 1. 隐藏旋转天线
  if (controls.mtr) controls.mtr.visible = false;

  // === 核心修复：把丢失的上下拉伸能力“偷”回来还给 Textbox ===
  if (controls.mt && defaultControls?.mt) {
    controls.mt.actionHandler = defaultControls.mt.actionHandler;
    controls.mt.getActionName = defaultControls.mt.getActionName;
  }
  if (controls.mb && defaultControls?.mb) {
    controls.mb.actionHandler = defaultControls.mb.actionHandler;
    controls.mb.getActionName = defaultControls.mb.getActionName;
  }

  // 2. 注入自研胶囊画笔
  if (controls.mt && !controls.mt._isEnhanced) { controls.mt.render = renderHorizontalPill; controls.mt._isEnhanced = true; }
  if (controls.mb && !controls.mb._isEnhanced) { controls.mb.render = renderHorizontalPill; controls.mb._isEnhanced = true; }
  if (controls.ml && !controls.ml._isEnhanced) { controls.ml.render = renderVerticalPill; controls.ml._isEnhanced = true; }
  if (controls.mr && !controls.mr._isEnhanced) { controls.mr.render = renderVerticalPill; controls.mr._isEnhanced = true; }
};