import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { engineInstance } from '../../../core/engine';
import { computeCanvasSizeFromDrag, type DragEdge } from '../../../core/canvasMath';
import { ZoomControls } from './ZoomControls';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2.0;
const WORKSPACE_PADDING = 60;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/** 计算"适应画布"缩放比例，让画布在当前视口中以 WORKSPACE_PADDING 留白完整显示 */
function calcFitZoom(canvasW: number, canvasH: number, vpW: number, vpH: number): number {
  if (canvasW === 0 || canvasH === 0 || vpW === 0 || vpH === 0) return 1;
  const scaleW = (vpW - WORKSPACE_PADDING * 2) / canvasW;
  const scaleH = (vpH - WORKSPACE_PADDING * 2) / canvasH;
  return clampZoom(Math.min(scaleW, scaleH));
}

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

function ResizeHandle({ edge, zoom }: { edge: DragEdge; zoom: number }) {
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
            // 将屏幕像素转换回文档像素：拖拽 delta 要除以 zoom
            deltaX: lastDeltaXRef.current / zoom,
            deltaY: lastDeltaYRef.current / zoom,
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
  const zoom = useEditorStore((state) => state.zoom);
  const fitRequest = useEditorStore((state) => state.fitRequest);
  const setZoom = useEditorStore((state) => state.setZoom);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const containerStyle = useMemo(() => {
    const baseStyle = { width: `${width}px`, height: `${height}px` };
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

  // zoom 变化后重新计算 Fabric 内部坐标偏移（CSS transform 改变了元素在视口中的位置）
  useLayoutEffect(() => {
    engineInstance.canvas?.calcOffset();
  }, [zoom]);

  // 首次挂载时自动适应画布
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const { document: doc } = useEditorStore.getState();
    if (!doc) return;
    const fit = calcFitZoom(doc.global.width, doc.global.height, vp.clientWidth, vp.clientHeight);
    setZoom(fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fitRequest 变化时重新计算适应画布（预设切换、手动触发）
  useEffect(() => {
    if (fitRequest === 0) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const { document: doc } = useEditorStore.getState();
    if (!doc) return;
    const fit = calcFitZoom(doc.global.width, doc.global.height, vp.clientWidth, vp.clientHeight);
    setZoom(fit);
  }, [fitRequest, setZoom]);

  // Ctrl + 滚轮缩放
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      // deltaY > 0 → 向下滚 → 缩小；deltaY < 0 → 向上滚 → 放大
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const current = useEditorStore.getState().zoom;
      const next = clampZoom(Math.round((current + delta) * 10) / 10);
      useEditorStore.getState().setZoom(next);
    };

    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, []);

  if (!hasDocument) return null;

  const zoomedW = width * zoom;
  const zoomedH = height * zoom;

  return (
    <main className="flex-1 relative flex flex-col overflow-hidden">
      {/* 可滚动视口 */}
      <div
        ref={viewportRef}
        className="flex-1 overflow-auto bg-[#f0f0f0]"
      >
        {/* 滚动内容区：尺寸决定滚动条范围（CSS transform 不影响布局流） */}
        <div
          style={{
            width: `${zoomedW + WORKSPACE_PADDING * 2}px`,
            minWidth: '100%',
            height: `${zoomedH + WORKSPACE_PADDING * 2}px`,
            minHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 视觉占位层：占据缩放后的像素空间，防止 transform:scale 导致的布局塌陷 */}
          <div
            style={{
              width: `${zoomedW}px`,
              height: `${zoomedH}px`,
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {/* 画布容器：保持文档原始尺寸，通过 CSS scale 放大/缩小显示 */}
            <div
              className="shadow-xl relative"
              style={{
                ...containerStyle,
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <ResizeHandle edge="top" zoom={zoom} />
              <ResizeHandle edge="right" zoom={zoom} />
              <ResizeHandle edge="bottom" zoom={zoom} />
              <ResizeHandle edge="left" zoom={zoom} />
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
            </div>
          </div>
        </div>
      </div>

      <ZoomControls />
    </main>
  );
};
