import { type Canvas, type FabricObject } from "fabric";

import { flattenRenderableLayers } from "../layerTree";
import type { Layer } from "../../types/schema";
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

/** 把当前页面的图层栈按顺序恢复到 Fabric 画布中。 */
export const loadLayerStackToCanvas = async (
  canvas: Canvas,
  layers: Layer[],
): Promise<void> => {
  const renderableLayers = flattenRenderableLayers(layers);

  for (const layer of renderableLayers) {
    if (layer.type === "text") {
      const node = createTextObject(layer);
      canvas.add(node as unknown as FabricObject);
      node.setCoords();
      continue;
    }

    try {
      const img = await createImageObject(layer, layer.width, layer.height);
      canvas.add(img);
      img.setCoords();
    } catch {
      // 图片加载失败时跳过，避免单个资源异常阻塞整个文档恢复。
    }
  }

  canvas.requestRenderAll();
};
