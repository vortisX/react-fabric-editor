import { clampCanvasPx } from "../core/canvasMath";
import {
  branchContainsLayerId,
  findLayerById,
  flattenRenderableLayers,
  groupLayersInTree,
  moveLayerByStep,
  moveLayerInTree,
  updateLayerBranchById,
  updateLayerById,
} from "../core/layerTree";
import { round1 } from "../core/engine/helpers";
import type { DesignDocument, GroupLayer, Layer, PageBackground } from "../types/schema";
import { genId } from "../utils/uuid";

/** 标记一次状态变更来自哪里，用于决定是否需要反向发命令到 Engine。 */
export type EditorCommandOrigin = "ui" | "engine" | "history" | "system";

/**
 * Store 发往 Workspace/Engine 的基础命令类型。
 * React UI 只负责修改 Store；真正驱动 Fabric 的动作通过这组命令桥接出去。
 */
export type EditorSingleCommand =
  | {
      type: "document:load";
      document: DesignDocument;
      activeLayerId: string | null;
    }
  | { type: "canvas:resize"; width: number; height: number }
  | {
      type: "canvas:resize-and-translate";
      width: number;
      height: number;
      offsetX: number;
      offsetY: number;
    }
  | { type: "layer:add"; layer: Layer }
  | { type: "layer:update"; layerId: string; payload: Partial<Layer> }
  | { type: "layers:translate"; offsetX: number; offsetY: number }
  | { type: "selection:set"; layerId: string | null };

/** Engine 命令允许单条执行，也允许批量顺序执行。 */
export type EditorCommand =
  | EditorSingleCommand
  | { type: "commands:batch"; commands: EditorSingleCommand[] };

export interface DocumentHistory {
  past: DesignDocument[];
  future: DesignDocument[];
}

export interface MutationOptions {
  commit?: boolean;
  origin?: EditorCommandOrigin;
}

export interface EditorState {
  document: DesignDocument | null;
  activeLayerId: string | null;
  currentPageId: string | null;
  history: DocumentHistory;
  zoom: number;
  fitRequest: number;
  editorCommand: EditorCommand | null;
  editorCommandId: number;
  initDocument: (doc: DesignDocument) => void;
  setActiveLayer: (id: string | null, origin?: EditorCommandOrigin) => void;
  setCurrentPageId: (id: string | null) => void;
  setCanvasSizePx: (
    width: number,
    height: number,
    options?: MutationOptions,
  ) => void;
  resizeCanvasAndTranslateCurrentPageLayers: (
    width: number,
    height: number,
    offsetX: number,
    offsetY: number,
    options?: MutationOptions,
  ) => void;
  setCanvasUnit: (unit: string, options?: MutationOptions) => void;
  setPageBackground: (
    background: PageBackground,
    options?: MutationOptions,
  ) => void;
  translateCurrentPageLayers: (
    offsetX: number,
    offsetY: number,
    options?: MutationOptions,
  ) => void;
  updateLayer: (
    layerId: string,
    payload: Partial<Layer>,
    options?: MutationOptions,
  ) => void;
  addLayer: (layer: Layer, options?: MutationOptions) => void;
  toggleLayerVisibility: (
    layerId: string,
    visible: boolean,
    options?: MutationOptions,
  ) => void;
  toggleLayerLock: (
    layerId: string,
    locked: boolean,
    options?: MutationOptions,
  ) => void;
  moveLayer: (
    layerId: string,
    parentId: string | null,
    index: number,
    options?: MutationOptions,
  ) => void;
  moveLayerUp: (layerId: string, options?: MutationOptions) => void;
  moveLayerDown: (layerId: string, options?: MutationOptions) => void;
  groupLayers: (
    layerIds: string[],
    groupName: string,
    options?: MutationOptions,
  ) => string | null;
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  requestFit: () => void;
}

