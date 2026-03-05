import { create } from "zustand";
import type { DesignDocument, Layer, Page } from "../types/schema";

interface EditorState {
  document: DesignDocument | null;
  activePageId: string | null;
  selectedLayerIds: string[];

  // Actions
  setDocument: (doc: DesignDocument) => void;
  setActivePage: (pageId: string) => void;
  setSelectedLayers: (ids: string[]) => void;
  updateLayer: (pageId: string, layer: Layer) => void;
  addLayer: (pageId: string, layer: Layer) => void;
  removeLayer: (pageId: string, layerId: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  document: null,
  activePageId: null,
  selectedLayerIds: [],

  setDocument: (doc) =>
    set({ document: doc, activePageId: doc.pages[0]?.pageId ?? null }),

  setActivePage: (pageId) => set({ activePageId: pageId }),

  setSelectedLayers: (ids) => set({ selectedLayerIds: ids }),

  updateLayer: (pageId, updatedLayer) =>
    set((state) => {
      if (!state.document) return state;
      const pages = state.document.pages.map((page: Page) => {
        if (page.pageId !== pageId) return page;
        return {
          ...page,
          layers: page.layers.map((l: Layer) =>
            l.id === updatedLayer.id ? updatedLayer : l
          ),
        };
      });
      return { document: { ...state.document, pages } };
    }),

  addLayer: (pageId, newLayer) =>
    set((state) => {
      if (!state.document) return state;
      const pages = state.document.pages.map((page: Page) => {
        if (page.pageId !== pageId) return page;
        return { ...page, layers: [...page.layers, newLayer] };
      });
      return { document: { ...state.document, pages } };
    }),

  removeLayer: (pageId, layerId) =>
    set((state) => {
      if (!state.document) return state;
      const pages = state.document.pages.map((page: Page) => {
        if (page.pageId !== pageId) return page;
        return {
          ...page,
          layers: page.layers.filter((l: Layer) => l.id !== layerId),
        };
      });
      return { document: { ...state.document, pages } };
    }),
}));
