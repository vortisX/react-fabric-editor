import { useEffect, useRef, useState, type RefObject } from 'react';

import type { DragEdge } from '../../../../core/canvas/canvasMath';
import { useEditorStore } from '../../../../store/useEditorStore';

import {
  commitCanvasResizeDrag,
  drawCanvasResizeCommitPreview,
  finishWorkspaceResizePreviewAfterRender,
  measureCanvasResizeFromDrag,
} from './handlers';
import { edgeToClassName } from './shared';

interface WorkspaceResizeHandleProps {
  edge: DragEdge;
  zoom: number;
  previewCanvasRef: RefObject<HTMLCanvasElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  onPreviewStart: () => void;
  onPreviewChange: (
    width: number,
    height: number,
    slotOffsetX: number,
    slotOffsetY: number,
  ) => void;
  onCommitPreviewChange: (active: boolean) => void;
  onPreviewEnd: () => void;
}

/**
 * 画布四边拖拽手柄。
 * 规则非常直接：拖哪边哪边动；预览阶段只做 DOM 变换，松手后再一次性提交真实尺寸。
 */
export const WorkspaceResizeHandle = ({
  edge,
  zoom,
  previewCanvasRef,
  viewportRef,
  onPreviewStart,
  onPreviewChange,
  onCommitPreviewChange,
  onPreviewEnd,
}: WorkspaceResizeHandleProps) => {
  const [isActive, setIsActive] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const startScrollTopRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastDeltaXRef = useRef(0);
  const lastDeltaYRef = useRef(0);

  /**
   * 组件卸载时清理未执行的动画帧。
   */
  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    },
    [],
  );

  /**
   * 按拖拽边计算本次 resize 预览/提交所需的尺寸、槽位偏移和滚动补偿。
   */
  const readDragSnapshot = () => {
    const { widthPx, heightPx } = measureCanvasResizeFromDrag({
      edge,
      zoom,
      startWidth: startWidthRef.current,
      startHeight: startHeightRef.current,
      deltaX: lastDeltaXRef.current,
      deltaY: lastDeltaYRef.current,
    });

    const slotOffsetX =
      edge === 'left' ? widthPx - startWidthRef.current : 0;
    const slotOffsetY =
      edge === 'top' ? heightPx - startHeightRef.current : 0;

    return {
      widthPx,
      heightPx,
      slotOffsetX,
      slotOffsetY,
      slotOffsetXPx: slotOffsetX * zoom,
      slotOffsetYPx: slotOffsetY * zoom,
      nextScrollLeft: startScrollLeftRef.current + slotOffsetX * zoom,
      nextScrollTop: startScrollTopRef.current + slotOffsetY * zoom,
    };
  };

  /**
   * 应用拖拽预览或最终提交。
   */
  const applyResize = (commit: boolean) => {
    const snapshot = readDragSnapshot();
    const viewportElement = viewportRef.current;

    if (!commit) {
      onPreviewChange(
        snapshot.widthPx,
        snapshot.heightPx,
        snapshot.slotOffsetXPx,
        snapshot.slotOffsetYPx,
      );
      return;
    }

    const hasCommitPreview = drawCanvasResizeCommitPreview(
      previewCanvasRef.current,
      snapshot.widthPx,
      snapshot.heightPx,
      0,
      0,
    );

    if (hasCommitPreview) {
      onCommitPreviewChange(true);
    }

    commitCanvasResizeDrag({
      edge,
      zoom,
      startWidth: startWidthRef.current,
      startHeight: startHeightRef.current,
      deltaX: lastDeltaXRef.current,
      deltaY: lastDeltaYRef.current,
      offsetX: 0,
      offsetY: 0,
    });

    if (hasCommitPreview) {
      finishWorkspaceResizePreviewAfterRender(() => {
        if (viewportElement) {
          viewportElement.scrollLeft = snapshot.nextScrollLeft;
          viewportElement.scrollTop = snapshot.nextScrollTop;
        }
        onCommitPreviewChange(false);
        onPreviewEnd();
      });
      return;
    }

    if (viewportElement) {
      viewportElement.scrollLeft = snapshot.nextScrollLeft;
      viewportElement.scrollTop = snapshot.nextScrollTop;
    }
    onPreviewEnd();
  };

  /**
   * 取消拖拽，恢复到拖拽开始前的视口与预览状态。
   */
  const cancelResizePreview = () => {
    const viewportElement = viewportRef.current;
    if (viewportElement) {
      viewportElement.scrollLeft = startScrollLeftRef.current;
      viewportElement.scrollTop = startScrollTopRef.current;
    }
    onCommitPreviewChange(false);
    onPreviewEnd();
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
        onPreviewStart();
        pointerIdRef.current = event.pointerId;
        startXRef.current = event.clientX;
        startYRef.current = event.clientY;
        startWidthRef.current = documentState.global.width;
        startHeightRef.current = documentState.global.height;
        startScrollLeftRef.current = viewportRef.current?.scrollLeft ?? 0;
        startScrollTopRef.current = viewportRef.current?.scrollTop ?? 0;
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

        cancelResizePreview();

        pointerIdRef.current = null;
        setIsActive(false);
      }}
    />
  );
};
