import { create } from "zustand";
import { buildBranchLayerUpdateCommands, buildHistory, buildLayerReorderCommand, cloneDocument, emitCommand, getCurrentPage, groupDocumentLayers, initialDoc, moveDocumentLayer, moveDocumentLayerByStep, replaceDocumentLayer, shouldClearActiveLayerAfterVisibilityChange, translatePageLayers, ungroupDocumentLayer, updateCanvasGlobalSize, updateDocumentLayer, updateDocumentLayerLock, updateDocumentLayerVisibility, type EditorState } from "./editorStore.shared";
export type { EditorCommand, EditorCommandOrigin } from "./editorStore.shared";
/**
 * 编辑器全局 Store。
 * 它是整个项目的唯一事实来源（SSOT），负责文档状态、选中态、历史记录、缩放值与 Engine 命令桥接。
 */
export const useEditorStore = create<EditorState>((set) => ({
  document: initialDoc,
  activeLayerId: null,
  currentPageId: initialDoc.pages[0].pageId,
  editingGroupIds: [],
  history: { past: [], future: [] },
  canvasPreviewSize: null,
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
      editingGroupIds: [],
      history: { past: [], future: [] },
      canvasPreviewSize: null,
      ...emitCommand(state, {
        type: "document:load",
        document: cloneDocument(doc),
        activeLayerId: null,
      }),
    })),
  /**
   * 设置当前激活图层。
   * 当来源是 UI 时，需要反向发 selection:set 给 Engine；当来源是 Engine 时，只更新 Store 即可。
   */
  setActiveLayer: (id, origin = "ui") =>
    set((state) => {
      if (state.activeLayerId === id) return state;
      if (origin !== "ui") return { activeLayerId: id };
      return {
        activeLayerId: id,
        ...emitCommand(state, { type: "selection:set", layerId: id }),
      };
    }),
  /** 设置当前激活页面 id。 */
  setCurrentPageId: (id) => set({ currentPageId: id }),
  setCanvasPreviewSize: (width, height) =>
    set({
      canvasPreviewSize: {
        width: Math.round(width),
        height: Math.round(height),
      },
    }),
  clearCanvasPreviewSize: () => set({ canvasPreviewSize: null }),
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
          canvasPreviewSize: null,
          history: buildHistory(state, options?.commit ?? false),
        };
      }
      return {
        document: nextDocument,
        canvasPreviewSize: null,
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
            canvasPreviewSize: null,
            history: buildHistory(state, options?.commit ?? false),
          };
        }
        return {
          document: nextDocument,
          canvasPreviewSize: null,
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
      if (
        !currentPage ||
        JSON.stringify(currentPage.background) === JSON.stringify(background)
      ) {
        return state;
      }
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((page) =>
            page.pageId === currentPage.pageId ? { ...page, background } : page,
          ),
        },
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
        ...emitCommand(state, { type: "layers:translate", offsetX, offsetY }),
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
  /** 用完整图层节点替换旧节点，供组合图层整体回写使用。 */
  replaceLayer: (layerId, nextLayer, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;
      const nextDocument = replaceDocumentLayer(
        state.document,
        state.currentPageId,
        layerId,
        nextLayer,
      );
      if (!nextDocument) return state;
      return {
        document: nextDocument,
        history: buildHistory(state, options?.commit ?? true),
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
      const nextDocument = {
        ...state.document,
        pages: state.document.pages.map((item) =>
          item.pageId === page.pageId
            ? { ...item, layers: [...item.layers, layer] }
            : item,
        ),
      };
      const origin = options?.origin ?? "ui";
      if (origin !== "ui") {
        return {
          document: nextDocument,
          activeLayerId: layer.id,
          history: buildHistory(state, options?.commit ?? true),
        };
      }
      return {
        document: nextDocument,
        activeLayerId: layer.id,
        history: buildHistory(state, options?.commit ?? true),
        ...emitCommand(state, { type: "layer:add", layer }),
      };
    }),
  /** 切换图层或组合图层分支的显隐状态。 */
  toggleLayerVisibility: (layerId, visible, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;
      const nextDocument = updateDocumentLayerVisibility(
        state.document,
        state.currentPageId,
        layerId,
        visible,
      );
      if (!nextDocument) return state;
      const nextActiveLayerId = shouldClearActiveLayerAfterVisibilityChange(
        nextDocument,
        state.currentPageId,
        layerId,
        state.activeLayerId,
        visible,
      )
        ? null
        : state.activeLayerId;
      const layerUpdateCommands = buildBranchLayerUpdateCommands(
        nextDocument,
        state.currentPageId,
        layerId,
        (layer) => ({
          visible: layer.visible,
          locked: layer.locked,
          lockMovement: layer.lockMovement,
        }),
      );
      const commands =
        nextActiveLayerId === state.activeLayerId
          ? layerUpdateCommands
          : [
              ...layerUpdateCommands,
              { type: "selection:set", layerId: nextActiveLayerId } as const,
            ];
      return {
        document: nextDocument,
        activeLayerId: nextActiveLayerId,
        history: buildHistory(state, options?.commit ?? true),
        ...emitCommand(state, {
          type: "commands:batch",
          commands,
        }),
      };
    }),
  /** 切换图层或组合图层分支的锁定状态。 */
  toggleLayerLock: (layerId, locked, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;
      const nextDocument = updateDocumentLayerLock(
        state.document,
        state.currentPageId,
        layerId,
        locked,
      );
      if (!nextDocument) return state;
      const commands = buildBranchLayerUpdateCommands(
        nextDocument,
        state.currentPageId,
        layerId,
        (layer) => ({
          visible: layer.visible,
          locked: layer.locked,
          lockMovement: layer.lockMovement,
        }),
      );
      return {
        document: nextDocument,
        history: buildHistory(state, options?.commit ?? true),
        ...emitCommand(state, {
          type: "commands:batch",
          commands,
        }),
      };
    }),
  /** 把图层拖到目标父级和目标索引。 */
  moveLayer: (layerId, parentId, index, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;
      const nextDocument = moveDocumentLayer(
        state.document,
        state.currentPageId,
        layerId,
        parentId,
        index,
      );
      if (!nextDocument) return state;
      return {
        document: nextDocument,
        history: buildHistory(state, options?.commit ?? true),
        ...emitCommand(
          state,
          buildLayerReorderCommand(
            nextDocument,
            state.currentPageId,
            layerId,
            state.activeLayerId,
            state.editingGroupIds,
          ),
        ),
      };
    }),
  /** 把图层在同级中上移一层。 */
  moveLayerUp: (layerId, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;
      const nextDocument = moveDocumentLayerByStep(
        state.document,
        state.currentPageId,
        layerId,
        1,
      );
      if (!nextDocument) return state;
      return {
        document: nextDocument,
        history: buildHistory(state, options?.commit ?? true),
        ...emitCommand(
          state,
          buildLayerReorderCommand(
            nextDocument,
            state.currentPageId,
            layerId,
            state.activeLayerId,
            state.editingGroupIds,
          ),
        ),
      };
    }),
  /** 把图层在同级中下移一层。 */
  moveLayerDown: (layerId, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;
      const nextDocument = moveDocumentLayerByStep(
        state.document,
        state.currentPageId,
        layerId,
        -1,
      );
      if (!nextDocument) return state;
      return {
        document: nextDocument,
        history: buildHistory(state, options?.commit ?? true),
        ...emitCommand(
          state,
          buildLayerReorderCommand(
            nextDocument,
            state.currentPageId,
            layerId,
            state.activeLayerId,
            state.editingGroupIds,
          ),
        ),
      };
    }),
  /** 把同一父级下的多个图层组合成新的 group 节点。 */
  groupLayers: (layerIds, groupName, options) => {
    let createdGroupId: string | null = null;
    set((state) => {
      if (!state.document || !state.currentPageId) return state;
      const grouped = groupDocumentLayers(
        state.document,
        state.currentPageId,
        layerIds,
        groupName,
      );
      if (!grouped) return state;
      createdGroupId = grouped.groupId;
      return {
        document: grouped.document,
        activeLayerId: null,
        history: buildHistory(state, options?.commit ?? true),
        ...emitCommand(state, {
          type: "document:load",
          document: cloneDocument(grouped.document),
          activeLayerId: null,
        }),
      };
    });
    return createdGroupId;
  },
  /** 拆分组合图层，恢复为同级普通图层/子组合。 */
  ungroupLayer: (layerId, options) =>
    set((state) => {
      if (!state.document || !state.currentPageId) return state;
      const nextDocument = ungroupDocumentLayer(
        state.document,
        state.currentPageId,
        layerId,
      );
      if (!nextDocument) return state;
      return {
        document: nextDocument,
        activeLayerId: null,
        history: buildHistory(state, options?.commit ?? true),
        ...emitCommand(state, {
          type: "document:load",
          document: cloneDocument(nextDocument),
          activeLayerId: null,
        }),
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
        editingGroupIds: [],
        history: {
          past: state.history.past.slice(0, -1),
          future: [cloneDocument(state.document), ...state.history.future],
        },
        ...emitCommand(state, {
          type: "document:load",
          document: cloneDocument(nextDocument),
          activeLayerId: null,
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
        editingGroupIds: [],
        history: {
          past: [...state.history.past, cloneDocument(state.document)],
          future: state.history.future.slice(1),
        },
        ...emitCommand(state, {
          type: "document:load",
          document: cloneDocument(nextDocument),
          activeLayerId: null,
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
