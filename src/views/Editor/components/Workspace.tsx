import { useEffect, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { engineInstance } from '../../../core/engine';
import { CanvasResizeHandles } from './CanvasResizeHandles';

export default function Workspace() {
  const document = useEditorStore((state) => state.document);
  const width = useEditorStore((state) => state.document?.global.width ?? 0);
  const height = useEditorStore((state) => state.document?.global.height ?? 0);
  const background = useEditorStore((state) => {
    const doc = state.document;
    if (!doc) return null;
    const page = doc.pages.find((p) => p.pageId === state.currentPageId) ?? doc.pages[0];
    return page?.background ?? null;
  });
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

  useEffect(() => {
    if (!document) return;
    engineInstance.resizeCanvas(width, height);
    if (background) {
      engineInstance.setBackground(background, width, height);
    }
  }, [document, width, height, background]);

  if (!document) return null;

  return (
    <main className="flex-1 relative flex items-center justify-center overflow-auto">
      <div
        className="bg-white shadow-xl relative transition-transform origin-center"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <CanvasResizeHandles />
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      </div>
    </main>
  );
}
