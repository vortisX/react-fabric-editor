import type { Canvas } from "fabric";

import type { DesignDocument, ImageLayer, PageBackground, TextLayer } from "../../types/schema";
import { setupGlobalUI } from "../EditorUI";
import { applyBackground } from "./background";
import { createEditorCanvas, disposeEditorCanvas } from "./canvas";
import {
  bindEngineEvents,
  handleModified,
  handleResizing,
  handleScaling,
  handleSelectionChanged,
  handleTextChanged,
  syncLayerTransform,
  syncLiveTransform,
} from "./events";
import { fillStyleToFabric } from "./fill";
import {
  addImageLayerToCanvas,
  addTextLayerToCanvas,
  finalizeImageScale,
  loadLayerStackToCanvas,
} from "./layers";
import { findObjectById, readImageLayer } from "./queries";
import { updateFabricLayerProps } from "./update";
import type { FabricImageLayer, FabricLayerTarget, LayerMeasurement } from "./types";
import { applyCanvasSize } from "./viewport";

export class EditorEngine {
  private canvas: Canvas | null = null;
  private backgroundAbort: AbortController | null = null;
  private syncTransformRaf: number | null = null;
  /** 文档原始尺寸（不含 zoom） */
  private docWidth = 0;
  private docHeight = 0;
  /** 当前显示缩放比例，由 setDisplayZoom 维护 */
  private displayZoom = 1;

  public isReady(): boolean {
    return this.canvas !== null;
  }

  public init(canvasEl: HTMLCanvasElement, width: number, height: number): void {
    if (this.canvas) this.dispose();

    this.docWidth = width;
    this.docHeight = height;
    this.displayZoom = 1;
    this.canvas = createEditorCanvas(canvasEl, width, height);

    setupGlobalUI();
    this.bindEvents();
  }

  public dispose(): void {
    if (this.syncTransformRaf !== null) {
      cancelAnimationFrame(this.syncTransformRaf);
      this.syncTransformRaf = null;
    }

    this.backgroundAbort?.abort();
    this.backgroundAbort = null;

    if (!this.canvas) return;
    disposeEditorCanvas(this.canvas);
    this.canvas = null;
  }

  public async addImageLayer(
    layer: ImageLayer,
  ): Promise<LayerMeasurement | undefined> {
    if (!this.canvas) return undefined;

    return addImageLayerToCanvas({
      canvas: this.canvas,
      layer,
      docWidth: this.docWidth,
      docHeight: this.docHeight,
      displayZoom: this.displayZoom,
    });
  }

  public updateLayerProps(layerId: string, props: Record<string, unknown>): void {
    if (!this.canvas) return;

    const target = findObjectById(this.canvas, layerId);
    if (!target) return;

    updateFabricLayerProps({
      canvas: this.canvas,
      target,
      props,
      readStoreLayer: () => readImageLayer(layerId),
    });
  }

  public translateAllLayers(offsetX: number, offsetY: number): void {
    if (!this.canvas) return;
    if (offsetX === 0 && offsetY === 0) return;

    this.translateAllLayersInternal(offsetX, offsetY);
    this.canvas.requestRenderAll();
  }

  public resizeCanvasAndTranslateLayers(
    width: number,
    height: number,
    offsetX: number,
    offsetY: number,
  ): void {
    if (!this.canvas) return;

    this.docWidth = width;
    this.docHeight = height;
    this.applyCanvasSize(false);
    this.translateAllLayersInternal(offsetX, offsetY);
    this.canvas.requestRenderAll();
  }

  private translateAllLayersInternal(offsetX: number, offsetY: number): void {
    if (!this.canvas) return;
    if (offsetX === 0 && offsetY === 0) return;

    for (const object of this.canvas.getObjects()) {
      object.set({
        left: (object.left ?? 0) + offsetX,
        top: (object.top ?? 0) + offsetY,
      });
      object.setCoords();
    }
  }

  public selectLayer(layerId: string): void {
    if (!this.canvas) return;

    const target = findObjectById(this.canvas, layerId);
    if (target) this.canvas.setActiveObject(target);
    else this.canvas.discardActiveObject();

    this.canvas.requestRenderAll();
  }

