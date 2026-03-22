import { config, FabricObject, Textbox } from "fabric";
import {
  buildSupportedFontPathMap,
  injectSupportedFontFaces,
} from "../../constants/fonts";
import { EDITOR_GLOBAL_STYLE } from "../config/constants";

// ==========================================
// ????
// ==========================================

/** ????????? Fabric ???????????????????? */
function registerLocalFonts(): void {
  injectSupportedFontFaces();
  config.addFonts(buildSupportedFontPathMap());
}

// ==========================================
// ??????
// ==========================================

/** ????????????? FabricObject/Textbox ??? */
function applyGlobalPrototypeStyle(): void {
  Object.assign(FabricObject.prototype, EDITOR_GLOBAL_STYLE);
  Object.assign(Textbox.prototype, EDITOR_GLOBAL_STYLE);
}

// ==========================================
// ?????
// ==========================================

/** ????? UI????? + ????? */
export const setupGlobalUI = (): void => {
  registerLocalFonts();
  applyGlobalPrototypeStyle();
};
