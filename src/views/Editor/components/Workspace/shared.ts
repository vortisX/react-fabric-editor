import type { CSSProperties } from 'react';

import { getEditorSurfacePadding } from '../../../../core/engine/workspace';
import type { DragEdge } from '../../../../core/canvas/canvasMath';
import type { PageBackground } from '../../../../types/schema';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 2;

/** 将传入 zoom 限制在当前工作区允许的最小/最大范围内。 */
export const clampZoom = (zoom: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/**
 * 计算适应工作区的缩放值。
 * 这里会预留一部分边缘留白，避免 fit 后画布紧贴工作区边界，看起来过于拥挤。
 */
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

/**
 * 生成画布视觉容器样式。
 * 该容器负责显示页面背景色/渐变，并作为 Fabric 画布与预览层的定位参考。
 */
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
    // 为什么这里直接转成 CSS gradient：
    // 工作区背景只需要视觉展示，不参与 Fabric 对象渲染，用 CSS 能减少额外的 canvas 绘制成本。
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

/**
 * 生成工作区滚动区域样式。
 * 它本质上是一个“占位画布外壳”，用于给居中的真实画布提供足够的滚动空间与缓冲留白。
 */
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

/**
 * 生成 Fabric 画布槽位样式。
 * 槽位会根据当前 zoom 与 viewport padding 绝对定位，确保画布总是放在滚动区正确的位置。
 */
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

/**
 * 把拖拽边方向映射成对应的 Resize Handle 样式类名。
 * 这里统一管理尺寸拖拽手柄的视觉状态，避免 JSX 中散落大量条件类拼接。
 */
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
