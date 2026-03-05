import { FabricImage } from "fabric";
import type { ImageLayer } from "../../types/schema";

/**
 * 将 ImageLayer schema 异步转换为 Fabric.js FabricImage 对象
 */
export async function createImageElement(layer: ImageLayer): Promise<FabricImage> {
  const obj = await FabricImage.fromURL(layer.src, {
    crossOrigin: "anonymous",
  });

  obj.set({
    left: layer.x,
    top: layer.y,
    angle: layer.rotation,
    opacity: layer.opacity,
    lockMovementX: layer.lockMovement,
    lockMovementY: layer.lockMovement,
    selectable: !layer.locked,
    evented: !layer.locked,
  });

  // 按 schema 宽高缩放
  obj.scaleToWidth(layer.width);
  obj.scaleToHeight(layer.height);

  (obj as unknown as Record<string, unknown>)["layerId"] = layer.id;
  return obj;
}
