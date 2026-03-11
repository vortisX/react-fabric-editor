import { useRef, type CSSProperties } from 'react';
import { computeCanvasSizeFromDrag, type DragEdge } from '../../../core/canvasMath';
import { useEditorStore } from '../../../store/useEditorStore';
import { THEME_PRIMARY } from '../../../core/constants';

type HandleProps = {
  edge: DragEdge;
};

function edgeToStyle(edge: DragEdge): { className: string; style: CSSProperties } {
  const common: CSSProperties = {
    background: THEME_PRIMARY,
    opacity: 0.9,
    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
  };

  if (edge === 'left') {
    return {
      className: 'absolute top-1/2 -left-3 w-2 h-10 rounded-full cursor-ew-resize',
      style: { ...common, transform: 'translateY(-50%)' },
    };
  }
  if (edge === 'right') {
    return {
      className: 'absolute top-1/2 -right-3 w-2 h-10 rounded-full cursor-ew-resize',
      style: { ...common, transform: 'translateY(-50%)' },
    };
  }
  if (edge === 'top') {
    return {
      className: 'absolute left-1/2 -top-3 w-10 h-2 rounded-full cursor-ns-resize',
      style: { ...common, transform: 'translateX(-50%)' },
    };
  }
  return {
    className: 'absolute left-1/2 -bottom-3 w-10 h-2 rounded-full cursor-ns-resize',
    style: { ...common, transform: 'translateX(-50%)' },
  };
}

function ResizeHandle({ edge }: HandleProps) {
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWRef = useRef(0);
  const startHRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastDeltaXRef = useRef(0);
  const lastDeltaYRef = useRef(0);

  const { className, style } = edgeToStyle(edge);

  return (
    <div
      className={className}
      style={style}
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

          const nextW = Math.round(widthPx);
          const nextH = Math.round(heightPx);

          const store = useEditorStore.getState();
          store.setCanvasSizePx(nextW, nextH);
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

export function CanvasResizeHandles() {
  return (
    <>
      <ResizeHandle edge="top" />
      <ResizeHandle edge="right" />
      <ResizeHandle edge="bottom" />
      <ResizeHandle edge="left" />
    </>
  );
}
