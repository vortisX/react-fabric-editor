import { useEffect, useRef, useState, type RefObject } from 'react';

import type { DragEdge } from '../../../../core/canvas/canvasMath';
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
 * 宸ヤ綔鍖鸿竟缂樻嫋鎷芥墜鏌勩€?
 * 璐熻矗鎶婄敤鎴风殑鎸囬拡鎷栨嫿杞崲鎴愮敾甯冨昂瀵搁瑙堛€佷綅绉昏ˉ鍋夸互鍙婃渶缁堟彁浜ゃ€?
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

  /** 缁勪欢鍗歌浇鏃舵竻鐞嗘墍鏈夋畫鐣?rAF锛岄伩鍏嶅紓姝ュ洖璋冪户缁搷浣滃凡鍗歌浇鐨勮妭鐐广€?*/
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
   * 鏍规嵁褰撳墠鎷栨嫿浣嶇Щ搴旂敤灏哄棰勮鎴栨渶缁堟彁浜ゃ€?
   * `commit=false` 鏃跺彧鏇存柊瑙嗚棰勮锛宍commit=true` 鏃朵細瑙﹀彂 Store 鎻愪氦涓庢渶缁?overlay 棰勮銆?
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
      // 涓轰粈涔堝厛鎭㈠ viewport 閿氱偣锛?
      // 褰撳乏/涓婅竟缂╁皬鏃讹紝鐢绘宸︿笂瑙掍細绉诲姩锛屽鏋滀笉鍏堣ˉ鍋挎粴鍔ㄤ綅缃紝鐢ㄦ埛浼氭劅瑙夊綋鍓嶈鍙ｅ唴瀹硅绐佺劧鎺ㄨ蛋銆?
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

      // 涓轰粈涔堣繖閲屽仛闃堝€兼竻娲楋細
      // DOM 甯冨眬涓庢诞鐐圭缉鏀句細寮曞叆鏋佸皬鎶栧姩锛屽鏋滄妸 0.01 杩欑被鍣０涔熸彁浜ゅ埌 Store锛?
      // 浼氶€犳垚棰勮鍜屽巻鍙茶褰曢噷鍑虹幇鑲夌溂鐪嬩笉瑙併€佷絾鎸佺画绱Н鐨勫亸绉汇€?
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
        // 涓轰粈涔堢瓑鐪熷疄 Fabric 娓叉煋瀹屾垚鍐嶅叧棰勮锛?
        // 閬垮厤 overlay 鎻愬墠娑堝け锛屽鑷寸敤鎴峰湪 commit 鐬棿鐪嬪埌鐪熷疄 buffer 杩樻病鍑嗗濂界殑闂儊銆?
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
        // 杩涘叆鎷栨嫿鍓嶅厛鎺ョ pointer锛岄伩鍏嶆寚閽堢Щ鍑烘墜鏌勫悗涓㈠け鍚庣画 move/up 浜嬩欢銆?
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

        // 涓轰粈涔?move 杩囩▼瑕佽妭娴佸埌 rAF锛?
        // 鎸囬拡绉诲姩棰戠巼鍙兘杩滈珮浜庢祻瑙堝櫒缁樺埗棰戠巼锛岀洿鎺ュ悓姝ヤ細璁╅瑙堟洿鏂拌繃浜庡瘑闆嗗苟鎷栨參涓荤嚎绋嬨€?
        if (rafRef.current !== null) return;

        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          applyResize(false);
        });
      }}
      onPointerUp={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;

        // 鎸囬拡鎶捣鏃剁珛鍒绘敹灏撅紝骞舵妸鏈€鍚庝竴娆′綅绉绘彁浜や负姝ｅ紡缁撴灉銆?
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

        // pointer cancel 閫氬父琛ㄧず娴忚鍣ㄤ腑鏂簡鏈鎵嬪娍锛岃繖閲屽繀椤诲畬鏁存挙閿€棰勮鎬併€?
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
