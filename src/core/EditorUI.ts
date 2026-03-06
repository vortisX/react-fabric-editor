import { FabricObject, Textbox } from 'fabric';

// 严格定义样式覆写接口
interface StyleOverride {
  cornerColor?: string;
  cornerStrokeColor?: string;
}

// 严格定义控制点接口，消灭 any
interface FabricControl {
  visible?: boolean;
  render?: (ctx: CanvasRenderingContext2D, left: number, top: number, styleOverride: StyleOverride, fabricObj: FabricObject) => void;
  _isEnhanced?: boolean; 
}

// ==========================================
// 🎨 全局基础皮肤配置 (自研高级 UI)
// ==========================================
export const setupGlobalUI = () => {
  // 核心修复：必须封装一个函数，同时覆写基础图形和文本图形的原型！
  const applyConfig = (objProto: Record<string, unknown>) => {
    objProto.transparentCorners = false;
    objProto.cornerColor = '#ffffff';
    objProto.cornerStrokeColor = '#18a0fb';
    objProto.borderColor = '#18a0fb';
    objProto.cornerSize = 8;
    objProto.padding = 0;
    objProto.cornerStyle = 'circle'; // 绝对圆形
    objProto.borderDashArray = undefined;
  };

  applyConfig(FabricObject.prototype as unknown as Record<string, unknown>);
  applyConfig(Textbox.prototype as unknown as Record<string, unknown>);
};

// ==========================================
// 🛠️ 高级胶囊画笔与控制点替换
// ==========================================

// 绘制横向胶囊 (上下边)
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

// 绘制纵向胶囊 (左右边)
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

// 暴露给实例调用的自研 UI 注入方法
export const applyCustomControls = (obj: FabricObject) => {
  const controls = obj.controls as Record<string, FabricControl>;
  if (!controls) return;

  // 1. 极简模式：隐藏旋转点
  if (controls.mtr) controls.mtr.visible = false;

  // 2. 注入自研胶囊画笔
  if (controls.mt && !controls.mt._isEnhanced) { controls.mt.render = renderHorizontalPill; controls.mt._isEnhanced = true; }
  if (controls.mb && !controls.mb._isEnhanced) { controls.mb.render = renderHorizontalPill; controls.mb._isEnhanced = true; }
  if (controls.ml && !controls.ml._isEnhanced) { controls.ml.render = renderVerticalPill; controls.ml._isEnhanced = true; }
  if (controls.mr && !controls.mr._isEnhanced) { controls.mr.render = renderVerticalPill; controls.mr._isEnhanced = true; }
};