/** 编辑器初始文档，供首次进入页面或未加载外部文档时使用。 */
export const initialDoc: DesignDocument = {
  version: "1.0.0",
  workId: "draft_001",
  title: "未命名设计",
  global: {
    width: 1000,
    height: 1000,
    unit: "px",
    dpi: 72,
  },
  pages: [
    {
      pageId: "page_01",
      name: "第 1 页",
      background: { type: "color", value: "#F3F4F6" },
      layers: [],
    },
  ],
};

/** 深拷贝文档，避免历史栈与当前文档共享引用导致回退失真。 */
export const cloneDocument = (doc: DesignDocument): DesignDocument =>
  structuredClone(doc);

/**
 * 生成一条新的编辑命令，并递增 command id。
 * command id 的作用是让 React effect 即使收到相同内容命令，也能可靠感知到“这是一次新触发”。
 */
export const emitCommand = (
  state: Pick<EditorState, "editorCommandId">,
  command: EditorCommand,
): Pick<EditorState, "editorCommand" | "editorCommandId"> => ({
  editorCommand: command,
  editorCommandId: state.editorCommandId + 1,
});

/**
 * 根据 commit 标记构建新的历史栈。
 * 只有明确的“操作完成”才允许把当前文档压入 past，实时拖拽等高频变更不会进入历史记录。
 */
export const buildHistory = (
  state: Pick<EditorState, "document" | "history">,
  shouldCommit: boolean,
): DocumentHistory => {
  if (!shouldCommit || !state.document) return state.history;
  return {
    past: [...state.history.past, cloneDocument(state.document)],
    future: [],
  };
};

/** 解析当前页；如果 currentPageId 丢失，则自动回退到第一页。 */
export const getCurrentPage = (doc: DesignDocument, pageId: string | null) =>
  doc.pages.find((page) => page.pageId === pageId) ?? doc.pages[0];

/**
 * 更新文档的全局画布尺寸。
 * 这里只修改 global.width/global.height，不处理图层平移等附加逻辑。
 */
export const updateCanvasGlobalSize = (
  doc: DesignDocument,
  width: number,
  height: number,
): DesignDocument | null => {
  const nextWidth = Math.round(clampCanvasPx(width));
  const nextHeight = Math.round(clampCanvasPx(height));
  if (doc.global.width === nextWidth && doc.global.height === nextHeight) {
    return null;
  }

  return {
    ...doc,
    global: {
      ...doc.global,
      width: nextWidth,
      height: nextHeight,
    },
  };
};

/**
 * 平移指定页面中的全部图层。
 * 常用于从左/上边调整文档尺寸时，把现有图层整体向内挪动，保持视觉内容位置稳定。
 */
export const translatePageLayers = (
  doc: DesignDocument,
  pageId: string,
  offsetX: number,
  offsetY: number,
): DesignDocument | null => {
  if (offsetX === 0 && offsetY === 0) return null;

  let hasChanged = false;
  const pages = doc.pages.map((page) => {
    if (page.pageId !== pageId) return page;

    const layers = page.layers.map((layer) => {
      hasChanged = true;
      return {
        ...layer,
        x: round1(layer.x + offsetX),
        y: round1(layer.y + offsetY),
      };
    });

    return { ...page, layers };
  });

  return hasChanged ? { ...doc, pages } : null;
};

/** 更新指定页面中的单个图层。 */
export const updateDocumentLayer = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  payload: Partial<Layer>,
): DesignDocument | null => {
  let hasChanged = false;
  const pages = doc.pages.map((page) => {
    if (page.pageId !== pageId) return page;

    const layers = updateLayerById(page.layers, layerId, (layer) => {
      const changed = Object.entries(payload).some(
        ([key, value]) =>
          !Object.is((layer as unknown as Record<string, unknown>)[key], value),
      );
      if (!changed) return layer;

      hasChanged = true;
      return { ...layer, ...payload } as Layer;
    });

    return layers ? { ...page, layers } : page;
  });

  return hasChanged ? { ...doc, pages } : null;
};

