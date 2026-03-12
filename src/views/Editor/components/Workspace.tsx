import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { engineInstance } from '../../../core/engine';
import { computeCanvasSizeFromDrag, type DragEdge } from '../../../core/canvasMath';

/** 根据拖拽边方向返回对应的 Tailwind 定位 + 游标类名 */
function edgeToClassName(edge: DragEdge): string {
  if (edge === 'left') {
    return 'absolute top-1/2 -left-3 w-2 h-10 rounded-full cursor-ew-resize -translate-y-1/2 bg-[#18a0fb] opacity-90 shadow-[0_4px_12px_rgba(0,0,0,0.18)]';
  }
  if (edge === 'right') {
    return 'absolute top-1/2 -right-3 w-2 h-10 rounded-full cursor-ew-resize -translate-y-1/2 bg-[#18a0fb] opacity-90 shadow-[0_4px_12px_rgba(0,0,0,0.18)]';
  }
  if (edge === 'top') {
    return 'absolute left-1/2 -top-3 w-10 h-2 rounded-full cursor-ns-resize -translate-x-1/2 bg-[#18a0fb] opacity-90 shadow-[0_4px_12px_rgba(0,0,0,0.18)]';
  }
  // bottom
  return 'absolute left-1/2 -bottom-3 w-10 h-2 rounded-full cursor-ns-resize -translate-x-1/2 bg-[#18a0fb] opacity-90 shadow-[0_4px_12px_rgba(0,0,0,0.18)]';
}

function ResizeHandle({ edge }: { edge: DragEdge }) {
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWRef = useRef(0);
  const startHRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastDeltaXRef = useRef(0);
  const lastDeltaYRef = useRef(0);

  return (
    <div
      className={edgeToClassName(edge)}
      role="slider"
      aria-label={`canvas-resize-${edge}`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

        const doc = useEditorStore.getState().document;
        if (!doc) return;

        pointerIdRef.current = e.pointerId;
        startXRef.current = e.clientX;
        startYRef.current = e.clientY;
        startWRef.current = doc.global.width;
        startHRef.current = doc.global.height;
      }}
      onPointerMove={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        lastDeltaXRef.current = e.clientX - startXRef.current;
        lastDeltaYRef.current = e.clientY - startYRef.current;

        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const { widthPx, heightPx } = computeCanvasSizeFromDrag({
            edge,
            startWidthPx: startWRef.current,
            startHeightPx: startHRef.current,
            deltaX: lastDeltaXRef.current,
            deltaY: lastDeltaYRef.current,
          });
          useEditorStore.getState().setCanvasSizePx(Math.round(widthPx), Math.round(heightPx));
        });
      }}
      onPointerUp={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        e.preventDefault();
        e.stopPropagation();
        pointerIdRef.current = null;
      }}
      onPointerCancel={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        e.preventDefault();
        e.stopPropagation();
        pointerIdRef.current = null;
      }}
    />
  );
}

export const Workspace = () => {
  const width = useEditorStore((state) => state.document?.global.width ?? 0);
  const height = useEditorStore((state) => state.document?.global.height ?? 0);
  const background = useEditorStore((state) => {
    const doc = state.document;
    if (!doc) return null;
    const page = doc.pages.find((p) => p.pageId === state.currentPageId) ?? doc.pages[0];
    return page?.background ?? null;
  });
  const hasDocument = useEditorStore((state) => state.document !== null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const containerStyle = useMemo(() => {
    const baseStyle = { width: `${width}px`, height: `${height}px`, willChange: 'width, height' };
    if (!background) return { ...baseStyle, background: '#ffffff' };
    if (background.type === 'color') {
      return { ...baseStyle, background: background.value };
    }
    if (background.type === 'gradient') {
      const { direction, colorStops } = background.value;
      const angle = direction === 'horizontal' ? 'to right' : 'to bottom';
      const stops = colorStops
        .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
        .join(', ');
      return { ...baseStyle, background: `linear-gradient(${angle}, ${stops})` };
    }
    return { ...baseStyle, background: '#ffffff' };
  }, [width, height, background]);

  // 引擎初始化，只在挂载时执行一次
  useEffect(() => {
    if (!canvasRef.current) return;
    const doc = useEditorStore.getState().document;
    if (!doc) return;
    engineInstance.init(canvasRef.current, doc.global.width, doc.global.height);
    engineInstance.loadDocument(doc);
    return () => {
      engineInstance.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useLayoutEffect 在 DOM 提交后、浏览器绘制前同步执行，
  // 确保 canvas resize 在当帧内完成，避免「CSS 尺寸已更新但 buffer 还是旧的」拉伸帧
  useLayoutEffect(() => {
    engineInstance.resizeCanvas(width, height);
  }, [width, height]);

  // 只有背景或尺寸变化时才触发 setBackground
  useEffect(() => {
    if (!background) return;
    engineInstance.setBackground(background, width, height);
  }, [background, width, height]);

  if (!hasDocument) return null;

  return (
    <main className="flex-1 relative flex items-center justify-center overflow-auto">
      <div
        className="shadow-xl relative transition-transform origin-center"
        style={containerStyle}
      >
        <ResizeHandle edge="top" />
        <ResizeHandle edge="right" />
        <ResizeHandle edge="bottom" />
        <ResizeHandle edge="left" />
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      </div>
    </main>
  );
};
