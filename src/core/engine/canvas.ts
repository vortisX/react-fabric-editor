import { Canvas } from "fabric";

import { CURSORS } from "../constants";
import { getEditorSurfaceSize, getEditorViewportTransform } from "./workspace";

interface FabricCanvasControlInternals {
  skipControlsDrawing: boolean;
}

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

  canvas.setViewportTransform(getEditorViewportTransform(1, 0, 0));
  (canvas as unknown as Canvas & FabricCanvasControlInternals).skipControlsDrawing =
    true;
  return canvas;
};

export const disposeEditorCanvas = (canvas: Canvas): void => {
  canvas.off();
  canvas.dispose();
};
