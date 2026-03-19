import { useEffect, useRef, useState, type RefObject } from 'react';

import type { DragEdge } from '../../../../core/canvasMath';
import { useEditorStore } from '../../../../store/useEditorStore';

import {
  applyCanvasResizeFromDrag,
  measureCanvasResizeFromDrag,
  readWorkspaceFrameAnchor,
  restoreWorkspaceViewportAnchor,
} from './handlers';
import { edgeToClassName } from './shared';

interface WorkspaceResizeHandleProps {
  edge: DragEdge;
  zoom: number;
  viewportRef: RefObject<HTMLDivElement | null>;
  frameRef: RefObject<HTMLDivElement | null>;
  onPreviewSizeChange: (width: number, height: number) => void;
  onPreviewOffsetChange: (offsetX: number, offsetY: number) => void;
  onPreviewEnd: () => void;
}

/** Resize handle for interactive document edge dragging in the workspace. */
export const WorkspaceResizeHandle = ({
  edge,
  zoom,
  viewportRef,
  frameRef,
  onPreviewSizeChange,
  onPreviewOffsetChange,
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

    onPreviewSizeChange(widthPx, heightPx);

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

      onPreviewOffsetChange(deltaLeft, deltaTop);

      const offsetX = deltaLeft / zoom;
      const offsetY = deltaTop / zoom;

      if (!commit) return;

      // 为什么只在提交时才改真实图层：
      // 拖拽预览阶段只做 CSS 位移补偿，可以避免 Fabric 每帧重排导致的抽搐。
      if (Math.abs(offsetX) >= 0.05 || Math.abs(offsetY) >= 0.05) {
        useEditorStore.getState().translateCurrentPageLayers(offsetX, offsetY, {
          commit: false,
        });
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
      requestAnimationFrame(() => {
        onPreviewEnd();
      });
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

        onPreviewOffsetChange(0, 0);
        onPreviewEnd();

        pointerIdRef.current = null;
        setIsActive(false);
      }}
    />
  );
};
