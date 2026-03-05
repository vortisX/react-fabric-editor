import { useEffect, useRef } from "react";
import { editorEngine } from "../core/engine";

/**
 * useCanvas — React 与 EditorEngine 沟通的唯一桥梁
 *
 * 挂载时初始化 Fabric 画布，卸载时销毁。
 */
export function useCanvas(width: number, height: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    editorEngine.init(el, width, height);

    return () => {
      editorEngine.destroy();
    };
  }, [width, height]);

  return { canvasRef, engine: editorEngine };
}
