import { FabricObject, Textbox, Control } from "fabric";
import { SUPPORTED_FONTS } from "../constants/fonts";

// ==========================================
// 🎨 全局基础皮肤配置
// ==========================================
export const setupGlobalUI = (): void => {
  const loadLocalFonts = async (): Promise<void> => {
    // 收集已注册的字体族名，用于判断是否需要重复加载
    const registeredFamilies = new Set<string>();
    document.fonts.forEach((face) => registeredFamilies.add(face.family));

    for (const font of SUPPORTED_FONTS) {
      if (font.path) {
        if (registeredFamilies.has(font.value)) continue;
        try {
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
    objProto.cornerColor = "#ffffff";
    objProto.cornerStrokeColor = "#18a0fb";
    objProto.borderColor = "#18a0fb";
    objProto.cornerSize = 8;
    objProto.padding = 0;
    objProto.cornerStyle = "circle";
    objProto.borderDashArray = null;
  };

  applyConfig(FabricObject.prototype);
  applyConfig(Textbox.prototype);
};

// ==========================================
// 🛠️ 胶囊画笔绘制逻辑
// ==========================================
const renderVerticalPill = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Record<string, unknown>,
  fabricObj: FabricObject,
): void => {
  ctx.save();
  ctx.translate(left, top);
  ctx.fillStyle =
    (styleOverride?.cornerColor as string) ||
    fabricObj.cornerColor ||
    "#ffffff";
  ctx.strokeStyle =
    (styleOverride?.cornerStrokeColor as string) ||
    fabricObj.cornerStrokeColor ||
    "#18a0fb";
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
  const controls = obj.controls as Record<string, Control & { _isEnhanced?: boolean }>;
  if (!controls) return;

  // 1. 隐藏旋转天线
  if (controls.mtr) controls.mtr.visible = false;

  // 2. 隐藏上下控制点（mt/mb），不支持上下拉伸
  if (controls.mt) controls.mt.visible = false;
  if (controls.mb) controls.mb.visible = false;

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
