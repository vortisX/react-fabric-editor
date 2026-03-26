import { Canvas } from "fabric";

import { CURSORS } from "../config/constants";
import { getEditorSurfaceSize, getEditorViewportTransform } from "./workspace";

interface FabricCanvasControlInternals {
  skipControlsDrawing: boolean;
}

/**
 * 閸掓稑缂撶紓鏍帆閸ｃ劋绗撻悽銊ф畱 Fabric Canvas閿涘苯鑻熸惔鏃傛暏缂佺喍绔撮惃鍕灥婵?viewport 娑撳簼姘︽禍鎺戝帨閺嶅洢鈧?
 */
export const createEditorCanvas = (
  canvasEl: HTMLCanvasElement,
  width: number,
  height: number,
): Canvas => {
  const surfaceSize = getEditorSurfaceSize(width, height, 1, 0, 0);
  const canvas = new Canvas(canvasEl, {
    width: surfaceSize.width,
    height: surfaceSize.height,
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: "transparent",
    defaultCursor: CURSORS.default,
    hoverCursor: CURSORS.move,
    moveCursor: CURSORS.move,
  });

  // 閸掓繂顫?viewport 鐢附婀佺紓鏍帆閸?padding閿涘瞼鈥樻穱婵嗘倵缂侇厾缂夐弨鐐娑撯偓瀵偓婵姘ㄩ張澶婄暚閺佸绱﹂崘鎻掔湴缁屾椽妫块妴?
  canvas.setViewportTransform(getEditorViewportTransform(1, 0, 0));
  (canvas as unknown as Canvas & FabricCanvasControlInternals).skipControlsDrawing =
    true;
  canvas.wrapperEl.style.willChange = "transform";
  canvas.lowerCanvasEl.style.transform = "translateZ(0)";
  canvas.upperCanvasEl.style.transform = "translateZ(0)";
  return canvas;
};

/** 闁插﹥鏂?Fabric Canvas 閻ㄥ嫪绨ㄦ禒鏈电瑢 DOM 鐠у嫭绨敍灞肩返缂傛牞绶崳銊ュ祻鏉炶姤妞傜拫鍐暏閵?*/
export const disposeEditorCanvas = (canvas: Canvas): void => {
  canvas.off();
  canvas.dispose();
};
