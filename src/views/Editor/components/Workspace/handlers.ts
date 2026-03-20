import { engineInstance } from '../../../../core/engine';
import { computeCanvasSizeFromDrag, type DragEdge } from '../../../../core/canvasMath';
import { useEditorStore, type EditorCommand } from '../../../../store/useEditorStore';
import type { ImageLayer, TextLayer } from '../../../../types/schema';

import { calcFitZoom, clampZoom } from './shared';

interface ApplyCanvasResizeFromDragParams {
  edge: DragEdge;
  zoom: number;
  startWidth: number;
  startHeight: number;
  deltaX: number;
  deltaY: number;
  commit: boolean;
}

interface WorkspaceFrameAnchor {
  left: number;
  top: number;
}

interface ApplyWorkspaceZoomParams {
  nextZoom: number;
}

const WHEEL_ZOOM_SENSITIVITY = 0.001;

let zoomAnimationRaf: number | null = null;
let zoomAnimationTarget: number | null = null;

/** Convert the current drag delta into the next document pixel size. */
export const measureCanvasResizeFromDrag = ({
  edge,
  zoom,
  startWidth,
  startHeight,
  deltaX,
  deltaY,
}: Omit<ApplyCanvasResizeFromDragParams, 'commit'>): {
  widthPx: number;
  heightPx: number;
} => {
  const { widthPx, heightPx } = computeCanvasSizeFromDrag({
    edge,
    startWidthPx: startWidth,
    startHeightPx: startHeight,
    // 屏幕拖拽距离需要除以当前显示缩放，才能还原成文档像素。
    deltaX: deltaX / zoom,
    deltaY: deltaY / zoom,
  });

  return {
    widthPx: Math.round(widthPx),
    heightPx: Math.round(heightPx),
  };
};

/** Initialize Fabric once the workspace canvas element is mounted. */
export const initializeWorkspaceEngine = (
  canvasElement: HTMLCanvasElement | null,
): (() => void) | undefined => {
  if (!canvasElement) return undefined;

  const documentState = useEditorStore.getState().document;
  if (!documentState) return undefined;

  engineInstance.init(
    canvasElement,
    documentState.global.width,
    documentState.global.height,
  );
  engineInstance.loadDocument(documentState);

  return () => {
    engineInstance.dispose();
  };
};

/** Sync a store-side editor command into the isolated Fabric engine. */
export const applyWorkspaceEditorCommand = (
  editorCommand: EditorCommand | null,
): void => {
  if (!editorCommand || !engineInstance.isReady()) return;

  if (editorCommand.type === 'selection:set') {
    if (editorCommand.layerId) {
      engineInstance.selectLayer(editorCommand.layerId);
    } else {
      engineInstance.clearSelection();
    }
    return;
  }

  if (editorCommand.type === 'layer:update') {
    engineInstance.updateLayerProps(editorCommand.layerId, editorCommand.payload);
    return;
  }

  if (editorCommand.type === 'canvas:resize') {
    engineInstance.resizeCanvas(editorCommand.width, editorCommand.height);
    return;
  }

  if (editorCommand.type === 'canvas:resize-and-translate') {
    engineInstance.resizeCanvasAndTranslateLayers(
      editorCommand.width,
      editorCommand.height,
      editorCommand.offsetX,
      editorCommand.offsetY,
    );
    return;
  }

  if (editorCommand.type === 'layers:translate') {
    engineInstance.translateAllLayers(
      editorCommand.offsetX,
      editorCommand.offsetY,
    );
    return;
  }

  if (editorCommand.type === 'document:load') {
    engineInstance.loadDocument(editorCommand.document);
    return;
  }

  if (editorCommand.layer.type === 'text') {
    const measured = engineInstance.addTextLayer(editorCommand.layer as TextLayer);
    if (!measured) return;

    useEditorStore.getState().updateLayer(
      editorCommand.layer.id,
      measured,
      { commit: false, origin: 'engine' },
    );
    return;
  }

  void engineInstance
    .addImageLayer(editorCommand.layer as ImageLayer)
    .then((measured) => {
      if (!measured) return;

      useEditorStore.getState().updateLayer(
        editorCommand.layer.id,
        measured,
        { commit: false, origin: 'engine' },
      );
    });
};

