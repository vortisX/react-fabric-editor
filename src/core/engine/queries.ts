import type { FabricObject } from "fabric";

import { useEditorStore } from "../../store/useEditorStore";
import type { ImageLayer } from "../../types/schema";
import { CustomTextbox } from "../CustomTextbox";

export const readImageLayer = (layerId: string): ImageLayer | undefined => {
  const state = useEditorStore.getState();
  const page =
    state.document?.pages.find((item) => item.pageId === state.currentPageId) ??
    state.document?.pages[0];
  const layer = page?.layers.find((item) => item.id === layerId);
  return layer?.type === "image" ? layer : undefined;
};

export const findObjectById = (
  canvas: { getObjects(): FabricObject[] } | null,
  id: string,
): FabricObject | undefined =>
  canvas?.getObjects().find((obj) => (obj as CustomTextbox).id === id);
