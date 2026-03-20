import type { Canvas, TMat2D } from "fabric";
import {
  getEditorSurfacePadding,
  getEditorSurfaceSize,
  getEditorViewportTransform,
} from "./workspace";

interface ApplyCanvasSizeParams {
  canvas: Canvas;
  docWidth: number;
  docHeight: number;
  displayZoom: number;
  viewportWidth?: number;
  viewportHeight?: number;
  shouldRender?: boolean;
}

interface FabricCanvasDimensionInternals {
  _setDimensionsImpl: (
    dimensions: { width: number; height: number },
    options?: { backstoreOnly?: boolean; cssOnly?: boolean },
  ) => void;
}

interface FabricCanvasDomInternals {
  wrapperEl?: HTMLElement;
  lowerCanvasEl?: HTMLCanvasElement;
  upperCanvasEl?: HTMLCanvasElement;
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
  viewportWidth = 0,
  viewportHeight = 0,
  shouldRender = true,
}: ApplyCanvasSizeParams): void => {
  const { width, height } = getEditorSurfaceSize(
    docWidth,
    docHeight,
    displayZoom,
    viewportWidth,
    viewportHeight,
  );
  const padding = getEditorSurfacePadding(
    displayZoom,
    viewportWidth,
    viewportHeight,
  );
  const currentZoom = canvas.getZoom();
  const sizeChanged = canvas.getWidth() !== width || canvas.getHeight() !== height;
  const zoomChanged = Math.abs(currentZoom - displayZoom) > 1e-6;
  const nextViewportTransform: TMat2D = getEditorViewportTransform(
    displayZoom,
    viewportWidth,
    viewportHeight,
  );

  if (sizeChanged || zoomChanged) {
    const previousRenderOnAddRemove = canvas.renderOnAddRemove;
    canvas.renderOnAddRemove = false;
    canvas.setViewportTransform(nextViewportTransform);

    if (sizeChanged) {
      (
        canvas as unknown as Canvas & FabricCanvasDimensionInternals
      )._setDimensionsImpl({ width, height });
    }

    canvas.renderOnAddRemove = previousRenderOnAddRemove;
  }

  const domCanvas = canvas as unknown as Canvas & FabricCanvasDimensionInternals &
    FabricCanvasDomInternals;
  if (domCanvas.wrapperEl) {
    domCanvas.wrapperEl.style.position = "absolute";
    domCanvas.wrapperEl.style.left = `${-padding.x}px`;
    domCanvas.wrapperEl.style.top = `${-padding.y}px`;
    domCanvas.wrapperEl.style.width = `${width}px`;
    domCanvas.wrapperEl.style.height = `${height}px`;
    domCanvas.wrapperEl.style.overflow = "visible";
  }

  if (domCanvas.lowerCanvasEl) {
    domCanvas.lowerCanvasEl.style.clipPath = `inset(${padding.y}px ${padding.x}px ${padding.y}px ${padding.x}px)`;
  }

  if (domCanvas.upperCanvasEl) {
    domCanvas.upperCanvasEl.style.clipPath = "none";
  }

  if (sizeChanged || zoomChanged) {
    canvas.calcViewportBoundaries();
    canvas.calcOffset();
  }

  if (shouldRender) {
    canvas.requestRenderAll();
  }
};
