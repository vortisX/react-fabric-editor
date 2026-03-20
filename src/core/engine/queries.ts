import { findLayerById } from "../layerTree";
import { Group, type FabricObject } from "fabric";

import { useEditorStore } from "../../store/useEditorStore";
import type { GroupLayer, ImageLayer, Layer } from "../../types/schema";
import { CustomTextbox } from "../CustomTextbox";
import type { EditableFabricObject, FabricGroupLayer } from "./types";

/** 从当前页 Schema 中读取指定 id 的图片图层，供图片属性更新时补全上下文。 */
export const readImageLayer = (layerId: string): ImageLayer | undefined => {
  const layer = readLayer(layerId);
  return layer?.type === "image" ? layer : undefined;
};

/** 从当前页 Schema 中读取任意图层节点。 */
export const readLayer = (layerId: string): Layer | undefined => {
  const state = useEditorStore.getState();
  const page =
    state.document?.pages.find((item) => item.pageId === state.currentPageId) ??
    state.document?.pages[0];
  return page ? findLayerById(page.layers, layerId) : undefined;
};

/** 从当前页 Schema 中读取组合图层。 */
export const readGroupLayer = (layerId: string): GroupLayer | undefined => {
  const layer = readLayer(layerId);
  return layer?.type === "group" ? layer : undefined;
};

/** 在 Fabric 对象树里按自定义 id 递归查找对象实例。 */
const findObjectInBranch = (
  objects: FabricObject[],
  id: string,
): FabricObject | undefined => {
  for (const object of objects) {
    if ((object as CustomTextbox).id === id) return object;
    if (!(object instanceof Group)) continue;

    const nested = findObjectInBranch(object.getObjects(), id);
    if (nested) return nested;
  }

  return undefined;
};

/** 在 Fabric 画布对象列表中按自定义 id 查找对象实例。 */
export const findObjectById = (
  canvas: { getObjects(): FabricObject[] } | null,
  id: string,
): FabricObject | undefined =>
  canvas ? findObjectInBranch(canvas.getObjects(), id) : undefined;

/** 在画布顶层对象里按 id 查找，常用于组合替换和编辑模式切换。 */
export const findTopLevelObjectById = (
  canvas: { getObjects(): FabricObject[] } | null,
  id: string,
): EditableFabricObject | undefined =>
  canvas?.getObjects().find((object) => (object as CustomTextbox).id === id) as
    | EditableFabricObject
    | undefined;

/** 找出当前处于某个组编辑模式下暴露到顶层的子对象。 */
export const findEditingChildren = (
  canvas: { getObjects(): FabricObject[] } | null,
  groupId: string,
): EditableFabricObject[] =>
  (canvas?.getObjects().filter(
    (object) =>
      (object as EditableFabricObject).editingParentGroupId === groupId,
  ) ?? []) as EditableFabricObject[];

/** 判断顶层对象是否是一个带 id 的组合图层对象。 */
export const isTopLevelGroupObject = (
  object: EditableFabricObject | undefined,
): object is FabricGroupLayer =>
  !!object &&
  object instanceof Group &&
  typeof (object as EditableFabricObject).id === "string";