  public clearSelection(): void {
    if (!this.canvas) return;
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  public onNextRender(callback: () => void): void {
    const canvas = this.canvas;
    if (!canvas) {
      callback();
      return;
    }

    const handleAfterRender = (): void => {
      canvas.off("after:render", handleAfterRender);
      callback();
    };

    canvas.on("after:render", handleAfterRender);
  }

  public drawResizeCommitPreview(
    previewCanvasEl: HTMLCanvasElement,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number,
  ): boolean {
    const canvas = this.canvas;
    if (!canvas) return false;

    const context = previewCanvasEl.getContext("2d");
    if (!context) return false;

    const displayWidth = Math.max(Math.round(width * this.displayZoom), 1);
    const displayHeight = Math.max(Math.round(height * this.displayZoom), 1);
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    const originalViewportTransform = [...canvas.viewportTransform] as typeof canvas.viewportTransform;
    const originalSkipControlsDrawing = (canvas as Canvas & {
      skipControlsDrawing: boolean;
    }).skipControlsDrawing;
    const previewViewportTransform = [
      this.displayZoom,
      originalViewportTransform[1],
      originalViewportTransform[2],
      this.displayZoom,
      originalViewportTransform[4] + offsetX * this.displayZoom,
      originalViewportTransform[5] + offsetY * this.displayZoom,
    ] as typeof canvas.viewportTransform;

    previewCanvasEl.width = displayWidth;
    previewCanvasEl.height = displayHeight;
    previewCanvasEl.style.width = `${displayWidth}px`;
    previewCanvasEl.style.height = `${displayHeight}px`;

    try {
      canvas.viewportTransform = previewViewportTransform;
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      (canvas as Canvas & { skipControlsDrawing: boolean }).skipControlsDrawing = true;
      canvas.calcViewportBoundaries();
      canvas.renderCanvas(context, canvas.getObjects());
      return true;
    } finally {
      canvas.viewportTransform = originalViewportTransform;
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      (canvas as Canvas & { skipControlsDrawing: boolean }).skipControlsDrawing =
        originalSkipControlsDrawing;
      canvas.calcViewportBoundaries();
    }
  }

  public isTargetInsideCanvas(target: EventTarget | null): boolean {
    const wrapperEl = this.canvas?.wrapperEl as HTMLElement | undefined;
    return !!wrapperEl && wrapperEl.contains(target as Node);
  }

  public addTextLayer(layer: TextLayer): LayerMeasurement | undefined {
    if (!this.canvas) return undefined;
    return addTextLayerToCanvas(this.canvas, layer, this.docWidth);
  }

  public loadDocument(doc: DesignDocument): void {
    if (!this.canvas) return;

    this.canvas.clear();
    this.resizeCanvas(doc.global.width, doc.global.height);

    const page = doc.pages[0];
    if (page?.background) {
      this.setBackground(page.background, doc.global.width, doc.global.height);
    }

    if (page?.layers.length) {
      void loadLayerStackToCanvas(this.canvas, page.layers);
      return;
    }

    this.canvas.requestRenderAll();
  }

  public resizeCanvas(width: number, height: number): void {
    if (!this.canvas) return;
    this.docWidth = width;
    this.docHeight = height;
    this.applyCanvasSize();
  }

  /**
   * 设置画布的显示缩放比例。
   * 通过 Fabric 原生 setZoom + setDimensions 实现，确保 canvas buffer 以实际显示分辨率渲染，
   * 避免 CSS transform: scale 导致的字体模糊问题。
   */
  public setDisplayZoom(zoom: number): void {
    if (!this.canvas) return;
    this.displayZoom = zoom;
    this.applyCanvasSize();
  }

  public setBackground(
    background: PageBackground,
    width: number,
    height: number,
  ): void {
    if (!this.canvas) return;

    applyBackground({
      canvas: this.canvas,
      background,
      width,
      height,
      currentAbort: this.backgroundAbort,
      setAbort: (controller) => {
        this.backgroundAbort = controller;
      },
    });
  }

  private bindEvents(): void {
    if (!this.canvas) return;

    bindEngineEvents({
      canvas: this.canvas,
      onSelectionChanged: handleSelectionChanged,
      onScaling: (event) =>
        handleScaling({
          canvas: this.canvas,
          event,
          queueLiveTransform: this.queueLiveTransform,
        }),
      onResizing: (target) =>
        handleResizing(target, this.queueLiveTransform),
      onModified: (event) =>
        handleModified({
          event,
          finalizeImageScaling: this.finalizeImageScaling,
          syncLayerTransform: this.commitLayerTransform,
        }),
      onTextChanged: handleTextChanged,
    });
  }

  private queueLiveTransform = (target: FabricLayerTarget): void => {
    syncLiveTransform({
      target,
      syncTransformRaf: this.syncTransformRaf,
      setSyncTransformRaf: this.setSyncTransformRaf,
    });
  };

  private commitLayerTransform = (target: FabricLayerTarget): void => {
    syncLayerTransform(target);
  };

  /** 将图片图层的 scaleX/scaleY 转换为实际 width/height，确保导出 JSON 中 scale 始终为 1 */
  private finalizeImageScaling = async (img: FabricImageLayer): Promise<void> => {
    await finalizeImageScale(img);
    this.canvas?.requestRenderAll();
  };

  private setSyncTransformRaf = (value: number | null): void => {
    this.syncTransformRaf = value;
  };

  private applyCanvasSize(shouldRender = true): void {
    if (!this.canvas) return;
    applyCanvasSize({
      canvas: this.canvas,
      docWidth: this.docWidth,
      docHeight: this.docHeight,
      displayZoom: this.displayZoom,
      shouldRender,
    });
  }
}

export const engineInstance = new EditorEngine();

export { fillStyleToFabric };
