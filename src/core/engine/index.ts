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
  private workspaceViewportWidth = 0;
  private workspaceViewportHeight = 0;

  /** 判断 Engine 是否已经完成 Fabric Canvas 初始化。 */
  public isReady(): boolean {
    return this.canvas !== null;
  }

  /**
   * 初始化编辑器引擎。
   * 会重置文档尺寸、工作区缩放上下文，并创建新的 Fabric Canvas 实例。
   */
  public init(canvasEl: HTMLCanvasElement, width: number, height: number): void {
    if (this.canvas) this.dispose();

    this.docWidth = width;
    this.docHeight = height;
    this.displayZoom = 1;
    this.workspaceViewportWidth = 0;
    this.workspaceViewportHeight = 0;
    this.canvas = createEditorCanvas(canvasEl, width, height);

    setupGlobalUI();
    this.bindEvents();
  }

  /** 释放引擎内部的异步任务、背景请求与 Fabric 实例。 */
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

  /** 向当前画布新增图片图层，并返回标准化后的尺寸测量结果。 */
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

  /** 把来自 Store 的图层属性补丁应用到指定 Fabric 对象。 */
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

  /** 整体平移当前画布上的全部对象，常用于左/上边缩放画布后的补偿。 */
  public translateAllLayers(offsetX: number, offsetY: number): void {
    if (!this.canvas) return;
    if (offsetX === 0 && offsetY === 0) return;

    this.translateAllLayersInternal(offsetX, offsetY);
    this.canvas.requestRenderAll();
  }

  /** 同时更新画布尺寸并平移全部图层，保证文档尺寸变化后视觉位置符合预期。 */
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

  /** 引擎内部的对象平移实现，供多个公开方法复用。 */
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

  /** 根据图层 id 在 Fabric 中设置选中对象。 */
  public selectLayer(layerId: string): void {
    if (!this.canvas) return;

    const target = findObjectById(this.canvas, layerId);
    if (target) this.canvas.setActiveObject(target);
    else this.canvas.discardActiveObject();

    this.canvas.requestRenderAll();
  }

  /** 清空当前 Fabric 选中态。 */
  public clearSelection(): void {
    if (!this.canvas) return;
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  /**
   * 导出当前场景为栅格图 DataURL。
   * 导出时会临时把 viewport 归一为文档坐标系，避免把工作区缓冲层一并导出出去。
   */
  public exportSceneDataUrl(
    format: "png" | "jpeg",
    quality = 1,
    multiplier = 1,
  ): string | undefined {
    return this.withExportScene((canvas) => {
      const exportCanvas = document.createElement("canvas");
      const exportWidth = Math.max(Math.round(this.docWidth * multiplier), 1);
      const exportHeight = Math.max(Math.round(this.docHeight * multiplier), 1);

      exportCanvas.width = exportWidth;
      exportCanvas.height = exportHeight;

      const context = exportCanvas.getContext("2d");
      if (!context) return undefined;

      const originalWidth = canvas.width;
      const originalHeight = canvas.height;
      const originalViewportTransform = [
        ...canvas.viewportTransform,
      ] as typeof canvas.viewportTransform;

      try {
        canvas.width = exportWidth;
        canvas.height = exportHeight;
        canvas.viewportTransform = [
          multiplier,
          0,
          0,
          multiplier,
          0,
          0,
        ];
        canvas.calcViewportBoundaries();
        canvas.renderCanvas(context, canvas.getObjects());
      } finally {
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        canvas.viewportTransform = originalViewportTransform;
        canvas.calcViewportBoundaries();
      }

      return exportCanvas.toDataURL(`image/${format}`, quality);
    });
  }

  /** 导出当前场景为 SVG 字符串，尺寸以文档真实宽高为准。 */
  public exportSceneSvg(): string | undefined {
    return this.withExportScene((canvas) =>
      canvas.toSVG({
        width: `${Math.max(Math.round(this.docWidth), 1)}`,
        height: `${Math.max(Math.round(this.docHeight), 1)}`,
      }),
    );
  }

  /** 注册一次性的下一帧渲染回调，供尺寸提交预览等场景等待真实画面完成。 */
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

  /**
   * 绘制“尺寸提交完成后”的最终预览画面到独立 overlay canvas。
   * 这样可以在真实 Fabric buffer 重建前先让用户看到稳定结果。
   */
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
      // 为什么直接改 canvas 本体的 viewport/width/height：
      // 这里要复用当前 Fabric 场景绘制到外部 context，临时切换是成本最低的方案。
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

  /** 判断某个事件目标是否仍然位于当前 Fabric wrapper 内。 */
  public isTargetInsideCanvas(target: EventTarget | null): boolean {
    const wrapperEl = this.canvas?.wrapperEl as HTMLElement | undefined;
    return !!wrapperEl && wrapperEl.contains(target as Node);
  }

  /** 向当前画布新增文本图层，并返回标准化后的初始摆放结果。 */
  public addTextLayer(layer: TextLayer): LayerMeasurement | undefined {
    if (!this.canvas) return undefined;
    return addTextLayerToCanvas(
      this.canvas,
      layer,
      this.docWidth,
      this.docHeight,
    );
  }

  /**
   * 加载完整文档到 Engine。
   * 当前实现先以第一页为准恢复背景和图层栈。
   */
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

  /** 更新文档真实尺寸，并同步刷新 Fabric 画布显示区域。 */
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

  /** 设置当前页面背景，并处理背景资源加载与取消。 */
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

  /** 记录当前工作区 viewport 尺寸，供缓冲层和 viewportTransform 计算使用。 */
  public setWorkspaceViewportSize(width: number, height: number): void {
    this.workspaceViewportWidth = Math.max(Math.round(width), 0);
    this.workspaceViewportHeight = Math.max(Math.round(height), 0);
    this.applyCanvasSize();
  }

  /** 绑定 Fabric 事件到 Engine 内部同步逻辑。 */
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

  /** 把高频交互对象加入节流同步流程。 */
  private queueLiveTransform = (target: FabricLayerTarget): void => {
    syncLiveTransform({
      target,
      syncTransformRaf: this.syncTransformRaf,
      setSyncTransformRaf: this.setSyncTransformRaf,
    });
  };

  /** 提交对象的最终几何状态到 Store。 */
  private commitLayerTransform = (target: FabricLayerTarget): void => {
    syncLayerTransform(target);
  };

  /** 将图片图层的 scaleX/scaleY 转换为实际 width/height，确保导出 JSON 中 scale 始终为 1 */
  private finalizeImageScaling = async (img: FabricImageLayer): Promise<void> => {
    await finalizeImageScale(img);
    this.canvas?.requestRenderAll();
  };

  /** 更新节流同步使用的 rAF id，方便下次变换时判断是否已有待执行任务。 */
  private setSyncTransformRaf = (value: number | null): void => {
    this.syncTransformRaf = value;
  };

  /** 把当前文档尺寸、zoom 与 viewport 尺寸统一应用到 Fabric Canvas。 */
  private applyCanvasSize(shouldRender = true): void {
    if (!this.canvas) return;
    applyCanvasSize({
      canvas: this.canvas,
      docWidth: this.docWidth,
      docHeight: this.docHeight,
      displayZoom: this.displayZoom,
      viewportWidth: this.workspaceViewportWidth,
      viewportHeight: this.workspaceViewportHeight,
      shouldRender,
    });
  }

  /**
   * 在“导出模式”下临时执行一段回调。
   * 回调期间 Fabric 会被切到文档原始坐标系，结束后再完整恢复现场。
   */
  private withExportScene<T>(callback: (canvas: Canvas) => T): T | undefined {
    const canvas = this.canvas;
    if (!canvas) return undefined;

    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    const originalViewportTransform = [
      ...canvas.viewportTransform,
    ] as typeof canvas.viewportTransform;
    const originalSkipControlsDrawing = (canvas as Canvas & {
      skipControlsDrawing: boolean;
    }).skipControlsDrawing;
    const originalActiveObject = canvas.getActiveObject();

    try {
      canvas.discardActiveObject();
      // 为什么导出时强制 viewport = identity：
      // 工作区缩放和 padding 只属于编辑态展示，导出文件必须严格以文档坐标系为准。
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      canvas.width = Math.max(Math.round(this.docWidth), 1);
      canvas.height = Math.max(Math.round(this.docHeight), 1);
      (canvas as Canvas & { skipControlsDrawing: boolean }).skipControlsDrawing =
        true;
      canvas.calcViewportBoundaries();
      return callback(canvas);
    } finally {
      canvas.viewportTransform = originalViewportTransform;
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      (canvas as Canvas & { skipControlsDrawing: boolean }).skipControlsDrawing =
        originalSkipControlsDrawing;
      canvas.calcViewportBoundaries();
      if (originalActiveObject) {
        canvas.setActiveObject(originalActiveObject);
      }
    }
  }
}

export const engineInstance = new EditorEngine();

export { fillStyleToFabric };
