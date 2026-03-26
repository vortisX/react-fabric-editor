import { type Canvas, type FabricObject } from "fabric";

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

/** 把当前页面的图层栈按顺序恢复到 Fabric 画布中。 */
export const createLayerStackObjects = async (
  layers: Layer[],
): Promise<FabricObject[]> => {
  const objects = await Promise.all(
    layers.map(async (layer) => {
      try {
        return await createFabricObjectFromLayer(layer);
      } catch {
        return null;
      }
    }),
  );
  return objects.filter((object): object is FabricObject => object !== null);
};

export const replaceCanvasLayerStack = (
  canvas: Canvas,
  objects: FabricObject[],
): void => {
  const currentObjects = canvas.getObjects();
  const originalRenderOnAddRemove = canvas.renderOnAddRemove;
  canvas.renderOnAddRemove = false;
  try {
    if (currentObjects.length > 0) {
      canvas.remove(...currentObjects);
    }
    objects.forEach((object, index) => {
      canvas.insertAt(index, object);
      object.setCoords();
    });
  } finally {
    canvas.renderOnAddRemove = originalRenderOnAddRemove;
  }
  canvas.requestRenderAll();
};
