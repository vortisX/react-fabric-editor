import { type FabricObject } from "fabric";

import type { Layer } from "../../types/schema";
import { createGroupObject } from "./groupLayer";
import { createImageObject } from "./imageLayer";
import { createTextObject } from "./textLayer";

export {
  addImageLayerToCanvas,
  applyImageFilters,
  finalizeImageScale,
  updateImageLayerProps,
} from "./imageLayer";
export {
  addTextLayerToCanvas,
  buildTextLayerProps,
  handleTextLayoutUpdate,
  shouldHandleTextLayoutUpdate,
} from "./textLayer";

/** 按图层类型递归创建对应的 Fabric 对象。 */
export const createFabricObjectFromLayer = async (
  layer: Layer,
): Promise<FabricObject> => {
  if (layer.type === "text") {
    return createTextObject(layer) as unknown as FabricObject;
  }

  if (layer.type === "image") {
    return createImageObject(layer, layer.width, layer.height);
  }

  return createGroupObject({
    layer,
    createChildObject: createFabricObjectFromLayer,
  }) as unknown as FabricObject;
};