/** Sync document pixel size changes into the Fabric canvas buffer. */
export const syncWorkspaceCanvasSize = (
  width: number,
  height: number,
): void => {
  engineInstance.resizeCanvas(width, height);
};

/** Sync background changes into the Fabric engine. */
export const syncWorkspaceBackground = (
  width: number,
  height: number,
): void => {
  const state = useEditorStore.getState();
  const documentState = state.document;
  if (!documentState) return;

  const page =
    documentState.pages.find((item) => item.pageId === state.currentPageId) ??
    documentState.pages[0];

  if (!page?.background) return;
  engineInstance.setBackground(page.background, width, height);
};

/** Sync the current workspace zoom into the Fabric renderer. */
export const syncWorkspaceZoom = (zoom: number): void => {
  engineInstance.setDisplayZoom(zoom);
};

/** Sync the visible workspace viewport size so the off-canvas buffer covers the whole area. */
export const syncWorkspaceViewportSize = (
  width: number,
  height: number,
): void => {
  engineInstance.setWorkspaceViewportSize(width, height);
};

/** Recalculate fit zoom based on the current viewport size. */
export const fitWorkspaceToViewport = (
  viewportElement: HTMLDivElement | null,
): void => {
  if (!viewportElement) return;

  const documentState = useEditorStore.getState().document;
  if (!documentState) return;

  const fitZoom = calcFitZoom(
    documentState.global.width,
    documentState.global.height,
    viewportElement.clientWidth,
    viewportElement.clientHeight,
  );

  useEditorStore.getState().setZoom(fitZoom);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      viewportElement.scrollLeft = Math.max(
        (viewportElement.scrollWidth - viewportElement.clientWidth) / 2,
        0,
      );
      viewportElement.scrollTop = Math.max(
        (viewportElement.scrollHeight - viewportElement.clientHeight) / 2,
        0,
      );
    });
  });
};

/** Bind a viewport listener that clears selection when clicking outside the canvas wrapper. */
export const bindWorkspaceSelectionClear = (
  viewportElement: HTMLDivElement,
): (() => void) => {
  const onPointerDown = (event: PointerEvent) => {
    // Fabric 会把 upper/lower canvas 包在同一个 wrapper 内，必须用 wrapper 命中判断，
    // 否则 upper canvas 上的点击会被错误地视为“点击了画布外部”。
    if (!engineInstance.isTargetInsideCanvas(event.target)) {
      useEditorStore.getState().setActiveLayer(null);
    }
  };

  viewportElement.addEventListener('pointerdown', onPointerDown);
  return () => {
    viewportElement.removeEventListener('pointerdown', onPointerDown);
  };
};

/** Bind wheel zoom support for the workspace viewport and canvas area. */
export const bindWorkspaceWheelZoom = (
  viewportElement: HTMLDivElement,
): (() => void) => {
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const currentZoom = useEditorStore.getState().zoom;
    // 为什么改成指数缩放：
    // 固定 0.1 步进在滚轮上会显得很“顿”，这里按 deltaY 连续计算缩放值，
    // 保持画布仍然固定居中，但视觉上会顺滑很多。
    const rawNextZoom =
      currentZoom * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
    const nextZoom = clampZoom(Math.round(rawNextZoom * 1000) / 1000);
    applyWorkspaceZoom({
      nextZoom,
    });
  };

  viewportElement.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    viewportElement.removeEventListener('wheel', onWheel);
  };
};

export const centerWorkspaceViewport = (
  viewportElement: HTMLDivElement,
): void => {
  viewportElement.scrollLeft = Math.max(
    (viewportElement.scrollWidth - viewportElement.clientWidth) / 2,
  0,
  );
  viewportElement.scrollTop = Math.max(
    (viewportElement.scrollHeight - viewportElement.clientHeight) / 2,
    0,
  );
};

const animateWorkspaceZoom = (
  nextZoom: number,
): void => {
  const currentZoom = useEditorStore.getState().zoom;
  if (Math.abs(nextZoom - currentZoom) < 1e-6 && zoomAnimationRaf === null) {
    return;
  }

  zoomAnimationTarget = nextZoom;
  if (zoomAnimationRaf !== null) return;

  const step = () => {
    const targetZoom = zoomAnimationTarget;
    if (targetZoom === null) {
      zoomAnimationRaf = null;
      return;
    }

    const frameZoom = useEditorStore.getState().zoom;
    const delta = targetZoom - frameZoom;
    const nextFrameZoom = Math.abs(delta) < 0.002
      ? targetZoom
      : frameZoom + delta * 0.22;

    useEditorStore.getState().setZoom(Math.round(nextFrameZoom * 1000) / 1000);

    if (Math.abs(targetZoom - nextFrameZoom) < 1e-6) {
      zoomAnimationRaf = null;
      zoomAnimationTarget = null;
      return;
    }

    zoomAnimationRaf = requestAnimationFrame(step);
  };

  zoomAnimationRaf = requestAnimationFrame(step);
};

