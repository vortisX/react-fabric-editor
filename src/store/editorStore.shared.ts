import { clampCanvasPx } from "../core/canvas/canvasMath";
import { normalizeGroupLayer } from "../core/layers/groupGeometry";
import {
  branchContainsLayerId,
  findLayerById,
  groupLayersInTree,
  moveLayerByStep,
  moveLayerInTree,
  ungroupLayerInTree,
  updateLayerBranchById,
  updateLayerById,
} from "../core/layers/layerTree";
import { round1 } from "../core/engine/helpers";
import type { DesignDocument, GroupLayer, Layer, PageBackground } from "../types/schema";
import { genId } from "../utils/uuid";

/** 閺嶅洩顔囨稉鈧▎锛勫Ц閹礁褰夐弴瀛樻降閼奉亜鎽㈤柌宀嬬礉閻劋绨崘鍐茬暰閺勵垰鎯侀棁鈧憰浣稿冀閸氭垵褰傞崨鎴掓姢閸?Engine閵?*/
export type EditorCommandOrigin = "ui" | "engine" | "history" | "system";

/**
 * Store 閸欐垵绶?Workspace/Engine 閻ㄥ嫬鐔€绾偓閸涙垝鎶ょ猾璇茬€烽妴?
 * React UI 閸欘亣绀嬬拹锝勬叏閺€?Store閿涙稓婀″锝夆攳閸?Fabric 閻ㄥ嫬濮╂担婊堚偓姘崇箖鏉╂瑧绮嶉崨鎴掓姢濡椼儲甯撮崙鍝勫箵閵?
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
  | { type: "group:edit-enter"; groupId: string }
  | { type: "group:edit-exit" }
  | { type: "group:refresh"; groupId: string; preserveSelection: boolean }
  | { type: "selection:set"; layerId: string | null };

/** Engine 閸涙垝鎶ら崗浣筋啅閸楁洘娼幍褑顢戦敍灞肩瘍閸忎浇顔忛幍褰掑櫤妞ゅ搫绨幍褑顢戦妴?*/
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
  editingGroupIds: string[];
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
  replaceLayer: (
    layerId: string,
    nextLayer: Layer,
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
  ungroupLayer: (
    layerId: string,
    options?: MutationOptions,
  ) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  requestFit: () => void;
}

/** 缂傛牞绶崳銊ュ灥婵鏋冨锝忕礉娓氭盯顩诲▎陇绻橀崗銉┿€夐棃銏″灗閺堫亜濮炴潪钘夘樆闁劍鏋冨锝嗘娴ｈ法鏁ら妴?*/
export const initialDoc: DesignDocument = {
  version: "1.0.0",
  workId: "draft_001",
  title: "Untitled Design",
  global: {
    width: 1000,
    height: 1000,
    unit: "px",
    dpi: 72,
  },
  pages: [
    {
      pageId: "page_01",
      name: "Page 1",
      background: { type: "color", value: "#F3F4F6" },
      layers: [],
    },
  ],
};

/** 濞ｈ鲸瀚圭拹婵囨瀮濡楋綇绱濋柆鍨帳閸樺棗褰堕弽鍫滅瑢瑜版挸澧犻弬鍥ㄣ€傞崗鍙橀煩瀵洜鏁ょ€佃壈鍤ч崶鐐衡偓鈧径杈╂埂閵?*/
export const cloneDocument = (doc: DesignDocument): DesignDocument =>
  structuredClone(doc);

/**
 * 閻㈢喐鍨氭稉鈧弶鈩冩煀閻ㄥ嫮绱潏鎴濇嚒娴犮倧绱濋獮鍫曗偓鎺戭杻 command id閵?
 * command id 閻ㄥ嫪缍旈悽銊︽Ц鐠?React effect 閸楀厖濞囬弨璺哄煂閻╃鎮撻崘鍛啇閸涙垝鎶ら敍灞肩瘍閼宠棄褰查棃鐘冲妳閻儱鍩岄垾婊嗙箹閺勵垯绔村▎鈩冩煀鐟欙箑褰傞垾婵勨偓?
 */
