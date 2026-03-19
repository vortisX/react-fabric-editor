import type { Canvas } from "fabric";

interface ApplyCanvasSizeParams {
  canvas: Canvas;
  docWidth: number;
  docHeight: number;
  displayZoom: number;
}

/**
 * 内部：根据当前 docWidth/docHeight/displayZoom 计算实际 canvas 尺寸并应用。
 * 使用 Fabric setZoom + setDimensions 保证 buffer 精确对应显示像素。
 */
export const applyCanvasSize = ({
  canvas,
  docWidth,
  docHeight,
  displayZoom,
}: ApplyCanvasSizeParams): void => {
  const width = Math.round(docWidth * displayZoom);
  const height = Math.round(docHeight * displayZoom);

  // 尺寸未变则跳过，避免 setDimensions 清空 context 导致不必要的闪烁
  if (canvas.getWidth() === width && canvas.getHeight() === height) return;

  canvas.setZoom(displayZoom);
  canvas.setDimensions({ width, height });
  canvas.calcOffset();

  // 必须同步 renderAll：setDimensions 已清空 context，requestRenderAll 是异步 RAF，
  // 二者之间有一帧空白 -> 文字闪烁
  canvas.renderAll();
};
