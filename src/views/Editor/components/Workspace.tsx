// src/views/Editor/components/Workspace.tsx
import { useEffect, useRef } from "react";
import { useEditorStore } from "../../../store/useEditorStore";
import { EditorEngine } from "../../../core/engine";

export default function Workspace() {
  const document = useEditorStore((state) => state.document);
  // 使用 useRef 保持 engine 实例在整个组件生命周期内唯一，不参与 React 渲染流
  const engineRef = useRef<EditorEngine | null>(null);

  useEffect(() => {
    if (!document) return;

    // 1. 实例化引擎，绑定到 <canvas id="designx-canvas">
    const engine = new EditorEngine("designx-canvas");
    engineRef.current = engine;

    // 2. 初始化宽高
    engine.init(document.global.width, document.global.height);

    // 3. 将 Store 里的 JSON 数据喂给引擎去渲染
    engine.loadDocument(document);

    // 4. 清理函数：组件卸载时销毁实例，防止内存泄漏
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅在初次挂载时执行一次！切勿把 document 放进依赖数组，否则敲个字画布都会重置

  if (!document) return null;

  return (
    <main className="flex-1 relative flex items-center justify-center overflow-auto">
      <div
        className="bg-white shadow-xl relative transition-transform origin-center"
        style={{
          width: `${document.global.width}px`,
          height: `${document.global.height}px`,
        }}
      >
        <canvas
          id="designx-canvas"
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
    </main>
  );
}
