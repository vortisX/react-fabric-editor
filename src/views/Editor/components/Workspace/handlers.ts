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

/** Bind Ctrl+wheel zoom support for the workspace viewport. */
export const bindWorkspaceWheelZoom = (
  viewportElement: HTMLDivElement,
): (() => void) => {
  const onWheel = (event: WheelEvent) => {
    if (!event.ctrlKey) return;

    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const currentZoom = useEditorStore.getState().zoom;
    const nextZoom = clampZoom(Math.round((currentZoom + delta) * 10) / 10);
    useEditorStore.getState().setZoom(nextZoom);
  };

  viewportElement.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    viewportElement.removeEventListener('wheel', onWheel);
  };
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
