import type { CSSProperties } from 'react';

import { getEditorSurfacePadding } from '../../../../core/engine/workspace';
import type { DragEdge } from '../../../../core/canvasMath';
import type { PageBackground } from '../../../../types/schema';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 2;

/** Clamp zoom to the supported workspace range. */
export const clampZoom = (zoom: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** Calculate a fit-to-viewport zoom with workspace padding applied. */
export const calcFitZoom = (
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): number => {
  if (
    canvasWidth === 0 ||
    canvasHeight === 0 ||
    viewportWidth === 0 ||
    viewportHeight === 0
  ) {
    return 1;
  }

  const scaleWidth =
    (viewportWidth - Math.min(viewportWidth * 0.12, 120)) / canvasWidth;
  const scaleHeight =
    (viewportHeight - Math.min(viewportHeight * 0.12, 120)) / canvasHeight;
  return clampZoom(Math.min(scaleWidth, scaleHeight));
};

/** Build the visual container style for the current canvas background. */
export const getWorkspaceContainerStyle = (
  zoomedWidth: number,
  zoomedHeight: number,
  background: PageBackground | null,
): CSSProperties => {
  const baseStyle: CSSProperties = {
    width: `${zoomedWidth}px`,
    height: `${zoomedHeight}px`,
    overflow: 'visible',
  };

  if (!background) {
    return { ...baseStyle, background: '#ffffff' };
  }

  if (background.type === 'color') {
    return { ...baseStyle, background: background.value };
  }

  if (background.type === 'gradient') {
    const { direction, colorStops } = background.value;
    const angle = direction === 'horizontal' ? 'to right' : 'to bottom';
    const stops = colorStops
      .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
      .join(', ');

    return {
      ...baseStyle,
      background: `linear-gradient(${angle}, ${stops})`,
    };
  }

  return { ...baseStyle, background: '#ffffff' };
};

/** Build the scroll area size so the zoomed canvas keeps proper layout space. */
export const getWorkspaceScrollAreaStyle = (
  zoomedWidth: number,
  zoomedHeight: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
): CSSProperties => {
  const padding = getEditorSurfacePadding(zoom, viewportWidth, viewportHeight);

  return {
    width: `${zoomedWidth + padding.x * 2}px`,
    height: `${zoomedHeight + padding.y * 2}px`,
    position: 'relative',
    flexShrink: 0,
  };
};

/** Build the absolute canvas slot that Fabric renders into. */
export const getWorkspaceCanvasSlotStyle = (
  zoomedWidth: number,
  zoomedHeight: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
): CSSProperties => {
  const padding = getEditorSurfacePadding(zoom, viewportWidth, viewportHeight);

  return {
    width: `${zoomedWidth}px`,
    height: `${zoomedHeight}px`,
    position: 'absolute',
    left: `${padding.x}px`,
    top: `${padding.y}px`,
    overflow: 'visible',
  };
};

/** Map resize edge direction to the matching visual handle classes. */
export const edgeToClassName = (edge: DragEdge, isActive: boolean): string => {
  const colorClass = isActive ? 'bg-[#18a0fb]' : 'bg-gray-400 hover:bg-[#18a0fb]';
  const common =
    'absolute rounded-full opacity-90 shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition-colors duration-200';

  if (edge === 'left') {
    return `${common} ${colorClass} top-1/2 -left-3 h-10 w-2 -translate-y-1/2 cursor-ew-resize`;
  }

  if (edge === 'right') {
    return `${common} ${colorClass} top-1/2 -right-3 h-10 w-2 -translate-y-1/2 cursor-ew-resize`;
  }

  if (edge === 'top') {
    return `${common} ${colorClass} left-1/2 -top-3 h-2 w-10 -translate-x-1/2 cursor-ns-resize`;
  }

  return `${common} ${colorClass} left-1/2 -bottom-3 h-2 w-10 -translate-x-1/2 cursor-ns-resize`;
};
