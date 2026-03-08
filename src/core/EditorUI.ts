import { FabricObject, Textbox } from "fabric";
import { SUPPORTED_FONTS } from "../constants/fonts";

// ==========================================
// 字体加载
// ==========================================

async function loadLocalFonts(): Promise<void> {
  const registeredFamilies = new Set<string>();
  document.fonts.forEach((face) => registeredFamilies.add(face.family));

  for (const font of SUPPORTED_FONTS) {
    if (!font.path || registeredFamilies.has(font.value)) continue;
    try {
      const fontFace = new FontFace(font.value, `url(${font.path})`);
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);
    } catch (err) {
      console.error(`[FontLoader] 加载失败: ${font.label}`, err);
    }
  }
}

// ==========================================
// 全局控件皮肤
// ==========================================

function applyGlobalPrototypeStyle(): void {
  const style: Partial<FabricObject> = {
    transparentCorners: false,
    cornerColor: "#ffffff",
    cornerStrokeColor: "#18a0fb",
    borderColor: "#18a0fb",
    cornerSize: 8,
    padding: 0,
    cornerStyle: "circle",
    borderDashArray: null,
  };

  Object.assign(FabricObject.prototype, style);
  Object.assign(Textbox.prototype, style);
}

// ==========================================
// 初始化入口
// ==========================================

/** 初始化全局 UI（字体加载 + 控件皮肤） */
export const setupGlobalUI = (): void => {
  loadLocalFonts();
  applyGlobalPrototypeStyle();
};