/** 更新当前页内整条图层分支的显隐状态。 */
export const updateDocumentLayerVisibility = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  visible: boolean,
): DesignDocument | null => {
  let hasChanged = false;
  const pages = doc.pages.map((page) => {
    if (page.pageId !== pageId) return page;

    const layers = updateLayerBranchById(page.layers, layerId, (layer) => {
      if (layer.visible === visible) return layer;
      hasChanged = true;
      return { ...layer, visible };
    });

    return layers ? { ...page, layers } : page;
  });

  return hasChanged ? { ...doc, pages } : null;
};

/** 更新当前页内整条图层分支的锁定状态。 */
export const updateDocumentLayerLock = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  locked: boolean,
): DesignDocument | null => {
  let hasChanged = false;
  const pages = doc.pages.map((page) => {
    if (page.pageId !== pageId) return page;

    const layers = updateLayerBranchById(page.layers, layerId, (layer) => {
      if (layer.locked === locked && layer.lockMovement === locked) return layer;
      hasChanged = true;
      return { ...layer, locked, lockMovement: locked };
    });

    return layers ? { ...page, layers } : page;
  });

  return hasChanged ? { ...doc, pages } : null;
};

/** 重排当前页图层树中的节点。 */
export const moveDocumentLayer = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  parentId: string | null,
  index: number,
): DesignDocument | null => {
  let hasChanged = false;
  const pages = doc.pages.map((page) => {
    if (page.pageId !== pageId) return page;
    const layers = moveLayerInTree(page.layers, layerId, parentId, index);
    if (!layers) return page;
    hasChanged = true;
    return { ...page, layers };
  });

  return hasChanged ? { ...doc, pages } : null;
};

/** 在同一父级内把图层节点移动一层。 */
export const moveDocumentLayerByStep = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  step: -1 | 1,
): DesignDocument | null => {
  let hasChanged = false;
  const pages = doc.pages.map((page) => {
    if (page.pageId !== pageId) return page;
    const layers = moveLayerByStep(page.layers, layerId, step);
    if (!layers) return page;
    hasChanged = true;
    return { ...page, layers };
  });

  return hasChanged ? { ...doc, pages } : null;
};

/** 把当前页中同父级的多个节点打包成组合图层。 */
export const groupDocumentLayers = (
  doc: DesignDocument,
  pageId: string,
  layerIds: string[],
  groupName: string,
): { document: DesignDocument; groupId: string } | null => {
  let groupId: string | null = null;
  const pages = doc.pages.map((page) => {
    if (page.pageId !== pageId) return page;

    const groupLayer: GroupLayer = {
      id: genId("group"),
      type: "group",
      name: groupName,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      lockMovement: false,
      children: [],
    };

    const grouped = groupLayersInTree(page.layers, layerIds, groupLayer);
    if (!grouped) return page;

    groupId = grouped.groupId;
    return { ...page, layers: grouped.layers };
  });

  return groupId ? { document: { ...doc, pages }, groupId } : null;
};

/** 判断分支显隐变化后是否需要清空当前选中图层。 */
export const shouldClearActiveLayerAfterVisibilityChange = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  activeLayerId: string | null,
  visible: boolean,
): boolean => {
  if (visible || !activeLayerId) return false;

  const page = getCurrentPage(doc, pageId);
  const branch = findLayerById(page?.layers ?? [], layerId);
  return !!branch && branchContainsLayerId(branch, activeLayerId);
};

/** 把某个图层分支在最新文档中的叶子状态转换成增量同步命令。 */
export const buildBranchLayerUpdateCommands = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  mapPayload: (layer: Layer) => Partial<Layer>,
): EditorSingleCommand[] => {
  const page = getCurrentPage(doc, pageId);
  const branch = findLayerById(page?.layers ?? [], layerId);
  if (!branch) return [];

  return flattenRenderableLayers([branch]).map((layer) => ({
    type: "layer:update",
    layerId: layer.id,
    payload: mapPayload(layer),
  }));
};
