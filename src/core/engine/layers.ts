import { type Canvas, type FabricObject } from "fabric";

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

/** Restore the current page layer stack into the Fabric canvas. */
export const loadLayerStackToCanvas = async (
  canvas: Canvas,
  layers: Layer[],
): Promise<void> => {
  for (const layer of layers) {
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
      // 图片加载失败时跳过，避免阻塞整个文档恢复。
    }
  }

  canvas.requestRenderAll();
};
