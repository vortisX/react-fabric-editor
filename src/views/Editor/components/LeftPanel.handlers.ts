import type { TFunction } from "i18next";

import { ensureFontLoaded } from "../../../constants/fonts";
import { engineInstance } from "../../../core/engine";
import { resolveSelectableLayerId } from "../../../core/layers/layerTree";
import { useEditorStore } from "../../../store/useEditorStore";
import type { ImageLayer, Layer, TextLayer } from "../../../types/schema";
import { genId } from "../../../utils/uuid";

/** 鏍规嵁褰撳墠鏂囨。灏哄鐢熸垚榛樿鏂囨湰鍥惧眰銆?*/
export const createDefaultTextLayer = (
  documentState: ReturnType<typeof useEditorStore.getState>["document"],
  t: TFunction,
): TextLayer => {
  const canvasShortSide = Math.min(
    documentState?.global.width ?? 500,
    documentState?.global.height ?? 500,
  );
  const fontSize = Math.round(
    Math.max(12, Math.min(200, canvasShortSide * 0.05)),
  );

  return {
    id: genId("layer"),
    name: t("leftPanel.defaultTextContent"),
    type: "text",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    lockMovement: false,
    content: t("leftPanel.defaultTextContent"),
    fontFamily: "AaKuangPaiShouShu-2",
    fontSize,
    fontWeight: "normal",
    fill: "#333333",
    textAlign: "left",
  };
};

/** 鏂板涓€涓粯璁ゆ枃鏈浘灞傦紝骞朵氦缁?Store/Engine 鍚庣画钀戒綅銆?*/
export const addDefaultTextLayer = (t: TFunction): void => {
  const state = useEditorStore.getState();
  const nextLayer = createDefaultTextLayer(state.document, t);

  void ensureFontLoaded(nextLayer.fontFamily).finally(() => {
    useEditorStore.getState().addLayer(nextLayer);
  });
};

/** 鎵撳紑绯荤粺鏂囦欢閫夋嫨鍣ㄥ苟鎶婂浘鐗囪鎴?dataURL 鍥惧眰銆?*/
export const openImageLayerPicker = (t: TFunction): void => {
  const input = window.document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/svg+xml";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result;
      if (typeof url !== "string") return;

      const name =
        file.name.replace(/\.[^.]+$/, "") || t("leftPanel.defaultImageName");
      const newImageLayer: ImageLayer = {
        id: genId("layer"),
        name,
        type: "image",
        url,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        lockMovement: false,
      };

      useEditorStore.getState().addLayer(newImageLayer);
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

/** 鍦ㄥ浘灞傛爲涓€変腑鏌愪釜鑺傜偣锛屽苟鍚屾鐪熸鍙紪杈戠殑鍙跺瓙鍥惧眰鍒?Store銆?*/
export const selectTreeLayer = (layer: Layer): void => {
  const state = useEditorStore.getState();
  if (state.editingGroupIds.includes(layer.id)) {
    state.setActiveLayer(layer.id, "engine");
    return;
  }

  const page =
    state.document?.pages.find((item) => item.pageId === state.currentPageId) ??
    state.document?.pages[0];
  const selectableLayerId = page
    ? resolveSelectableLayerId(page.layers, layer.id, state.editingGroupIds)
    : null;
  state.setActiveLayer(selectableLayerId);
};

/** 鍒囨崲鍥惧眰鏍戣妭鐐圭殑鏄鹃殣鐘舵€併€?*/
export const toggleTreeLayerVisibility = (
  layerId: string,
  visible: boolean,
): void => {
  useEditorStore.getState().toggleLayerVisibility(layerId, visible);
};

/** 鍒囨崲鍥惧眰鏍戣妭鐐圭殑閿佸畾鐘舵€併€?*/
export const toggleTreeLayerLock = (
  layerId: string,
  locked: boolean,
): void => {
  useEditorStore.getState().toggleLayerLock(layerId, locked);
};

/** 灏嗚妭鐐瑰湪鍥惧眰鏍戜腑鎷栧埌鏂扮殑鐖剁骇涓庣储寮曚綅缃€?*/
export const moveTreeLayer = (
  layerId: string,
  parentId: string | null,
  index: number,
): void => {
  useEditorStore.getState().moveLayer(layerId, parentId, index);
};

/** 鎶婅妭鐐瑰湪褰撳墠鐖剁骇鍐呬笂绉讳竴灞傘€?*/
export const moveTreeLayerUp = (layerId: string): void => {
  useEditorStore.getState().moveLayerUp(layerId);
};

/** 鎶婅妭鐐瑰湪褰撳墠鐖剁骇鍐呬笅绉讳竴灞傘€?*/
export const moveTreeLayerDown = (layerId: string): void => {
  useEditorStore.getState().moveLayerDown(layerId);
};

/** 鎶婂綋鍓嶅閫夊浘灞傛墦鍖呮垚涓€涓柊鐨勭粍鍚堝浘灞傘€?*/
export const groupTreeLayers = (
  layerIds: string[],
  groupName: string,
): string | null => {
  const groupId = useEditorStore.getState().groupLayers(layerIds, groupName);
  if (groupId) {
    engineInstance.preserveNextLoadedGroupBoundsFromLayers(groupId, layerIds);
  }
  return groupId;
};

/** 鎷嗗垎鏌愪釜缁勫悎鍥惧眰銆?*/
export const ungroupTreeLayer = (layerId: string): void => {
  useEditorStore.getState().ungroupLayer(layerId);
};
