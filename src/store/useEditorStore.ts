import { create } from "zustand";
import type { DesignDocument, Layer, PageBackground } from "../types/schema";
import { clampCanvasPx } from "../core/canvasMath";

// 定义 Store 的类型接口
interface EditorState {
  // === 数据状态 (State) ===
  document: DesignDocument | null; // 当前编辑的文档核心数据
  activeLayerId: string | null; // 当前选中的图层 ID
  currentPageId: string | null; // 当前选中的页面 ID
  backgroundPast: DesignDocument[];
  backgroundFuture: DesignDocument[];

  // === 操作方法 (Actions) ===
  initDocument: (doc: DesignDocument) => void;
  setActiveLayer: (id: string | null) => void;
  setCurrentPageId: (id: string | null) => void;
  setCanvasSizePx: (width: number, height: number) => void;
  setCanvasUnit: (unit: string) => void;
  setPageBackground: (background: PageBackground) => void;
  undoBackground: () => void;
  redoBackground: () => void;
  updateLayer: (
    layerId: string,
    payload: Partial<Layer>,
  ) => void;
  addLayer: (layer: Layer) => void;
}

// 预设一个空白的初始模板 (手机竖屏比例)
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
      layers: [], // 初始没有图层
    },
  ],
};

// 创建并导出全局 Store
export const useEditorStore = create<EditorState>((set) => ({
  document: initialDoc,
  activeLayerId: null,
  currentPageId: initialDoc.pages[0].pageId,
  backgroundPast: [],
  backgroundFuture: [],

  // 1. 初始化/覆盖整个文档 (用于从后端加载数据)
  initDocument: (doc) => set({ 
    document: doc,
    currentPageId: doc.pages[0]?.pageId ?? null,
    backgroundPast: [],
    backgroundFuture: [],
  }),

  // 2. 设置当前选中的图层
  setActiveLayer: (id) => set({ activeLayerId: id }),

  // 2.1 设置当前选中的页面
  setCurrentPageId: (id) => set({ currentPageId: id }),

  setCanvasSizePx: (width, height) =>
    set((state) => {
      if (!state.document) return state;
      const w = Math.round(clampCanvasPx(width));
      const h = Math.round(clampCanvasPx(height));
      return {
        document: {
          ...state.document,
          global: { ...state.document.global, width: w, height: h },
        },
      };
    }),

  setCanvasUnit: (unit) =>
    set((state) => {
      if (!state.document) return state;
      return {
        document: {
          ...state.document,
          global: { ...state.document.global, unit },
        },
      };
    }),

  setPageBackground: (background) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;

      const pageId = state.currentPageId;
      const newPages = state.document.pages.map((page) =>
        page.pageId === pageId ? { ...page, background } : page,
      );

      const nextDoc: DesignDocument = { ...state.document, pages: newPages };
      return {
        document: nextDoc,
        backgroundPast: [...state.backgroundPast, state.document],
        backgroundFuture: [],
      };
    }),

  undoBackground: () =>
    set((state) => {
      if (!state.document) return state;
      const prev = state.backgroundPast[state.backgroundPast.length - 1];
      if (!prev) return state;
      const nextPast = state.backgroundPast.slice(0, -1);
      return {
        document: prev,
        backgroundPast: nextPast,
        backgroundFuture: [state.document, ...state.backgroundFuture],
        currentPageId: prev.pages[0]?.pageId ?? null,
      };
    }),

  redoBackground: () =>
    set((state) => {
      if (!state.document) return state;
      const next = state.backgroundFuture[0];
      if (!next) return state;
      return {
        document: next,
        backgroundPast: [...state.backgroundPast, state.document],
        backgroundFuture: state.backgroundFuture.slice(1),
        currentPageId: next.pages[0]?.pageId ?? null,
      };
    }),

  // 3. 核心：更新某个图层的属性 (严格的不可变数据更新)
  updateLayer: (layerId, payload) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;

      const pageId = state.currentPageId;

      // 遍历 pages，找到目标 page
      const newPages = state.document.pages.map((page) => {
        if (page.pageId !== pageId) return page;

        // 在目标 page 中遍历 layers，找到目标 layer 并合并新属性
        return {
          ...page,
          layers: page.layers.map((layer) =>
            layer.id === layerId ? ({ ...layer, ...payload } as Layer) : layer,
          ),
        };
      });

      return {
        document: {
          ...state.document,
          pages: newPages,
        },
      };
    }),
  // 4. 新增图层
  addLayer: (layer) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;
      
      const pageId = state.currentPageId;

      const newPages = state.document.pages.map((page) => {
        if (page.pageId !== pageId) return page;
        // 往 layers 数组末尾推入新图层
        return { ...page, layers: [...page.layers, layer] };
      });

      return {
        document: { ...state.document, pages: newPages },
        activeLayerId: layer.id, // 自动选中新加的图层
      };
    }),
}));
