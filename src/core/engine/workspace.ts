import type { TMat2D } from "fabric";

export const EDITOR_SURFACE_BASE_PADDING = 240;

export interface EditorSurfacePadding {
  x: number;
  y: number;
}

export const getEditorSurfacePadding = (
  displayZoom: number,
  viewportWidth = 0,
  viewportHeight = 0,
): EditorSurfacePadding => ({
  x: Math.max(EDITOR_SURFACE_BASE_PADDING * displayZoom, viewportWidth),
  y: Math.max(EDITOR_SURFACE_BASE_PADDING * displayZoom, viewportHeight),
});

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
