import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useEditorStore } from '../../../../store/useEditorStore';
import { WorkspaceResizeHandle } from './ResizeHandle';
import { ZoomControls } from './ZoomControls';
import {
  applyWorkspaceEditorCommand,
  bindWorkspaceSelectionClear,
  bindWorkspaceWheelZoom,
  centerWorkspaceViewport,
  fitWorkspaceToViewport,
  initializeWorkspaceEngine,
  syncWorkspaceBackground,
  syncWorkspaceViewportSize,
  syncWorkspaceZoom,
} from './handlers';
import {
  getWorkspaceCanvasSlotStyle,
  getWorkspaceContainerStyle,
  getWorkspaceScrollAreaStyle,
} from './shared';

/**
 * 编辑器主工作区。
 * 负责承载 Fabric canvas、工作区缩放、拖拽预览与滚动容器同步。
 */
export const Workspace = () => {
  const width = useEditorStore((state) => state.document?.global.width ?? 0);
  const height = useEditorStore((state) => state.document?.global.height ?? 0);
  const background = useEditorStore((state) => {
    const documentState = state.document;
    if (!documentState) return null;
    const page =
      documentState.pages.find((item) => item.pageId === state.currentPageId) ??
      documentState.pages[0];
    return page?.background ?? null;
  });
  const hasDocument = useEditorStore((state) => state.document !== null);
  const zoom = useEditorStore((state) => state.zoom);
  const fitRequest = useEditorStore((state) => state.fitRequest);
  const editorCommand = useEditorStore((state) => state.editorCommand);
  const editorCommandId = useEditorStore((state) => state.editorCommandId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const commitPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const canvasSlotRef = useRef<HTMLDivElement>(null);
  const canvasLayerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [isCommitPreviewVisible, setIsCommitPreviewVisible] = useState(false);
  const [isResizePreviewActive, setIsResizePreviewActive] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const zoomedWidth = width * zoom;
  const zoomedHeight = height * zoom;

  const containerStyle = useMemo(
    () => getWorkspaceContainerStyle(zoomedWidth, zoomedHeight, background),
    [zoomedWidth, zoomedHeight, background],
  );

  /**
   * 命令式更新工作区 DOM 预览，避免拖拽过程中每帧触发 React 重渲染。
   */
  const applyWorkspacePreviewLayout = useCallback(
    (
      previewWidth: number,
      previewHeight: number,
      slotOffsetX = 0,
      slotOffsetY = 0,
    ) => {
      const previewZoomedWidth = previewWidth * zoom;
      const previewZoomedHeight = previewHeight * zoom;
      const nextScrollAreaStyle = getWorkspaceScrollAreaStyle(
        previewZoomedWidth,
        previewZoomedHeight,
        zoom,
        viewportSize.width,
        viewportSize.height,
      );
      const nextCanvasSlotStyle = getWorkspaceCanvasSlotStyle(
        previewZoomedWidth,
        previewZoomedHeight,
        zoom,
        viewportSize.width,
        viewportSize.height,
      );
      const nextFrameStyle = getWorkspaceContainerStyle(
        previewZoomedWidth,
        previewZoomedHeight,
        background,
      );

      if (scrollAreaRef.current) {
        Object.assign(scrollAreaRef.current.style, nextScrollAreaStyle);
      }
      if (canvasSlotRef.current) {
        Object.assign(canvasSlotRef.current.style, {
          ...nextCanvasSlotStyle,
          left: `${Number.parseFloat(nextCanvasSlotStyle.left as string) - slotOffsetX}px`,
          top: `${Number.parseFloat(nextCanvasSlotStyle.top as string) - slotOffsetY}px`,
        });
      }
      if (frameRef.current) {
        Object.assign(frameRef.current.style, {
          ...nextFrameStyle,
          position: 'absolute',
          top: '0px',
          left: '0px',
        });
      }
      if (canvasLayerRef.current) {
        canvasLayerRef.current.style.transform = '';
        canvasLayerRef.current.style.willChange = '';
      }
    },
    [background, viewportSize.height, viewportSize.width, zoom],
  );

  /**
   * 回到 Store 当前真实尺寸对应的稳定布局。
   */
  const resetWorkspacePreviewLayout = useCallback(() => {
    applyWorkspacePreviewLayout(width, height);
  }, [applyWorkspacePreviewLayout, height, width]);

  /**
   * 同步拖拽预览尺寸到 Store，供右侧 CanvasPanel 实时显示宽高数值。
   */
  const handleResizePreviewChange = useCallback(
    (
      nextWidth: number,
      nextHeight: number,
      offsetX: number,
      offsetY: number,
    ) => {
      applyWorkspacePreviewLayout(nextWidth, nextHeight, offsetX, offsetY);
      useEditorStore.getState().setCanvasPreviewSize(nextWidth, nextHeight);
    },
    [applyWorkspacePreviewLayout],
  );

  /**
   * 结束拖拽预览时清理 DOM 预览与预览尺寸状态，恢复到真实画布状态。
   */
  const handleResizePreviewEnd = useCallback(() => {
    setIsResizePreviewActive(false);
    setIsCommitPreviewVisible(false);
    useEditorStore.getState().clearCanvasPreviewSize();
    
    // 强制从 Store 获取最新尺寸，避免因闭包捕获旧尺寸导致松手时画布“抽搐”。
    const documentState = useEditorStore.getState().document;
    if (documentState) {
      applyWorkspacePreviewLayout(documentState.global.width, documentState.global.height);
    } else {
      resetWorkspacePreviewLayout();
    }
  }, [applyWorkspacePreviewLayout, resetWorkspacePreviewLayout]);

  /**
   * 首次挂载时初始化 Fabric Engine，并在卸载时释放资源。
   */
  useEffect(() => initializeWorkspaceEngine(canvasRef.current), []);

  /**
   * 当 Store 发出新的编辑命令时，把命令桥接给 Fabric Engine。
   */
  useLayoutEffect(() => {
    applyWorkspaceEditorCommand(editorCommand);
  }, [editorCommand, editorCommandId]);

  /**
   * 背景变化后，同步到工作区的 Fabric 场景。
   */
  useLayoutEffect(() => {
    syncWorkspaceBackground(width, height);
  }, [background, width, height]);

  /**
   * zoom 变化后同步到 Engine，保证 Fabric buffer 与显示尺寸一致。
   */
  useLayoutEffect(() => {
    syncWorkspaceZoom(zoom);
  }, [zoom]);

  /**
   * 当真实尺寸、缩放或视口变化时，把预览 DOM 回写到稳定状态。
   */
  useLayoutEffect(() => {
    if (isResizePreviewActive) return;
    resetWorkspacePreviewLayout();
  }, [isResizePreviewActive, resetWorkspacePreviewLayout]);

  /**
   * zoom 变化后重新把画布居中到工作区视口。
   */
  useLayoutEffect(() => {
    if (!viewportRef.current) return;
    centerWorkspaceViewport(viewportRef.current);
  }, [zoom]);

  /**
   * 工作区可视区域变化后，把最新 viewport 尺寸同步给 Engine。
   * 并在动画彻底结束后强制纠偏居中，确保最后位置绝对正确。
   */
  useLayoutEffect(() => {
    syncWorkspaceViewportSize(viewportSize.width, viewportSize.height);
    
    // 使用 requestAnimationFrame 等待 DOM 完全稳定
    requestAnimationFrame(() => {
      if (viewportRef.current) {
        centerWorkspaceViewport(viewportRef.current);
      }
    });
  }, [viewportSize.width, viewportSize.height]);

  /**
   * 首次进入编辑器时自动执行一次“适应画布”。
   */
  useEffect(() => {
    fitWorkspaceToViewport(viewportRef.current);
  }, []);

  /**
   * 外部触发 Fit 请求时，重新计算并应用适应画布缩放。
   */
  useEffect(() => {
    if (fitRequest === 0) return;
    fitWorkspaceToViewport(viewportRef.current);
  }, [fitRequest]);

  /**
   * 点击工作区空白区域时清空当前选中图层。
   */
  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return undefined;
    return bindWorkspaceSelectionClear(viewportElement);
  }, []);

  /**
   * 绑定工作区滚轮缩放行为。
   */
  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return undefined;
    return bindWorkspaceWheelZoom(viewportElement);
  }, []);

  /**
   * 监听工作区容器尺寸，给 viewport 与缓冲层计算提供实时可视尺寸。
   */
  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return undefined;

    /**
     * 读取工作区当前可视尺寸，并写入本地 state。
     */
    const updateViewportSize = () => {
      setViewportSize({
        width: viewportElement.clientWidth,
        height: viewportElement.clientHeight,
      });
    };

    updateViewportSize();

    /**
     * 工作区尺寸变化后重新读取可视区大小。
     * 使用防抖，避免在面板折叠动画期间高频触发 React State 更新（导致掉帧）。
     */
    let resizeTimer: number;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        updateViewportSize();
      }, 300); // 匹配 CSS 过渡时间
    });

    observer.observe(viewportElement);
    return () => {
      window.clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, []);



  if (!hasDocument) return null;

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        ref={viewportRef}
        className="workspace-viewport flex-1 overflow-auto bg-[#F4F5F7]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(200, 205, 212, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200, 205, 212, 0.4) 1px, transparent 1px),
            linear-gradient(rgba(200, 205, 212, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200, 205, 212, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px, 80px 80px, 16px 16px, 16px 16px',
          backgroundPosition: '-1px -1px, -1px -1px, -1px -1px, -1px -1px',
        }}
      >
        <div
          ref={scrollAreaRef}
          style={getWorkspaceScrollAreaStyle(
            zoomedWidth,
            zoomedHeight,
            zoom,
            viewportSize.width,
            viewportSize.height,
          )}
        >
          <div
            ref={canvasSlotRef}
            style={getWorkspaceCanvasSlotStyle(
              zoomedWidth,
              zoomedHeight,
              zoom,
              viewportSize.width,
              viewportSize.height,
            )}
          >
            <div
              ref={frameRef}
              className="relative overflow-visible shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_8px_32px_-4px_rgba(0,0,0,0.06),0_24px_64px_-12px_rgba(0,0,0,0.08)] bg-white"
              style={{
                ...containerStyle,
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              <WorkspaceResizeHandle
                edge="top"
                zoom={zoom}
                previewCanvasRef={commitPreviewCanvasRef}
                viewportRef={viewportRef}
                onPreviewStart={() => {
                  setIsResizePreviewActive(true);
                }}
                onPreviewChange={handleResizePreviewChange}
                onCommitPreviewChange={(active) => {
                  setIsCommitPreviewVisible(active);
                }}
                onPreviewEnd={handleResizePreviewEnd}
              />
              <WorkspaceResizeHandle
                edge="right"
                zoom={zoom}
                previewCanvasRef={commitPreviewCanvasRef}
                viewportRef={viewportRef}
                onPreviewStart={() => {
                  setIsResizePreviewActive(true);
                }}
                onPreviewChange={handleResizePreviewChange}
                onCommitPreviewChange={(active) => {
                  setIsCommitPreviewVisible(active);
                }}
                onPreviewEnd={handleResizePreviewEnd}
              />
              <WorkspaceResizeHandle
                edge="bottom"
                zoom={zoom}
                previewCanvasRef={commitPreviewCanvasRef}
                viewportRef={viewportRef}
                onPreviewStart={() => {
                  setIsResizePreviewActive(true);
                }}
                onPreviewChange={handleResizePreviewChange}
                onCommitPreviewChange={(active) => {
                  setIsCommitPreviewVisible(active);
                }}
                onPreviewEnd={handleResizePreviewEnd}
              />
              <WorkspaceResizeHandle
                edge="left"
                zoom={zoom}
                previewCanvasRef={commitPreviewCanvasRef}
                viewportRef={viewportRef}
                onPreviewStart={() => {
                  setIsResizePreviewActive(true);
                }}
                onPreviewChange={handleResizePreviewChange}
                onCommitPreviewChange={(active) => {
                  setIsCommitPreviewVisible(active);
                }}
                onPreviewEnd={handleResizePreviewEnd}
              />
              <div ref={canvasLayerRef} className="absolute inset-0 z-0 overflow-visible">
                <canvas ref={canvasRef} className="absolute left-0 top-0" />
              </div>
              <canvas
                ref={commitPreviewCanvasRef}
                className={`pointer-events-none absolute left-0 top-0 z-10 ${
                  isCommitPreviewVisible ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
      
      <ZoomControls />
    </main>
  );
};
