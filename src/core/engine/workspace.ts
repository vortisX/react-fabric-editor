import type { TMat2D } from "fabric";

export const EDITOR_SURFACE_BASE_PADDING = 240;

export interface EditorSurfacePadding {
  x: number;
  y: number;
}

/** 计算编辑器外围缓冲层 padding，保证缩放后画布周围始终有足够可滚动留白。 */
export const getEditorSurfacePadding = (
  displayZoom: number,
  viewportWidth = 0,
  viewportHeight = 0,
): EditorSurfacePadding => ({
  x: Math.max(EDITOR_SURFACE_BASE_PADDING * displayZoom, viewportWidth),
  y: Math.max(EDITOR_SURFACE_BASE_PADDING * displayZoom, viewportHeight),
});

/** 根据文档尺寸、缩放值和缓冲层 padding 计算实际 Fabric 画布尺寸。 */
export const getEditorSurfaceSize = (
  docWidth: number,
  docHeight: number,
  displayZoom: number,
  viewportWidth = 0,
  viewportHeight = 0,
): { width: number; height: number } => {
  const padding = getEditorSurfacePadding(
    displayZoom,
    viewportWidth,
    viewportHeight,
  );

  return {
    width: Math.round(docWidth * displayZoom + padding.x * 2),
    height: Math.round(docHeight * displayZoom + padding.y * 2),
  };
};

/** 生成 Fabric viewportTransform，让文档内容落在缓冲层 padding 之后的可视区域内。 */
export const getEditorViewportTransform = (
  displayZoom: number,
  viewportWidth = 0,
  viewportHeight = 0,
): TMat2D => {
  const padding = getEditorSurfacePadding(
    displayZoom,
    viewportWidth,
    viewportHeight,
  );

  return [displayZoom, 0, 0, displayZoom, padding.x, padding.y];
};
