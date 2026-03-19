import { useEffect, useMemo, useRef, useState } from 'react';

import { useEditorStore } from '../../../../store/useEditorStore';
import { ZoomControls } from './ZoomControls';
import {
  applyWorkspaceEditorCommand,
  bindWorkspaceSelectionClear,
  bindWorkspaceWheelZoom,
  fitWorkspaceToViewport,
  initializeWorkspaceEngine,
  syncWorkspaceBackground,
  syncWorkspaceCanvasSize,
  syncWorkspaceZoom,
} from './handlers';
import { WorkspaceResizeHandle } from './ResizeHandle';
import {
  getWorkspaceCanvasSlotStyle,
  getWorkspaceContainerStyle,
  getWorkspaceScrollAreaStyle,
} from './shared';

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [resizePreview, setResizePreview] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });

  const displayWidth = resizePreview?.width ?? width;
  const displayHeight = resizePreview?.height ?? height;
  const zoomedWidth = displayWidth * zoom;
  const zoomedHeight = displayHeight * zoom;

  const containerStyle = useMemo(
    () => getWorkspaceContainerStyle(zoomedWidth, zoomedHeight, background),
    [zoomedWidth, zoomedHeight, background],
  );

  useEffect(() => initializeWorkspaceEngine(canvasRef.current), []);

  useEffect(() => {
    applyWorkspaceEditorCommand(editorCommand);
  }, [editorCommand, editorCommandId]);

  useEffect(() => {
    syncWorkspaceCanvasSize(width, height);
  }, [width, height]);

  useEffect(() => {
    syncWorkspaceBackground(width, height);
  }, [background, width, height]);

  useEffect(() => {
    syncWorkspaceZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    fitWorkspaceToViewport(viewportRef.current);
  }, []);

  useEffect(() => {
    if (fitRequest === 0) return;
    fitWorkspaceToViewport(viewportRef.current);
  }, [fitRequest]);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return undefined;
    return bindWorkspaceSelectionClear(viewportElement);
  }, []);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return undefined;
    return bindWorkspaceWheelZoom(viewportElement);
  }, []);

  if (!hasDocument) return null;

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        ref={viewportRef}
        className="flex-1 overflow-auto bg-[#f0f0f0]"
      >
        <div style={getWorkspaceScrollAreaStyle(zoomedWidth, zoomedHeight)}>
          <div style={getWorkspaceCanvasSlotStyle(zoomedWidth, zoomedHeight)}>
            <div
              ref={frameRef}
              className="relative shadow-xl"
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
                viewportRef={viewportRef}
                frameRef={frameRef}
                onPreviewSizeChange={(nextWidth, nextHeight) => {
                  setResizePreview({ width: nextWidth, height: nextHeight });
                }}
                onPreviewOffsetChange={(offsetX, offsetY) => {
                  setPreviewOffset({ x: offsetX, y: offsetY });
                }}
                onPreviewEnd={() => {
                  setResizePreview(null);
                  setPreviewOffset({ x: 0, y: 0 });
                }}
              />
              <WorkspaceResizeHandle
                edge="right"
                zoom={zoom}
                viewportRef={viewportRef}
                frameRef={frameRef}
                onPreviewSizeChange={(nextWidth, nextHeight) => {
                  setResizePreview({ width: nextWidth, height: nextHeight });
                }}
                onPreviewOffsetChange={(offsetX, offsetY) => {
                  setPreviewOffset({ x: offsetX, y: offsetY });
                }}
                onPreviewEnd={() => {
                  setResizePreview(null);
                  setPreviewOffset({ x: 0, y: 0 });
                }}
              />
              <WorkspaceResizeHandle
                edge="bottom"
                zoom={zoom}
                viewportRef={viewportRef}
                frameRef={frameRef}
                onPreviewSizeChange={(nextWidth, nextHeight) => {
                  setResizePreview({ width: nextWidth, height: nextHeight });
                }}
                onPreviewOffsetChange={(offsetX, offsetY) => {
                  setPreviewOffset({ x: offsetX, y: offsetY });
                }}
                onPreviewEnd={() => {
                  setResizePreview(null);
                  setPreviewOffset({ x: 0, y: 0 });
                }}
              />
              <WorkspaceResizeHandle
                edge="left"
                zoom={zoom}
                viewportRef={viewportRef}
                frameRef={frameRef}
                onPreviewSizeChange={(nextWidth, nextHeight) => {
                  setResizePreview({ width: nextWidth, height: nextHeight });
                }}
                onPreviewOffsetChange={(offsetX, offsetY) => {
                  setPreviewOffset({ x: offsetX, y: offsetY });
                }}
                onPreviewEnd={() => {
                  setResizePreview(null);
                  setPreviewOffset({ x: 0, y: 0 });
                }}
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  transform: `translate(${previewOffset.x}px, ${previewOffset.y}px)`,
                  willChange:
                    previewOffset.x !== 0 || previewOffset.y !== 0
                      ? 'transform'
                      : undefined,
                }}
              >
                <canvas ref={canvasRef} className="absolute left-0 top-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ZoomControls />
    </main>
  );
};