export const emitCommand = (
  state: Pick<EditorState, "editorCommandId">,
  command: EditorCommand,
): Pick<EditorState, "editorCommand" | "editorCommandId"> => ({
  editorCommand: command,
  editorCommandId: state.editorCommandId + 1,
});

/**
 * 閺嶈宓?commit 閺嶅洩顔囬弸鍕紦閺傛壆娈戦崢鍡楀蕉閺嶅牄鈧?
 * 閸欘亝婀侀弰搴ｂ€橀惃鍕ㄢ偓婊勬惙娴ｆ粌鐣幋鎰ㄢ偓婵囧閸忎浇顔忛幎濠傜秼閸撳秵鏋冨锝呭竾閸?past閿涘苯鐤勯弮鑸靛珛閹风晫鐡戞姗€顣堕崣妯绘纯娑撳秳绱版潻娑樺弳閸樺棗褰剁拋鏉跨秿閵?
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

/** 鐟欙絾鐎借ぐ鎾冲妞ょ绱辨俊鍌涚亯 currentPageId 娑撱垹銇戦敍灞藉灟閼奉亜濮╅崶鐐衡偓鈧崚鎵儑娑撯偓妞ょ偣鈧?*/
export const getCurrentPage = (doc: DesignDocument, pageId: string | null) =>
  doc.pages.find((page) => page.pageId === pageId) ?? doc.pages[0];

/** 闁帒缍婇獮宕囆╅崡鏇氶嚋閸ユ儳鐪伴敍娑氱矋閸氬牆娴樼仦鍌欑窗鏉╃偛鎮撻崗銊╁劥閸氬簼鍞稉鈧挧椋幮╅崝顭掔礉娣囨繃瀵旂紒婵嗩嚠閸ф劖鐖ｆ担鎾堕兇娑撯偓閼锋番鈧?*/
const translateLayerTree = (
  layer: Layer,
  offsetX: number,
  offsetY: number,
): Layer => {
  if (layer.type !== "group") {
    return {
      ...layer,
      x: round1(layer.x + offsetX),
      y: round1(layer.y + offsetY),
    };
  }

  return normalizeGroupLayer({
    ...layer,
    x: round1(layer.x + offsetX),
    y: round1(layer.y + offsetY),
    children: layer.children.map((child) =>
      translateLayerTree(child, offsetX, offsetY),
    ),
  });
};

/**
 * 閺囧瓨鏌婇弬鍥ㄣ€傞惃鍕弿鐏炩偓閻㈣绔风亸鍝勵嚟閵?
 * 鏉╂瑩鍣烽崣顏冩叏閺€?global.width/global.height閿涘奔绗夋径鍕倞閸ユ儳鐪伴獮宕囆╃粵澶愭閸旂娀鈧槒绶妴?
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
 * 楠炲磭些閹稿洤鐣炬い鐢告桨娑擃厾娈戦崗銊╁劥閸ユ儳鐪伴妴?
 * 鐢摜鏁ゆ禍搴濈矤瀹?娑撳﹨绔熺拫鍐╂殻閺傚洦銆傜亸鍝勵嚟閺冭绱濋幎濠勫箛閺堝娴樼仦鍌涙殻娴ｆ挸鎮滈崘鍛皳閸旑煉绱濇穱婵囧瘮鐟欏棜顫庨崘鍛啇娴ｅ秶鐤嗙粙鍐茬暰閵?
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
      return translateLayerTree(layer, offsetX, offsetY);
    });

    return { ...page, layers };
  });

  return hasChanged ? { ...doc, pages } : null;
};

/** 閺囧瓨鏌婇幐鍥х暰妞ょ敻娼版稉顓犳畱閸楁洑閲滈崶鎯х湴閵?*/
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

/** 閻劌鐣弫瀵告畱閺傛澘娴樼仦鍌濆Ν閻愯娴涢幑銏＄埐娑擃厾娈戦弮褑濡悙骞库偓?*/
export const replaceDocumentLayer = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  nextLayer: Layer,
): DesignDocument | null => {
  const normalizedNextLayer =
    nextLayer.type === "group" ? normalizeGroupLayer(nextLayer) : nextLayer;
  let hasChanged = false;
  const pages = doc.pages.map((page) => {
    if (page.pageId !== pageId) return page;

    const layers = updateLayerById(page.layers, layerId, (layer) => {
      if (
        layer === normalizedNextLayer ||
        JSON.stringify(layer) === JSON.stringify(normalizedNextLayer)
      ) {
        return layer;
      }
      hasChanged = true;
      return normalizedNextLayer;
    });

    return layers ? { ...page, layers } : page;
  });

  return hasChanged ? { ...doc, pages } : null;
};

