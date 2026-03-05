import { Canvas } from "fabric";

/**
 * EditorEngine — Fabric.js 画布的初始化与生命周期管理
 */
export class EditorEngine {
  canvas: Canvas | null = null;

  init(canvasEl: HTMLCanvasElement, width: number, height: number): void {
    this.canvas = new Canvas(canvasEl, {
      width,
      height,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });
  }

  destroy(): void {
    this.canvas?.dispose();
    this.canvas = null;
  }

  getCanvas(): Canvas {
    if (!this.canvas) throw new Error("Canvas not initialized");
    return this.canvas;
  }
}

export const editorEngine = new EditorEngine();
