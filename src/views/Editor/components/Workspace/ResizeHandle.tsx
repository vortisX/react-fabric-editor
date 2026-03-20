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

/**
 * 工作区边缘拖拽手柄。
 * 负责把用户的指针拖拽转换成画布尺寸预览、位移补偿以及最终提交。
 */
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

  /** 组件卸载时清理所有残留 rAF，避免异步回调继续操作已卸载的节点。 */
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

  /**
   * 根据当前拖拽位移应用尺寸预览或最终提交。
   * `commit=false` 时只更新视觉预览，`commit=true` 时会触发 Store 提交与最终 overlay 预览。
   */
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
      // 为什么先恢复 viewport 锚点：
      // 当左/上边缩小时，画框左上角会移动，如果不先补偿滚动位置，用户会感觉当前视口内容被突然推走。
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

      // 为什么这里做阈值清洗：
      // DOM 布局与浮点缩放会引入极小抖动，如果把 0.01 这类噪声也提交到 Store，
      // 会造成预览和历史记录里出现肉眼看不见、但持续累积的偏移。
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
        // 为什么等真实 Fabric 渲染完成再关预览：
        // 避免 overlay 提前消失，导致用户在 commit 瞬间看到真实 buffer 还没准备好的闪烁。
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
        // 进入拖拽前先接管 pointer，避免指针移出手柄后丢失后续 move/up 事件。
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

        // 为什么 move 过程要节流到 rAF：
        // 指针移动频率可能远高于浏览器绘制频率，直接同步会让预览更新过于密集并拖慢主线程。
        if (rafRef.current !== null) return;

        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          applyResize(false);
        });
      }}
      onPointerUp={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;

        // 指针抬起时立刻收尾，并把最后一次位移提交为正式结果。
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

        // pointer cancel 通常表示浏览器中断了本次手势，这里必须完整撤销预览态。
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