/** 閺囧瓨鏌婅ぐ鎾冲妞ら潧鍞撮弫瀛樻蒋閸ユ儳鐪伴崚鍡樻暜閻ㄥ嫭妯夐梾鎰Ц閹降鈧?*/
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

/** 閺囧瓨鏌婅ぐ鎾冲妞ら潧鍞撮弫瀛樻蒋閸ユ儳鐪伴崚鍡樻暜閻ㄥ嫰鏀ｇ€规氨濮搁幀浣碘偓?*/
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

/** 闁插秵甯撹ぐ鎾冲妞ら潧娴樼仦鍌涚埐娑擃厾娈戦懞鍌滃仯閵?*/
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

/** 閸︺劌鎮撴稉鈧悥鍓侀獓閸愬懏濡搁崶鎯х湴閼哄倻鍋ｇ粔璇插З娑撯偓鐏炲倶鈧?*/
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

/** 閹跺﹤缍嬮崜宥夈€夋稉顓炴倱閻栧墎楠囬惃鍕樋娑擃亣濡悙瑙勫ⅵ閸栧懏鍨氱紒鍕値閸ユ儳鐪伴妴?*/
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

/** 閹峰棗鍨庤ぐ鎾冲妞ゅ吀鑵戦惃鍕矋閸氬牆娴樼仦鍌樷偓?*/
export const ungroupDocumentLayer = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
): DesignDocument | null => {
  let hasChanged = false;
  const pages = doc.pages.map((page) => {
    if (page.pageId !== pageId) return page;
    const layers = ungroupLayerInTree(page.layers, layerId);
    if (!layers) return page;
    hasChanged = true;
    return { ...page, layers };
  });

  return hasChanged ? { ...doc, pages } : null;
};

/** 閸掋倖鏌囬崚鍡樻暜閺勯箖娈ｉ崣妯哄閸氬孩妲搁崥锕傛付鐟曚焦绔荤粚鍝勭秼閸撳秹鈧鑵戦崶鎯х湴閵?*/
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

/** 閹跺﹥鐓囨稉顏勬禈鐏炲倸鍨庨弨顖氭躬閺堚偓閺傜増鏋冨锝勮厬閻ㄥ嫬褰剧€涙劗濮搁幀浣芥祮閹广垺鍨氭晶鐐哄櫤閸氬本顒為崨鎴掓姢閵?*/
/** ?????????????? Engine ?????????????????? */
export const buildLayerReorderCommand = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  activeLayerId: string | null,
  editingGroupIds: string[],
): EditorSingleCommand => {
  const page = getCurrentPage(doc, pageId);
  const activeLayer = activeLayerId
    ? findLayerById(page?.layers ?? [], activeLayerId)
    : undefined;

  if (
    activeLayer?.type === "group" &&
    !editingGroupIds.includes(activeLayer.id) &&
    branchContainsLayerId(activeLayer, layerId)
  ) {
    return {
      type: "group:refresh",
      groupId: activeLayer.id,
      preserveSelection: true,
    };
  }

  return {
    type: "document:load",
    document: cloneDocument(doc),
    activeLayerId,
  };
};

export const buildBranchLayerUpdateCommands = (
  doc: DesignDocument,
  pageId: string,
  layerId: string,
  mapPayload: (layer: Layer) => Partial<Layer>,
): EditorSingleCommand[] => {
  const page = getCurrentPage(doc, pageId);
  const branch = findLayerById(page?.layers ?? [], layerId);
  if (!branch) return [];

  const commands: EditorSingleCommand[] = [];
  const walkBranch = (layer: Layer) => {
    commands.push({
      type: "layer:update",
      layerId: layer.id,
      payload: mapPayload(layer),
    });

    if (layer.type !== "group") return;
    layer.children.forEach((child) => {
      walkBranch(child);
    });
  };

  walkBranch(branch);
  return commands;
};
