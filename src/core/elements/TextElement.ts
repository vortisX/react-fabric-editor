import { IText } from "fabric";
import type { TextLayer } from "../../types/schema";

/**
 * 将 TextLayer schema 转换为 Fabric.js IText 对象
 */
export function createTextElement(layer: TextLayer): IText {
  const obj = new IText(layer.content, {
    left: layer.x,
    top: layer.y,
    width: layer.width,
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight as string,
    fill: layer.fill,
    textAlign: layer.textAlign,
    angle: layer.rotation,
    opacity: layer.opacity,
    lockMovementX: layer.lockMovement,
    lockMovementY: layer.lockMovement,
    selectable: !layer.locked,
    evented: !layer.locked,
  });

  // 将图层 id 挂载到 Fabric 对象上，方便反向查找
  (obj as unknown as Record<string, unknown>)["layerId"] = layer.id;
  return obj;
}
