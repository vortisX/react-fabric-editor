import { useEffect, useRef, useState } from 'react';

import type { DragEdge } from '../../../../core/canvasMath';
import { useEditorStore } from '../../../../store/useEditorStore';

import { applyCanvasResizeFromDrag } from './handlers';
import { edgeToClassName } from './shared';

interface WorkspaceResizeHandleProps {
  edge: DragEdge;
  zoom: number;
}

/** Resize handle for interactive document edge dragging in the workspace. */
export const WorkspaceResizeHandle = ({
  edge,
  zoom,
}: WorkspaceResizeHandleProps) => {
  const [isActive, setIsActive] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastDeltaXRef = useRef(0);
  const lastDeltaYRef = useRef(0);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    },
    [],
  );

  return (
    <div
      className={edgeToClassName(edge, isActive)}
      role="slider"
      aria-label={`canvas-resize-${edge}`}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);

        const documentState = useEditorStore.getState().document;
        if (!documentState) return;

        setIsActive(true);
        pointerIdRef.current = event.pointerId;
        startXRef.current = event.clientX;
        startYRef.current = event.clientY;
        startWidthRef.current = documentState.global.width;
        startHeightRef.current = documentState.global.height;
      }}
      onPointerMove={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;

        lastDeltaXRef.current = event.clientX - startXRef.current;
        lastDeltaYRef.current = event.clientY - startYRef.current;

        if (rafRef.current !== null) return;

        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          applyCanvasResizeFromDrag({
            edge,
            zoom,
            startWidth: startWidthRef.current,
            startHeight: startHeightRef.current,
            deltaX: lastDeltaXRef.current,
            deltaY: lastDeltaYRef.current,
            commit: false,
          });
        });
      }}
      onPointerUp={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }

        applyCanvasResizeFromDrag({
          edge,
          zoom,
          startWidth: startWidthRef.current,
          startHeight: startHeightRef.current,
          deltaX: lastDeltaXRef.current,
          deltaY: lastDeltaYRef.current,
          commit: true,
        });

        pointerIdRef.current = null;
        setIsActive(false);
      }}
      onPointerCancel={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }

        pointerIdRef.current = null;
        setIsActive(false);
      }}
    />
  );
};