/** Apply a workspace zoom and keep the canvas centered inside the workspace viewport. */
export const applyWorkspaceZoom = ({
  nextZoom,
}: ApplyWorkspaceZoomParams): void => {
  const currentZoom = useEditorStore.getState().zoom;
  if (Math.abs(nextZoom - currentZoom) < 1e-6) return;

  // 为什么统一走动画：
  // 用户已经确认缩放中心固定在工作区中央，因此这里直接对 zoom 做短时缓动，
  // 具体的居中滚动放到 Workspace 的 layout 阶段执行，避免每帧先错位再回正产生抽动。
  animateWorkspaceZoom(nextZoom);
};

/** Capture the current workspace frame position before a canvas resize starts. */
export const readWorkspaceFrameAnchor = (
  frameElement: HTMLDivElement | null,
): WorkspaceFrameAnchor | null => {
  if (!frameElement) return null;

  const { left, top } = frameElement.getBoundingClientRect();
  return { left, top };
};

/** Restore viewport scroll so the visible canvas content stays visually anchored after resize. */
export const restoreWorkspaceViewportAnchor = (
  viewportElement: HTMLDivElement | null,
  frameElement: HTMLDivElement | null,
  anchor: WorkspaceFrameAnchor | null,
): void => {
  if (!viewportElement || !frameElement || !anchor) return;

  const { left, top } = frameElement.getBoundingClientRect();
  const deltaLeft = left - anchor.left;
  const deltaTop = top - anchor.top;

  if (deltaLeft !== 0) {
    viewportElement.scrollLeft += deltaLeft;
  }

  if (deltaTop !== 0) {
    viewportElement.scrollTop += deltaTop;
  }
};

/** Commit canvas resize and page translation in one store transaction. */
export const commitCanvasResizeDrag = ({
  edge,
  zoom,
  startWidth,
  startHeight,
  deltaX,
  deltaY,
  offsetX,
  offsetY,
}: Omit<ApplyCanvasResizeFromDragParams, 'commit'> & {
  offsetX: number;
  offsetY: number;
}): void => {
  const { widthPx, heightPx } = measureCanvasResizeFromDrag({
    edge,
    zoom,
    startWidth,
    startHeight,
    deltaX,
    deltaY,
  });

  useEditorStore.getState().resizeCanvasAndTranslateCurrentPageLayers(
    widthPx,
    heightPx,
    offsetX,
    offsetY,
    { commit: true },
  );
};

/** Draw the final post-commit scene into an overlay canvas before mutating the real Fabric buffer. */
export const drawCanvasResizeCommitPreview = (
  previewCanvasElement: HTMLCanvasElement | null,
  widthPx: number,
  heightPx: number,
  offsetX: number,
  offsetY: number,
): boolean => {
  if (!previewCanvasElement) return false;

  return engineInstance.drawResizeCommitPreview(
    previewCanvasElement,
    widthPx,
    heightPx,
    offsetX,
    offsetY,
  );
};

/** Clear the resize overlay after the real Fabric canvas finishes rendering the committed scene. */
export const finishWorkspaceResizePreviewAfterRender = (
  onRendered: () => void,
): void => {
  engineInstance.onNextRender(onRendered);
};

/** Apply a canvas resize preview or commit based on a pointer drag delta. */
export const applyCanvasResizeFromDrag = ({
  edge,
  zoom,
  startWidth,
  startHeight,
  deltaX,
  deltaY,
  commit,
}: ApplyCanvasResizeFromDragParams): void => {
  const { widthPx, heightPx } = measureCanvasResizeFromDrag({
    edge,
    zoom,
    startWidth,
    startHeight,
    deltaX,
    deltaY,
  });

  useEditorStore.getState().setCanvasSizePx(
    widthPx,
    heightPx,
    { commit },
  );
};
