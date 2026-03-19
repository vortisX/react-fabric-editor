import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { engineInstance } from '../../../core/engine';
import { computeCanvasSizeFromDrag, type DragEdge } from '../../../core/canvasMath';
import { ZoomControls } from './ZoomControls';
import type { ImageLayer, TextLayer } from '../../../types/schema';

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
function edgeToClassName(edge: DragEdge, isActive: boolean): string {
  const colorClass = isActive ? 'bg-[#18a0fb]' : 'bg-gray-400 hover:bg-[#18a0fb]';
  const common = `absolute rounded-full opacity-90 shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition-colors duration-200 ${colorClass}`;

  if (edge === 'left') {
    return `${common} top-1/2 -left-3 w-2 h-10 cursor-ew-resize -translate-y-1/2`;
  }
  if (edge === 'right') {
    return `${common} top-1/2 -right-3 w-2 h-10 cursor-ew-resize -translate-y-1/2`;
  }
  if (edge === 'top') {
    return `${common} left-1/2 -top-3 w-10 h-2 cursor-ns-resize -translate-x-1/2`;
  }
  // bottom
  return `${common} left-1/2 -bottom-3 w-10 h-2 cursor-ns-resize -translate-x-1/2`;
}

function ResizeHandle({ edge, zoom }: { edge: DragEdge; zoom: number }) {
  const [isActive, setIsActive] = useState(false);
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
      className={edgeToClassName(edge, isActive)}
      role="slider"
      aria-label={`canvas-resize-${edge}`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

        const doc = useEditorStore.getState().document;
        if (!doc) return;

        setIsActive(true);
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
          useEditorStore
            .getState()
            .setCanvasSizePx(Math.round(widthPx), Math.round(heightPx), { commit: false });
        });
      }}
      onPointerUp={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        e.preventDefault();
        e.stopPropagation();
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        const { widthPx, heightPx } = computeCanvasSizeFromDrag({
          edge,
          startWidthPx: startWRef.current,
          startHeightPx: startHRef.current,
          deltaX: lastDeltaXRef.current / zoom,
          deltaY: lastDeltaYRef.current / zoom,
        });
        useEditorStore
          .getState()
          .setCanvasSizePx(Math.round(widthPx), Math.round(heightPx), { commit: true });
        pointerIdRef.current = null;
        setIsActive(false);
      }}
      onPointerCancel={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        e.preventDefault();
        e.stopPropagation();
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        pointerIdRef.current = null;
        setIsActive(false);
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
  const editorCommand = useEditorStore((state) => state.editorCommand);
  const editorCommandId = useEditorStore((state) => state.editorCommandId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // 提前计算，供 containerStyle useMemo 和 JSX 共用
  const zoomedW = width * zoom;
  const zoomedH = height * zoom;

  const containerStyle = useMemo(() => {
    // 容器尺寸使用缩放后的实际像素（不再依赖 CSS transform scale）
    const baseStyle = { width: `${zoomedW}px`, height: `${zoomedH}px` };
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
  }, [zoomedW, zoomedH, background]);

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
  }, []);

  useEffect(() => {
    if (!editorCommand || !engineInstance.isReady()) return;

    if (editorCommand.type === 'selection:set') {
      if (editorCommand.layerId) {
        engineInstance.selectLayer(editorCommand.layerId);
      } else {
        engineInstance.clearSelection();
      }
      return;
    }

    if (editorCommand.type === 'layer:update') {
      engineInstance.updateLayerProps(editorCommand.layerId, editorCommand.payload);
      return;
    }

    if (editorCommand.type === 'document:load') {
      engineInstance.loadDocument(editorCommand.document);
      return;
    }

    if (editorCommand.type !== 'layer:add') return;

    if (editorCommand.layer.type === 'text') {
      const measured = engineInstance.addTextLayer(editorCommand.layer as TextLayer);
      if (!measured) return;
      useEditorStore.getState().updateLayer(
        editorCommand.layer.id,
        measured,
        { commit: false, origin: 'engine' },
      );
      return;
    }

    void engineInstance
      .addImageLayer(editorCommand.layer as ImageLayer)
      .then((measured) => {
        if (!measured) return;
        useEditorStore.getState().updateLayer(
          editorCommand.layer.id,
          measured,
          { commit: false, origin: 'engine' },
        );
      });
  }, [editorCommand, editorCommandId]);

  // useLayoutEffect 在 DOM 提交后、浏览器绘制前同步执行，
  // 确保 canvas resize 在当帧内完成，避免「CSS 尺寸已更新但 buffer 还是旧的」拉伸帧
  useEffect(() => {
    engineInstance.resizeCanvas(width, height);
  }, [width, height]);

  // 只有背景或尺寸变化时才触发 setBackground
  useEffect(() => {
    if (!background) return;
    engineInstance.setBackground(background, width, height);
  }, [background, width, height]);

  // zoom 变化时通知引擎使用 Fabric 原生 zoom 重绘，canvas buffer 精确对应显示像素，避免字体发虚
  useEffect(() => {
    engineInstance.setDisplayZoom(zoom);
  }, [zoom]);

  // 首次挂载时自动适应画布
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const { document: doc } = useEditorStore.getState();
    if (!doc) return;
    const fit = calcFitZoom(doc.global.width, doc.global.height, vp.clientWidth, vp.clientHeight);
    setZoom(fit);
  }, [setZoom]);

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

  // 点击工作区灰色背景时清除图层选中，让 RightPanel 切回 CanvasPanel
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onPointerDown = (e: PointerEvent) => {
      // Fabric v7 会创建 upper-canvas（接收鼠标事件）和 lower-canvas（canvasRef）两个兄弟节点。
      // 必须用 wrapperEl（两者共同的父容器 div）来判断点击是否在画布区域内，
      // 而不能用 canvasRef（lower-canvas），否则所有 upper-canvas 上的点击都会被误判为"画布外"。
      if (!engineInstance.isTargetInsideCanvas(e.target)) {
        useEditorStore.getState().setActiveLayer(null);
      }
    };

    vp.addEventListener('pointerdown', onPointerDown);
    return () => vp.removeEventListener('pointerdown', onPointerDown);
  }, []);

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
          {/* 画布容器：尺寸已是缩放后实际像素，Fabric 内部通过 setZoom 渲染，无需 CSS transform */}
            <div
              className="shadow-xl relative"
              style={{
                ...containerStyle,
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              <ResizeHandle edge="top" zoom={zoom} />
              <ResizeHandle edge="right" zoom={zoom} />
              <ResizeHandle edge="bottom" zoom={zoom} />
              <ResizeHandle edge="left" zoom={zoom} />
              {/* canvas 元素由 Fabric 自行控制 CSS 尺寸，不加 w-full h-full 避免干扰 */}
              <canvas ref={canvasRef} className="absolute top-0 left-0" />
            </div>
          </div>
        </div>
      </div>

      <ZoomControls />
    </main>
  );
};
