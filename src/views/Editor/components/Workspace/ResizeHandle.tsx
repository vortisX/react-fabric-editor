import { useEffect, useRef, useState, type RefObject } from 'react';

import type { DragEdge } from '../../../../core/canvasMath';
import { useEditorStore } from '../../../../store/useEditorStore';

import {
  commitCanvasResizeDrag,
  drawCanvasResizeCommitPreview,
  finishWorkspaceResizePreviewAfterRender,
  measureCanvasResizeFromDrag,
  readWorkspaceFrameAnchor,
  restoreWorkspaceViewportAnchor,
} from './handlers';
import { edgeToClassName } from './shared';

interface WorkspaceResizeHandleProps {
  edge: DragEdge;
  zoom: number;
  previewCanvasRef: RefObject<HTMLCanvasElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  frameRef: RefObject<HTMLDivElement | null>;
  onPreviewSizeChange: (width: number, height: number) => void;
  onPreviewOffsetChange: (offsetX: number, offsetY: number) => void;
  onCommitPreviewChange: (active: boolean) => void;
  onPreviewEnd: () => void;
}

/** Resize handle for interactive document edge dragging in the workspace. */
export const WorkspaceResizeHandle = ({
  edge,
  zoom,
  previewCanvasRef,
  viewportRef,
  frameRef,
  onPreviewSizeChange,
  onPreviewOffsetChange,
  onCommitPreviewChange,
  onPreviewEnd,
}: WorkspaceResizeHandleProps) => {
  const [isActive, setIsActive] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const compensationRafRef = useRef<number | null>(null);
  const lastDeltaXRef = useRef(0);
  const lastDeltaYRef = useRef(0);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (compensationRafRef.current !== null) {
        cancelAnimationFrame(compensationRafRef.current);
      }
    },
    [],
  );

  const applyResize = (commit: boolean) => {
    const anchor = readWorkspaceFrameAnchor(frameRef.current);
    const { widthPx, heightPx } = measureCanvasResizeFromDrag({
      edge,
      zoom,
      startWidth: startWidthRef.current,
      startHeight: startHeightRef.current,
      deltaX: lastDeltaXRef.current,
      deltaY: lastDeltaYRef.current,
    });

    if (!commit) {
      onPreviewSizeChange(widthPx, heightPx);
    }

    if (compensationRafRef.current !== null) {
      cancelAnimationFrame(compensationRafRef.current);
    }

    compensationRafRef.current = requestAnimationFrame(() => {
      compensationRafRef.current = null;
      restoreWorkspaceViewportAnchor(
        viewportRef.current,
        frameRef.current,
        anchor,
      );

      if (!anchor || !frameRef.current) return;

      const { left, top } = frameRef.current.getBoundingClientRect();
      const deltaLeft = anchor.left - left;
      const deltaTop = anchor.top - top;

      const offsetX = deltaLeft / zoom;
      const offsetY = deltaTop / zoom;

      const sanitizedOffsetX = Math.abs(offsetX) >= 0.05 ? offsetX : 0;
      const sanitizedOffsetY = Math.abs(offsetY) >= 0.05 ? offsetY : 0;

      if (!commit) {
        onPreviewOffsetChange(deltaLeft, deltaTop);
        return;
      }

      const hasCommitPreview = drawCanvasResizeCommitPreview(
        previewCanvasRef.current,
        widthPx,
        heightPx,
        sanitizedOffsetX,
        sanitizedOffsetY,
      );
      if (hasCommitPreview) {
        onCommitPreviewChange(true);
        onPreviewOffsetChange(0, 0);
        finishWorkspaceResizePreviewAfterRender(() => {
          onCommitPreviewChange(false);
          onPreviewEnd();
        });
      } else {
        onCommitPreviewChange(false);
      }

      commitCanvasResizeDrag({
        edge,
        zoom,
        startWidth: startWidthRef.current,
        startHeight: startHeightRef.current,
        deltaX: lastDeltaXRef.current,
        deltaY: lastDeltaYRef.current,
        offsetX: sanitizedOffsetX,
        offsetY: sanitizedOffsetY,
      });
      if (!hasCommitPreview) {
        onPreviewEnd();
      }
    });
  };

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
          applyResize(false);
        });
      }}
      onPointerUp={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        lastDeltaXRef.current = event.clientX - startXRef.current;
        lastDeltaYRef.current = event.clientY - startYRef.current;

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }

        applyResize(true);

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
        if (compensationRafRef.current !== null) {
          cancelAnimationFrame(compensationRafRef.current);
          compensationRafRef.current = null;
        }

        onCommitPreviewChange(false);
        onPreviewOffsetChange(0, 0);
        onPreviewEnd();

        pointerIdRef.current = null;
        setIsActive(false);
      }}
    />
  );
};
