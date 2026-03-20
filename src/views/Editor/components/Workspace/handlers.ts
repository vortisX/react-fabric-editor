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

/**
 * 终止当前仍在进行的缩放动画。
 * Fit 会直接把 zoom 写成精确值；如果不先取消旧动画，上一轮按钮/滚轮缩放的目标值
 * 会在下一帧把 zoom 再次拉走，导致“适应画布”无法稳定回到正确百分比。
 */
const stopWorkspaceZoomAnimation = (): void => {
  if (zoomAnimationRaf !== null) {
    cancelAnimationFrame(zoomAnimationRaf);
  }

  zoomAnimationRaf = null;
  zoomAnimationTarget = null;
};

/**
 * 根据拖拽边与当前缩放值，把屏幕位移换算成下一帧的文档像素尺寸。
 * 这里返回的是 Schema 层使用的真实宽高，而不是已经乘过 zoom 的显示尺寸。
 */
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

/**
 * 在工作区 canvas DOM 挂载完成后初始化 Fabric 引擎。
 * 返回的清理函数会在组件卸载时释放 Fabric 事件与内部资源。
 */
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

/**
 * 把 Store 中发出的编辑命令同步到隔离的 Fabric 引擎。
 * 这里是 React/Store 与 Engine 之间的命令桥，保证 UI 不直接操作 Fabric 实例。
 */
export const applyWorkspaceEditorCommand = (
  editorCommand: EditorCommand | null,
): void => {
  if (!editorCommand || !engineInstance.isReady()) return;

  if (editorCommand.type === 'commands:batch') {
    editorCommand.commands.forEach((command) => {
      applyWorkspaceEditorCommand(command);
    });
    return;
  }

  // 为什么这里用显式分支而不是命令表：
  // 每种命令对应的副作用差异很大，显式分支更方便在后续维护时补充边界条件和注释。
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

  if (editorCommand.type === 'group:edit-enter') {
    engineInstance.openGroupEditing(editorCommand.groupId);
    return;
  }

  if (editorCommand.type === 'group:edit-exit') {
    engineInstance.closeGroupEditing(true);
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
    if (editorCommand.activeLayerId) {
      engineInstance.selectLayer(editorCommand.activeLayerId);
    } else {
      engineInstance.clearSelection();
    }
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

/**
 * 把文档真实尺寸同步给 Fabric 画布 buffer。
 * 这个入口主要用于工作区尺寸变化后，通知 Engine 重建显示缓冲区。
 */
export const syncWorkspaceCanvasSize = (
  width: number,
  height: number,
): void => {
  engineInstance.resizeCanvas(width, height);
};

/**
 * 把当前页面背景同步到 Fabric 引擎。
 * 背景属于页面级状态，因此需要根据 currentPageId 解析出当前页再下发。
 */
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

/**
 * 把工作区缩放值同步到 Fabric 显示层。
 * 这里只同步显示 zoom，不会修改文档真实宽高。
 */
export const syncWorkspaceZoom = (zoom: number): void => {
  engineInstance.setDisplayZoom(zoom);
};

/**
 * 把当前可视工作区尺寸同步给 Engine。
 * Engine 会用它计算缓冲层 padding，确保大缩放下仍然有足够的可渲染区域。
 */
export const syncWorkspaceViewportSize = (
  width: number,
  height: number,
): void => {
  engineInstance.setWorkspaceViewportSize(width, height);
};

/**
 * 根据当前工作区可视区域重新计算“适应画布”缩放值，并把滚动位置回正到中心。
 * 这里通常在首次进入编辑器或用户主动点击 Fit 时调用。
 */
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

  // Fit 属于“直接回到精确缩放值”的场景，必须先清掉旧动画，避免旧 target 在下一帧覆盖 fit 结果。
  stopWorkspaceZoomAnimation();
  useEditorStore.getState().setZoom(fitZoom);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 为什么连续套两层 rAF：
      // 需要先等 React 和 Fabric 都完成一轮尺寸更新，再读取最新 scrollWidth/scrollHeight，
      // 否则很容易在旧布局基础上居中，造成“刚 fit 完又轻微跳一下”。
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

/**
 * 绑定工作区点击空白取消选中的交互。
 * 只要点击目标不在 Fabric wrapper 内，就把当前激活图层清空。
 */
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

/**
 * 绑定工作区滚轮缩放行为。
 * 当前产品规则是“画布始终居中”，因此滚轮只负责计算下一目标 zoom，
 * 具体的居中与平滑过渡交给 applyWorkspaceZoom 统一处理。
 */
export const bindWorkspaceWheelZoom = (
  viewportElement: HTMLDivElement,
): (() => void) => {
  /** 处理工作区滚轮缩放输入，并把离散滚轮事件转成连续缩放目标值。 */
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

/**
 * 把工作区滚动位置直接置为水平/垂直中心。
 * 该函数只负责滚动条位置，不负责改 zoom。
 */
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

/**
 * 用单一动画循环把当前 zoom 平滑追到目标 zoom。
 * 连续滚轮输入时不会反复重启动画，而是持续追踪最新目标值，减少顿挫感。
 */
const animateWorkspaceZoom = (
  nextZoom: number,
): void => {
  const currentZoom = useEditorStore.getState().zoom;
  if (Math.abs(nextZoom - currentZoom) < 1e-6 && zoomAnimationRaf === null) {
    return;
  }

  zoomAnimationTarget = nextZoom;
  if (zoomAnimationRaf !== null) return;

  /** 在每一帧里读取最新 zoom，并向最新目标值平滑逼近。 */
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

/**
 * 应用工作区缩放目标。
 * 当前只负责发起缩放动画；真正的滚动居中放在 Workspace 组件的 layout 阶段执行，
 * 这样可以避免“先缩放一帧，再回中一帧”的抽动感。
 */
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

/**
 * 读取当前工作区画框在视口中的位置。
 * 这个锚点会在拖拽改尺寸前缓存下来，用于后续滚动补偿。
 */
export const readWorkspaceFrameAnchor = (
  frameElement: HTMLDivElement | null,
): WorkspaceFrameAnchor | null => {
  if (!frameElement) return null;

  const { left, top } = frameElement.getBoundingClientRect();
  return { left, top };
};

/**
 * 在工作区尺寸调整后恢复视口滚动位置，尽量保持用户当前看到的内容不跳动。
 * 这里通过比较 resize 前后的 frame 位置差，反推需要补偿的 scroll 位移。
 */
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

/**
 * 在一次 Store 事务里同时提交画布尺寸变化和图层平移。
 * 这样可以保证左/上边拖拽时，文档尺寸变化与图层整体平移属于同一个历史步骤。
 */
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

/**
 * 在真正提交尺寸修改前，把最终结果绘制到 overlay canvas。
 * 这样可以避免用户在 commit 瞬间看到 Fabric buffer 重建带来的闪烁。
 */
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

/**
 * 等待真实 Fabric 画布完成下一次渲染后，再移除尺寸调整预览层。
 * 这样能保证 overlay 与真实画面之间的切换是连续的。
 */
export const finishWorkspaceResizePreviewAfterRender = (
  onRendered: () => void,
): void => {
  engineInstance.onNextRender(onRendered);
};

/**
 * 根据拖拽位移应用工作区尺寸预览或最终提交。
 * `commit=false` 只更新预览尺寸；`commit=true` 才会真正写入 Store。
 */
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
