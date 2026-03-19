import { create } from "zustand";

import { clampCanvasPx } from "../core/canvasMath";
import { round1 } from "../core/engine/helpers";
import type { DesignDocument, Layer, PageBackground } from "../types/schema";

export type EditorCommandOrigin = "ui" | "engine" | "history" | "system";

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

const cloneDocument = (doc: DesignDocument): DesignDocument => structuredClone(doc);

const emitCommand = (
  state: Pick<EditorState, "editorCommandId">,
  command: EditorCommand,
): Pick<EditorState, "editorCommand" | "editorCommandId"> => ({
  editorCommand: command,
  editorCommandId: state.editorCommandId + 1,
});

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

const getCurrentPage = (doc: DesignDocument, pageId: string | null) =>
  doc.pages.find((page) => page.pageId === pageId) ?? doc.pages[0];

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
        x: round1(layer.x + offsetX),
        y: round1(layer.y + offsetY),
      };
    });

    return { ...page, layers };
  });

  if (!hasChanged) return null;
  return { ...doc, pages };
};

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

export const useEditorStore = create<EditorState>((set) => ({
  document: initialDoc,
  activeLayerId: null,
  currentPageId: initialDoc.pages[0].pageId,
  history: { past: [], future: [] },
  zoom: 1,
  fitRequest: 0,
  editorCommand: null,
  editorCommandId: 0,

  initDocument: (doc) =>
    set((state) => ({
      document: doc,
      currentPageId: doc.pages[0]?.pageId ?? null,
      activeLayerId: null,
      history: { past: [], future: [] },
      ...emitCommand(state, { type: "document:load", document: cloneDocument(doc) }),
    })),

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

  setCurrentPageId: (id) => set({ currentPageId: id }),

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

  setPageBackground: (background, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;

      const currentPage = getCurrentPage(state.document, state.currentPageId);
      if (!currentPage) return state;

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

  setZoom: (zoom) => set({ zoom }),

  requestFit: () =>
    set((state) => ({ fitRequest: state.fitRequest + 1 })),
}));
