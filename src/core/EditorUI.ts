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
        if (registeredFamilies.has(font.value)) {
          console.log(`[FontLoader] 已跳过 (已注册): ${font.label} (${font.value})`);
          continue;
        }
        try {
          console.log(`[FontLoader] 开始加载: ${font.label} (${font.value}) <- ${font.path}`);
          const fontFace = new FontFace(font.value, `url(${font.path})`);
          const loadedFace = await fontFace.load();
          document.fonts.add(loadedFace);
          console.log(`[FontLoader] ✅ 挂载成功: ${font.label} (${font.value})`);
        } catch (err) {
          console.error(`[FontLoader] ❌ 加载失败: ${font.label} (${font.value})`, err);
        }
      } else {
        console.log(`[FontLoader] 系统字体，无需加载: ${font.label} (${font.value})`);
      }
    }
    console.log('[FontLoader] 全部字体处理完毕，已加载数量:', [...document.fonts].length);
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
// � 实例控制点增强
// ==========================================
export const applyCustomControls = (obj: FabricObject): void => {
  const controls = obj.controls as Record<string, Control>;
  if (!controls) return;

  // 1. 隐藏旋转天线
  if (controls.mtr) controls.mtr.visible = false;

  // 2. 隐藏上下/左右控制点，只保留四角
  if (controls.mt) controls.mt.visible = false;
  if (controls.mb) controls.mb.visible = false;
  if (controls.ml) controls.ml.visible = false;
  if (controls.mr) controls.mr.visible = false;
};
