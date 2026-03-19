import type { Canvas, TMat2D } from "fabric";

interface ApplyCanvasSizeParams {
  canvas: Canvas;
  docWidth: number;
  docHeight: number;
  displayZoom: number;
}

interface FabricCanvasDimensionInternals {
  _setDimensionsImpl: (
    dimensions: { width: number; height: number },
    options?: { backstoreOnly?: boolean; cssOnly?: boolean },
  ) => void;
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
  const currentZoom = canvas.getZoom();
  const sizeChanged = canvas.getWidth() !== width || canvas.getHeight() !== height;
  const zoomChanged = Math.abs(currentZoom - displayZoom) > 1e-6;

  if (!sizeChanged && !zoomChanged) return;

  const currentViewportTransform = canvas.viewportTransform;
  const nextViewportTransform: TMat2D = [
    displayZoom,
    currentViewportTransform[1],
    currentViewportTransform[2],
    displayZoom,
    currentViewportTransform[4],
    currentViewportTransform[5],
  ];

  const previousRenderOnAddRemove = canvas.renderOnAddRemove;
  canvas.renderOnAddRemove = false;
  canvas.setViewportTransform(nextViewportTransform);

  if (sizeChanged) {
    (
      canvas as unknown as Canvas & FabricCanvasDimensionInternals
    )._setDimensionsImpl({ width, height });
  }

  canvas.renderOnAddRemove = previousRenderOnAddRemove;
  canvas.requestRenderAll();
};
