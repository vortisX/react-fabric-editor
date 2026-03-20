import { create } from "zustand";

import { clampCanvasPx } from "../core/canvasMath";
import { round1 } from "../core/engine/helpers";
import type { DesignDocument, Layer, PageBackground } from "../types/schema";

/** 标记一次状态变更来自哪里，用于决定是否需要反向发命令到 Engine。 */
export type EditorCommandOrigin = "ui" | "engine" | "history" | "system";

/**
 * Store 发往 Workspace/Engine 的命令类型。
 * React UI 只负责修改 Store；真正驱动 Fabric 的动作通过这组命令桥接出去。
 */
export type EditorCommand =
  | { type: "document:load"; document: DesignDocument }
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

interface DocumentHistory {
  past: DesignDocument[];
  future: DesignDocument[];
}

interface MutationOptions {
  commit?: boolean;
  origin?: EditorCommandOrigin;
}

interface EditorState {
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
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  requestFit: () => void;
}

/** 编辑器初始文档，供首次进入页面或未加载外部文档时使用。 */
const initialDoc: DesignDocument = {
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
const cloneDocument = (doc: DesignDocument): DesignDocument => structuredClone(doc);

/**
 * 生成一条新的编辑命令，并递增 command id。
 * command id 的作用是让 React effect 即使收到相同内容命令，也能可靠感知到“这是一次新触发”。
 */
const emitCommand = (
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
const buildHistory = (
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
const getCurrentPage = (doc: DesignDocument, pageId: string | null) =>
  doc.pages.find((page) => page.pageId === pageId) ?? doc.pages[0];

/**
 * 更新文档的全局画布尺寸。
 * 这里只修改 global.width/global.height，不处理图层平移等附加逻辑。
 */
const updateCanvasGlobalSize = (
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
const translatePageLayers = (
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
        // 为什么这里统一 round1：
        // 高级交互里会频繁出现小数偏移，保留 1 位小数能兼顾精度与 JSON 可读性。
        x: round1(layer.x + offsetX),
        y: round1(layer.y + offsetY),
      };
    });

    return { ...page, layers };
  });

  if (!hasChanged) return null;
  return { ...doc, pages };
};

/**
 * 更新指定页面中的单个图层。
 * 如果 patch 实际上没有产生任何字段变化，就返回 null，避免无意义的 Store 更新与 React 重渲染。
 */
const updateDocumentLayer = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  payload: Partial<Layer>,
): DesignDocument | null => {
  let hasChanged = false;

  const pages = doc.pages.map((page) => {
    if (page.pageId !== pageId) return page;

    const layers = page.layers.map((layer) => {
      if (layer.id !== layerId) return layer;

      const nextEntries = Object.entries(payload);
      const changed = nextEntries.some(
        ([key, value]) =>
          !Object.is((layer as unknown as Record<string, unknown>)[key], value),
      );
      if (!changed) return layer;

      hasChanged = true;
      return { ...layer, ...payload } as Layer;
    });

    return layers === page.layers ? page : { ...page, layers };
  });

  if (!hasChanged) return null;
  return { ...doc, pages };
};

/**
 * 编辑器全局 Store。
 * 它是整个项目的唯一事实来源（SSOT），负责文档状态、选中态、历史记录、缩放值与 Engine 命令桥接。
 */
