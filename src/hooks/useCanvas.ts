import { useEffect, useRef } from "react";
import { engineInstance } from "../core/engine";

/**
 * useCanvas — React 与 EditorEngine 沟通的唯一桥梁
 *
 * 挂载时初始化 Fabric 画布，卸载时销毁。
 */
export function useCanvas(width: number, height: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /** 根据当前宽高初始化 Engine，并在依赖变化或卸载时清理旧实例。 */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    engineInstance.init(el, width, height);

    return () => {
      engineInstance.dispose();
    };
  }, [width, height]);

  return { canvasRef, engine: engineInstance };
}
