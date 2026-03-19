import { Canvas } from "fabric";

import { CURSORS } from "../constants";

export const createEditorCanvas = (
  canvasEl: HTMLCanvasElement,
  width: number,
  height: number,
): Canvas =>
  new Canvas(canvasEl, {
    width,
    height,
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: "#ffffff",
    defaultCursor: CURSORS.default,
    hoverCursor: CURSORS.move,
    moveCursor: CURSORS.move,
  });

export const disposeEditorCanvas = (canvas: Canvas): void => {
  canvas.off();
  canvas.dispose();
};
