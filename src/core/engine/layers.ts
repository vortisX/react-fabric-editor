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
export const loadLayerStackToCanvas = async (
  canvas: Canvas,
  layers: Layer[],
): Promise<void> => {
  for (const layer of layers) {
    try {
      const object = await createFabricObjectFromLayer(layer);
      canvas.add(object);
      object.setCoords();
    } catch {
      // 图片或组合资源加载失败时跳过，避免单个异常阻塞整个文档恢复。
    }
  }

  canvas.requestRenderAll();
};
