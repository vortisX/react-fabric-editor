import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useEditorStore } from '../../../../store/useEditorStore';
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
import { WorkspaceResizeHandle } from './ResizeHandle';
import {
  getWorkspaceCanvasSlotStyle,
  getWorkspaceContainerStyle,
  getWorkspaceScrollAreaStyle,
} from './shared';

/**
 * 编辑器主工作区。
 * 负责承载 Fabric canvas、工作区缩放、尺寸拖拽预览、滚动容器与缓冲层同步。
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [resizePreview, setResizePreview] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [isCommitPreviewVisible, setIsCommitPreviewVisible] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const displayWidth = resizePreview?.width ?? width;
  const displayHeight = resizePreview?.height ?? height;
  const zoomedWidth = displayWidth * zoom;
  const zoomedHeight = displayHeight * zoom;

  const containerStyle = useMemo(
    () => getWorkspaceContainerStyle(zoomedWidth, zoomedHeight, background),
    [zoomedWidth, zoomedHeight, background],
  );

  /** 首次挂载时初始化 Fabric Engine，并在卸载时释放资源。 */
  useEffect(() => initializeWorkspaceEngine(canvasRef.current), []);

  /** 当 Store 发出新的编辑命令时，把命令桥接到 Fabric Engine。 */
  useLayoutEffect(() => {
    applyWorkspaceEditorCommand(editorCommand);
  }, [editorCommand, editorCommandId]);

  /** 当前页面背景变化后，立即同步到工作区的 Fabric 渲染层。 */
  useLayoutEffect(() => {
    syncWorkspaceBackground(width, height);
  }, [background, width, height]);

  /** 每次 zoom 变化都同步到 Engine，保证 Fabric buffer 与显示尺寸一致。 */
  useLayoutEffect(() => {
    syncWorkspaceZoom(zoom);
  }, [zoom]);

  /** 每次 zoom 变化后，把画布重新置于工作区中心，符合当前产品交互定义。 */
  useLayoutEffect(() => {
    if (!viewportRef.current) return;
    centerWorkspaceViewport(viewportRef.current);
  }, [zoom]);

  /** 工作区可视区域变化后，把最新 viewport 尺寸同步给 Engine。 */
  useLayoutEffect(() => {
    syncWorkspaceViewportSize(viewportSize.width, viewportSize.height);
  }, [viewportSize]);

  /** 首次进入编辑器时自动执行一次“适应画布”。 */
  useEffect(() => {
    fitWorkspaceToViewport(viewportRef.current);
  }, []);

  /** 当外部发起 Fit 请求时，重新计算并应用适应画布缩放。 */
  useEffect(() => {
    if (fitRequest === 0) return;
    fitWorkspaceToViewport(viewportRef.current);
  }, [fitRequest]);

  /** 点击工作区空白区域时清空当前选中图层。 */
  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return undefined;
    return bindWorkspaceSelectionClear(viewportElement);
  }, []);

  /** 绑定工作区滚轮缩放行为。 */
  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return undefined;
    return bindWorkspaceWheelZoom(viewportElement);
  }, []);

  /** 监听工作区容器尺寸，给缓冲层计算提供实时 viewport 宽高。 */
  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return undefined;

    /** 读取工作区当前可视尺寸，并写入本地 state。 */
    const updateViewportSize = () => {
      setViewportSize({
        width: viewportElement.clientWidth,
        height: viewportElement.clientHeight,
      });
    };

    updateViewportSize();

    /** 当工作区本身尺寸变化时，重新读取可视区域大小。 */
    const observer = new ResizeObserver(() => {
      updateViewportSize();
    });

    observer.observe(viewportElement);
    return () => {
      observer.disconnect();
    };
  }, []);

  if (!hasDocument) return null;

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        ref={viewportRef}
        className="workspace-viewport flex-1 overflow-auto bg-[#f0f0f0]"
      >
        {/* 滚动区域只负责提供布局空间与 padding，不直接承载 Fabric 实例。 */}
        <div
          style={getWorkspaceScrollAreaStyle(
            zoomedWidth,
            zoomedHeight,
            zoom,
            viewportSize.width,
            viewportSize.height,
          )}
        >
          {/* 画布槽位根据当前 padding 绝对定位，保证画布始终处于工作区几何中心。 */}
          <div
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
              className="relative overflow-visible shadow-xl"
              style={{
                ...containerStyle,
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              {/* 四条边各自挂一个拖拽手柄，用于交互式调整文档尺寸。 */}
              <WorkspaceResizeHandle
                edge="top"
                zoom={zoom}
                previewCanvasRef={commitPreviewCanvasRef}
                viewportRef={viewportRef}
                frameRef={frameRef}
                onPreviewSizeChange={(nextWidth, nextHeight) => {
                  setResizePreview({ width: nextWidth, height: nextHeight });
                }}
                onPreviewOffsetChange={(offsetX, offsetY) => {
                  setPreviewOffset({ x: offsetX, y: offsetY });
                }}
                onCommitPreviewChange={(active) => {
                  setIsCommitPreviewVisible(active);
                }}
                onPreviewEnd={() => {
                  setIsCommitPreviewVisible(false);
                  setResizePreview(null);
                  setPreviewOffset({ x: 0, y: 0 });
                }}
              />
              <WorkspaceResizeHandle
                edge="right"
                zoom={zoom}
                previewCanvasRef={commitPreviewCanvasRef}
                viewportRef={viewportRef}
                frameRef={frameRef}
                onPreviewSizeChange={(nextWidth, nextHeight) => {
                  setResizePreview({ width: nextWidth, height: nextHeight });
                }}
                onPreviewOffsetChange={(offsetX, offsetY) => {
                  setPreviewOffset({ x: offsetX, y: offsetY });
                }}
                onCommitPreviewChange={(active) => {
                  setIsCommitPreviewVisible(active);
                }}
                onPreviewEnd={() => {
                  setIsCommitPreviewVisible(false);
                  setResizePreview(null);
                  setPreviewOffset({ x: 0, y: 0 });
                }}
              />
              <WorkspaceResizeHandle
                edge="bottom"
                zoom={zoom}
                previewCanvasRef={commitPreviewCanvasRef}
                viewportRef={viewportRef}
                frameRef={frameRef}
                onPreviewSizeChange={(nextWidth, nextHeight) => {
                  setResizePreview({ width: nextWidth, height: nextHeight });
                }}
                onPreviewOffsetChange={(offsetX, offsetY) => {
                  setPreviewOffset({ x: offsetX, y: offsetY });
                }}
                onCommitPreviewChange={(active) => {
                  setIsCommitPreviewVisible(active);
                }}
                onPreviewEnd={() => {
                  setIsCommitPreviewVisible(false);
                  setResizePreview(null);
                  setPreviewOffset({ x: 0, y: 0 });
                }}
              />
              <WorkspaceResizeHandle
                edge="left"
                zoom={zoom}
                previewCanvasRef={commitPreviewCanvasRef}
                viewportRef={viewportRef}
                frameRef={frameRef}
                onPreviewSizeChange={(nextWidth, nextHeight) => {
                  setResizePreview({ width: nextWidth, height: nextHeight });
                }}
                onPreviewOffsetChange={(offsetX, offsetY) => {
                  setPreviewOffset({ x: offsetX, y: offsetY });
                }}
                onCommitPreviewChange={(active) => {
                  setIsCommitPreviewVisible(active);
                }}
                onPreviewEnd={() => {
                  setIsCommitPreviewVisible(false);
                  setResizePreview(null);
                  setPreviewOffset({ x: 0, y: 0 });
                }}
              />
              <div
                className="absolute inset-0 overflow-visible"
                style={{
                  // 为什么预览偏移作用在 canvas 包裹层：
                  // 这样能让真实 Fabric buffer 保持稳定，只在视觉层做位移预览，减少重建成本。
                  transform: `translate(${previewOffset.x}px, ${previewOffset.y}px)`,
                  willChange:
                    previewOffset.x !== 0 || previewOffset.y !== 0
                      ? 'transform'
                      : undefined,
                }}
              >
                <canvas ref={canvasRef} className="absolute left-0 top-0" />
              </div>
              <canvas
                ref={commitPreviewCanvasRef}
                className={`pointer-events-none absolute left-0 top-0 ${
                  isCommitPreviewVisible ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 工作区缩放控件固定在右下角，独立于 Fabric 渲染树。 */}
      <ZoomControls />
    </main>
  );
};
