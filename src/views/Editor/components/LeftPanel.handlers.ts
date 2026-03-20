import type { TFunction } from "i18next";

import { useEditorStore } from "../../../store/useEditorStore";
import type { ImageLayer, Layer, TextLayer } from "../../../types/schema";
import { genId } from "../../../utils/uuid";

/** 根据当前文档尺寸生成默认文本图层。 */
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

/** 新增一个默认文本图层，并交给 Store/Engine 后续落位。 */
export const addDefaultTextLayer = (t: TFunction): void => {
  const state = useEditorStore.getState();
  state.addLayer(createDefaultTextLayer(state.document, t));
};

/** 打开系统文件选择器并把图片读成 dataURL 图层。 */
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

/** 在图层树中选中某个节点，并同步真正可编辑的叶子图层到 Store。 */
export const selectTreeLayer = (layer: Layer): void => {
  const state = useEditorStore.getState();
  if (layer.type === "group") {
    state.setActiveLayer(null);
    return;
  }

  state.setActiveLayer(layer.id);
};

/** 切换图层树节点的显隐状态。 */
export const toggleTreeLayerVisibility = (
  layerId: string,
  visible: boolean,
): void => {
  useEditorStore.getState().toggleLayerVisibility(layerId, visible);
};

/** 切换图层树节点的锁定状态。 */
export const toggleTreeLayerLock = (
  layerId: string,
  locked: boolean,
): void => {
  useEditorStore.getState().toggleLayerLock(layerId, locked);
};

/** 将节点在图层树中拖到新的父级与索引位置。 */
export const moveTreeLayer = (
  layerId: string,
  parentId: string | null,
  index: number,
): void => {
  useEditorStore.getState().moveLayer(layerId, parentId, index);
};

/** 把节点在当前父级内上移一层。 */
export const moveTreeLayerUp = (layerId: string): void => {
  useEditorStore.getState().moveLayerUp(layerId);
};

/** 把节点在当前父级内下移一层。 */
export const moveTreeLayerDown = (layerId: string): void => {
  useEditorStore.getState().moveLayerDown(layerId);
};

/** 把当前多选图层打包成一个新的组合图层。 */
export const groupTreeLayers = (
  layerIds: string[],
  groupName: string,
): string | null => useEditorStore.getState().groupLayers(layerIds, groupName);
