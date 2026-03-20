import { config, FabricObject, Textbox } from "fabric";
import { SUPPORTED_FONTS } from "../constants/fonts";
import { EDITOR_GLOBAL_STYLE } from "./constants";

// ==========================================
// 字体加载
// ==========================================

/** 加载项目内置本地字体，并把它们注册到浏览器字体集合与 Fabric config。 */
async function loadLocalFonts(): Promise<void> {
  const registeredFamilies = new Set<string>();
  document.fonts.forEach((face) => registeredFamilies.add(face.family));
  const fontPaths: Record<string, string> = {};

  for (const font of SUPPORTED_FONTS) {
    if (!font.path) continue;

    fontPaths[font.value] = font.path;
    if (registeredFamilies.has(font.value)) continue;

    try {
      const fontFace = new FontFace(font.value, `url(${font.path})`);
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);
    } catch (err) {
      // 字体加载失败时只打印日志，不阻塞编辑器初始化。
      console.error(`[FontLoader] 加载失败: ${font.label}`, err);
    }
  }

  config.addFonts(fontPaths);
}

// ==========================================
// 全局控件皮肤
// ==========================================

/** 把统一的编辑器交互样式写入 FabricObject/Textbox 原型。 */
function applyGlobalPrototypeStyle(): void {
  Object.assign(FabricObject.prototype, EDITOR_GLOBAL_STYLE);
  Object.assign(Textbox.prototype, EDITOR_GLOBAL_STYLE);
}

// ==========================================
// 初始化入口
// ==========================================

/** 初始化全局 UI（字体加载 + 控件皮肤） */
export const setupGlobalUI = (): void => {
  loadLocalFonts();
  applyGlobalPrototypeStyle();
};
