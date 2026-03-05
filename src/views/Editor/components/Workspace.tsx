import { useEffect, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { engineInstance } from '../../../core/engine';

export default function Workspace() {
  const document = useEditorStore((state) => state.document);
  // 1. 创建一个指向 Canvas DOM 的引用
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // 2. 确保数据和 DOM 节点都已经准备就绪
    if (!document || !canvasRef.current) return;

    // 3. 将真实节点亲手交给引擎！
    engineInstance.init(canvasRef.current, document.global.width, document.global.height);
    engineInstance.loadDocument(document);

    return () => {
      engineInstance.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!document) return null;

  return (
    <main className="flex-1 relative flex items-center justify-center overflow-auto">
      <div
        className="bg-white shadow-xl relative transition-transform origin-center"
        style={{ width: `${document.global.width}px`, height: `${document.global.height}px` }}
      >
        {/* 4. 绑定 ref，抛弃不可靠的 id */}
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      </div>
    </main>
  );
}