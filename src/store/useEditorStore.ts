import { create } from "zustand";
import type { DesignDocument, Layer } from "../types/schema";

// 定义 Store 的类型接口
interface EditorState {
  // === 数据状态 (State) ===
  document: DesignDocument | null; // 当前编辑的文档核心数据
  activeLayerId: string | null; // 当前选中的图层 ID

  // === 操作方法 (Actions) ===
  initDocument: (doc: DesignDocument) => void;
  setActiveLayer: (id: string | null) => void;
  updateLayer: (
    pageId: string,
    layerId: string,
    payload: Partial<Layer>,
  ) => void;
  addLayer: (pageId: string, layer: Layer) => void;
}

// 预设一个空白的初始模板 (手机竖屏比例)
const initialDoc: DesignDocument = {
  version: "1.0.0",
  workId: "draft_001",
  title: "未命名设计",
  global: {
    width: 375,
    height: 667,
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

  // 1. 初始化/覆盖整个文档 (用于从后端加载数据)
  initDocument: (doc) => set({ document: doc }),

  // 2. 设置当前选中的图层
  setActiveLayer: (id) => set({ activeLayerId: id }),

  // 3. 核心：更新某个图层的属性 (严格的不可变数据更新)
  updateLayer: (pageId, layerId, payload) =>
    set((state) => {
      if (!state.document) return state;

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
  addLayer: (pageId, layer) =>
    set((state) => {
      if (!state.document) return state;

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
