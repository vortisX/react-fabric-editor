import { Canvas } from "fabric";

import { CURSORS } from "../constants";
import { getEditorSurfaceSize, getEditorViewportTransform } from "./workspace";

interface FabricCanvasControlInternals {
  skipControlsDrawing: boolean;
}

/**
 * 创建编辑器专用的 Fabric Canvas，并应用统一的初始 viewport 与交互光标。
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

  // 初始 viewport 带有编辑区 padding，确保后续缩放时一开始就有完整缓冲层空间。
  canvas.setViewportTransform(getEditorViewportTransform(1, 0, 0));
  (canvas as unknown as Canvas & FabricCanvasControlInternals).skipControlsDrawing =
    true;
  return canvas;
};

/** 释放 Fabric Canvas 的事件与 DOM 资源，供编辑器卸载时调用。 */
export const disposeEditorCanvas = (canvas: Canvas): void => {
  canvas.off();
  canvas.dispose();
};
