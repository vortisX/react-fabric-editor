import type { FabricObject } from "fabric";

import { useEditorStore } from "../../store/useEditorStore";
import type { ImageLayer } from "../../types/schema";
import { CustomTextbox } from "../CustomTextbox";

/** 从当前页 Schema 中读取指定 id 的图片图层，供图片属性更新时补全上下文。 */
export const readImageLayer = (layerId: string): ImageLayer | undefined => {
  const state = useEditorStore.getState();
  const page =
    state.document?.pages.find((item) => item.pageId === state.currentPageId) ??
    state.document?.pages[0];
  const layer = page?.layers.find((item) => item.id === layerId);
  return layer?.type === "image" ? layer : undefined;
};

/** 在 Fabric 画布对象列表中按自定义 id 查找对象实例。 */
export const findObjectById = (
  canvas: { getObjects(): FabricObject[] } | null,
  id: string,
): FabricObject | undefined =>
  canvas?.getObjects().find((obj) => (obj as CustomTextbox).id === id);
