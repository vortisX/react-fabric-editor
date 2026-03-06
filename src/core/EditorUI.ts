import { FabricObject, Textbox, Control, controlsUtils } from 'fabric';
import { SUPPORTED_FONTS } from '../constants/fonts';

// 定义控制点渲染函数的标准签名
type ControlRenderFunction = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Record<string, unknown>,
  fabricObj: FabricObject
) => void;

interface EnhancedControl extends Control {
  _isEnhanced?: boolean;
}

// ==========================================
// 🎨 全局基础皮肤配置
// ==========================================
export const setupGlobalUI = (): void => {
  const loadLocalFonts = async (): Promise<void> => {
    for (const font of SUPPORTED_FONTS) {
      if (font.path) {
        try {
          const isLoaded = document.fonts.check(`12px "${font.value}"`);
          if (isLoaded) continue;

          const fontFace = new FontFace(font.value, `url(${font.path})`);
          const loadedFace = await fontFace.load();
          document.fonts.add(loadedFace);
        } catch (err) {
          console.error(`[FontLoader] 加载失败: ${font.label}`, err);
        }
      }
    }
  };

  loadLocalFonts();

  const applyConfig = (objProto: FabricObject): void => {
    objProto.transparentCorners = false;
    objProto.cornerColor = '#ffffff';
    objProto.cornerStrokeColor = '#18a0fb';
    objProto.borderColor = '#18a0fb';
    objProto.cornerSize = 8;
    objProto.padding = 0;
    objProto.cornerStyle = 'circle';
    objProto.borderDashArray = null;
  };

  applyConfig(FabricObject.prototype);
  applyConfig(Textbox.prototype);
};

// ==========================================
// 🛠️ 胶囊画笔绘制逻辑
// ==========================================
const renderHorizontalPill: ControlRenderFunction = (ctx, left, top, styleOverride, fabricObj) => {
  ctx.save();
  ctx.translate(left, top);
  ctx.fillStyle = (styleOverride?.cornerColor as string) || fabricObj.cornerColor || '#ffffff';
  ctx.strokeStyle = (styleOverride?.cornerStrokeColor as string) || fabricObj.cornerStrokeColor || '#18a0fb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-7, -3, 14, 6, 3);
  else ctx.rect(-7, -3, 14, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

const renderVerticalPill: ControlRenderFunction = (ctx, left, top, styleOverride, fabricObj) => {
  ctx.save();
  ctx.translate(left, top);
  ctx.fillStyle = (styleOverride?.cornerColor as string) || fabricObj.cornerColor || '#ffffff';
  ctx.strokeStyle = (styleOverride?.cornerStrokeColor as string) || fabricObj.cornerStrokeColor || '#18a0fb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-3, -7, 6, 14, 3);
  else ctx.rect(-3, -7, 6, 14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

// ==========================================
// 🔧 实例控制点增强
// ==========================================
export const applyCustomControls = (obj: FabricObject): void => {
  const controls = obj.controls as Record<string, EnhancedControl>;
  if (!controls) return;

  // 1. 隐藏旋转天线
  if (controls.mtr) controls.mtr.visible = false;

  // 2. 恢复上下拉伸功能 (Textbox 默认禁用了这个)
  // 在 v7 中，我们可以直接通过 controlsUtils 获取标准的缩放处理器
  if (controls.mt) {
    controls.mt.actionHandler = controlsUtils.scalingYOrSkewingX;
    if (!controls.mt._isEnhanced) {
      controls.mt.render = renderHorizontalPill;
      controls.mt._isEnhanced = true;
    }
  }

  if (controls.mb) {
    controls.mb.actionHandler = controlsUtils.scalingYOrSkewingX;
    if (!controls.mb._isEnhanced) {
      controls.mb.render = renderHorizontalPill;
      controls.mb._isEnhanced = true;
    }
  }

  // 3. 左右胶囊 UI
  if (controls.ml && !controls.ml._isEnhanced) {
    controls.ml.render = renderVerticalPill;
    controls.ml._isEnhanced = true;
  }
  if (controls.mr && !controls.mr._isEnhanced) {
    controls.mr.render = renderVerticalPill;
    controls.mr._isEnhanced = true;
  }
};