export const useEditorStore = create<EditorState>((set) => ({
  document: initialDoc,
  activeLayerId: null,
  currentPageId: initialDoc.pages[0].pageId,
  history: { past: [], future: [] },
  zoom: 1,
  fitRequest: 0,
  editorCommand: null,
  editorCommandId: 0,

  /**
   * 初始化完整文档。
   * 会重置历史栈、选中态与当前页，并发出 document:load 命令让 Workspace/Engine 完整重建场景。
   */
  initDocument: (doc) =>
    set((state) => ({
      document: doc,
      currentPageId: doc.pages[0]?.pageId ?? null,
      activeLayerId: null,
      history: { past: [], future: [] },
      ...emitCommand(state, { type: "document:load", document: cloneDocument(doc) }),
    })),

  /**
   * 设置当前激活图层。
   * 当来源是 UI 时，需要反向发 selection:set 给 Engine；当来源是 Engine 时，只更新 Store 即可。
   */
  setActiveLayer: (id, origin = "ui") =>
    set((state) => {
      if (state.activeLayerId === id) return state;
      if (origin !== "ui") {
        return { activeLayerId: id };
      }
      return {
        activeLayerId: id,
        ...emitCommand(state, { type: "selection:set", layerId: id }),
      };
    }),

  /** 设置当前激活页面 id。 */
  setCurrentPageId: (id) => set({ currentPageId: id }),

  /**
   * 修改文档全局画布尺寸。
   * 如果来源是 UI，会继续发 canvas:resize 命令给 Engine；如果来源不是 UI，则只更新 Store。
   */
  setCanvasSizePx: (width, height, options) =>
    set((state) => {
      if (!state.document) return state;

      const nextDocument = updateCanvasGlobalSize(state.document, width, height);
      if (!nextDocument) return state;

      const origin = options?.origin ?? "ui";
      if (origin !== "ui") {
        return {
          document: nextDocument,
          history: buildHistory(state, options?.commit ?? false),
        };
      }

      return {
        document: nextDocument,
        history: buildHistory(state, options?.commit ?? false),
        ...emitCommand(state, {
          type: "canvas:resize",
          width: nextDocument.global.width,
          height: nextDocument.global.height,
        }),
      };
    }),

  /**
   * 同时修改画布尺寸并平移当前页全部图层。
   * 这是左/上边拖拽改尺寸时的关键入口，确保文档尺寸变化和图层位移属于同一个事务。
   */
  resizeCanvasAndTranslateCurrentPageLayers:
    (width, height, offsetX, offsetY, options) =>
      set((state) => {
        if (!state.document || !state.currentPageId) return state;

        const resizedDocument =
          updateCanvasGlobalSize(state.document, width, height) ?? state.document;
        const nextDocument =
          translatePageLayers(
            resizedDocument,
            state.currentPageId,
            offsetX,
            offsetY,
          ) ?? resizedDocument;

        if (nextDocument === state.document) return state;

        const origin = options?.origin ?? "ui";
        if (origin !== "ui") {
          return {
            document: nextDocument,
            history: buildHistory(state, options?.commit ?? false),
          };
        }

        return {
          document: nextDocument,
          history: buildHistory(state, options?.commit ?? false),
          ...emitCommand(state, {
            type: "canvas:resize-and-translate",
            width: nextDocument.global.width,
            height: nextDocument.global.height,
            offsetX,
            offsetY,
          }),
        };
      }),

  /** 更新文档单位，例如 px / mm。 */
  setCanvasUnit: (unit, options) =>
    set((state) => {
      if (!state.document || state.document.global.unit === unit) return state;
      return {
        document: {
          ...state.document,
          global: { ...state.document.global, unit },
        },
        history: buildHistory(state, options?.commit ?? true),
      };
    }),

  /**
   * 更新当前页背景。
   * 背景属于页面级配置，因此只改当前页，不会影响其它页面。
   */
  setPageBackground: (background, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;

      const currentPage = getCurrentPage(state.document, state.currentPageId);
      if (!currentPage) return state;

      // 为什么这里先用 JSON.stringify 比较：
      // PageBackground 结构较浅，直接序列化比较比手写多分支字段判断更稳定、维护成本更低。
      if (JSON.stringify(currentPage.background) === JSON.stringify(background)) {
        return state;
      }

      const pages = state.document.pages.map((page) =>
        page.pageId === currentPage.pageId ? { ...page, background } : page,
      );

      return {
        document: { ...state.document, pages },
        history: buildHistory(state, options?.commit ?? true),
      };
    }),

  /**
   * 平移当前页所有图层。
   * 这个动作既可以由 UI 触发，也可以由 Engine/历史系统在恢复场景时触发。
   */
  translateCurrentPageLayers: (offsetX, offsetY, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;

      const nextDocument = translatePageLayers(
        state.document,
        state.currentPageId,
        offsetX,
        offsetY,
      );
      if (!nextDocument) return state;

      const origin = options?.origin ?? "ui";
      if (origin !== "ui") {
        return {
          document: nextDocument,
          history: buildHistory(state, options?.commit ?? false),
        };
      }

      return {
        document: nextDocument,
        history: buildHistory(state, options?.commit ?? false),
        ...emitCommand(state, {
          type: "layers:translate",
          offsetX,
          offsetY,
        }),
      };
    }),

  /**
   * 更新指定图层。
   * 这是图层属性面板、Engine 事件回写、文本内容变化等场景最常用的入口。
   */
  updateLayer: (layerId, payload, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;

      const nextDocument = updateDocumentLayer(
        state.document,
        state.currentPageId,
        layerId,
        payload,
      );
      if (!nextDocument) return state;

      const origin = options?.origin ?? "ui";
      if (origin !== "ui") {
        return {
          document: nextDocument,
          history: buildHistory(state, options?.commit ?? false),
        };
      }

      return {
        document: nextDocument,
        history: buildHistory(state, options?.commit ?? true),
        ...emitCommand(state, { type: "layer:update", layerId, payload }),
      };
    }),

  /**
   * 向当前页新增图层。
   * 新图层写入后会自动设为激活图层，来源为 UI 时还会发 layer:add 命令给 Engine。
   */
  addLayer: (layer, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;

      const page = getCurrentPage(state.document, state.currentPageId);
      if (!page) return state;

      const pages = state.document.pages.map((item) =>
        item.pageId === page.pageId
          ? { ...item, layers: [...item.layers, layer] }
          : item,
      );

      const origin = options?.origin ?? "ui";
      if (origin !== "ui") {
        return {
          document: { ...state.document, pages },
          activeLayerId: layer.id,
          history: buildHistory(state, options?.commit ?? true),
        };
      }

      return {
        document: { ...state.document, pages },
        activeLayerId: layer.id,
        history: buildHistory(state, options?.commit ?? true),
        ...emitCommand(state, { type: "layer:add", layer }),
      };
    }),

  /**
   * 撤销到上一份文档快照。
   * 撤销/重做采用整文档快照策略，恢复时通过 document:load 让 Engine 完整重建场景。
   */
  undo: () =>
    set((state) => {
      if (!state.document) return state;

      const previous = state.history.past[state.history.past.length - 1];
      if (!previous) return state;

      const nextDocument = cloneDocument(previous);
      return {
        document: nextDocument,
        activeLayerId: null,
        currentPageId: nextDocument.pages[0]?.pageId ?? null,
        history: {
          past: state.history.past.slice(0, -1),
          future: [cloneDocument(state.document), ...state.history.future],
        },
        ...emitCommand(state, {
          type: "document:load",
          document: cloneDocument(nextDocument),
        }),
      };
    }),

  /** 从 future 栈中恢复下一份文档快照。 */
  redo: () =>
    set((state) => {
      if (!state.document) return state;

      const next = state.history.future[0];
      if (!next) return state;

      const nextDocument = cloneDocument(next);
      return {
        document: nextDocument,
        activeLayerId: null,
        currentPageId: nextDocument.pages[0]?.pageId ?? null,
        history: {
          past: [...state.history.past, cloneDocument(state.document)],
          future: state.history.future.slice(1),
        },
        ...emitCommand(state, {
          type: "document:load",
          document: cloneDocument(nextDocument),
        }),
      };
    }),

  /** 设置当前工作区显示缩放值。该值只影响视图，不影响文档真实尺寸。 */
  setZoom: (zoom) => set({ zoom }),

  /**
   * 发起一次“适应画布”请求。
   * 这里不直接计算 zoom，而是递增 fitRequest，让 Workspace effect 感知并执行实际 fit 逻辑。
   */
  requestFit: () =>
    set((state) => ({ fitRequest: state.fitRequest + 1 })),
}));
