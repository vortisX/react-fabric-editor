import { Canvas, FabricObject, Textbox, Gradient, FabricImage, Pattern, Rect, filters } from "fabric";
import { i18n } from '../locales';
import type { DesignDocument, TextLayer, ImageLayer, BaseLayer, FillStyle, PageBackground } from "../types/schema";
import { useEditorStore } from "../store/useEditorStore";
import { setupGlobalUI } from "./EditorUI";
import { CustomTextbox } from "./CustomTextbox";
import { CURSORS } from "./constants";

/** FabricImage 对象附加 id 字段，用于与 Store 中的图层 ID 对应 */
type FabricImageLayer = FabricImage & { id: string };

/**
 * 将 Schema 的 FillStyle 转换为 Fabric.js 可用的 fill 值。
 * - SolidFill / 纯色字符串 → 返回颜色字符串
 * - GradientFill → 返回 Fabric Gradient 实例
 */
export function fillStyleToFabric(
  fill: string | FillStyle,
  width: number,
  height: number
): string | InstanceType<typeof Gradient<"linear">> {
  if (typeof fill === "string") return fill;
  if (fill.type === "solid") return fill.color;

  const isHorizontal = fill.direction === "horizontal";
  return new Gradient({
    type: "linear",
    coords: {
      x1: 0,
      y1: 0,
      x2: isHorizontal ? width : 0,
      y2: isHorizontal ? 0 : height,
    },
    colorStops: fill.colorStops.map((s) => ({
      offset: s.offset,
      color: s.color,
    })),
  });
}

const LAYOUT_KEYS = [
  "text",
  "width",
  "height",
  "textAlign",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "charSpacing",
  "fontStyle",
] as const;

type FabricSelectionEvent = { selected?: FabricObject[] };
type FabricObjectEvent = { target: FabricObject };
type FabricScalingEvent = {
  target: FabricObject;
  transform?: { corner?: string; action?: string };
};
type FabricModifiedEvent = {
  target: FabricObject;
  transform?: { corner?: string };
};

export class EditorEngine {
  public canvas: Canvas | null = null;
  private backgroundAbort: AbortController | null = null;
  private syncTransformRaf: number | null = null;
  /** 文档原始尺寸（不含 zoom） */
  private docWidth = 0;
  private docHeight = 0;
  /** 当前显示缩放比例，由 setDisplayZoom 维护 */
  private displayZoom = 1;

  // ==================== 生命周期 ====================

  public init(canvasEl: HTMLCanvasElement, width: number, height: number) {
    if (this.canvas) this.dispose();

    this.docWidth = width;
    this.docHeight = height;
    this.displayZoom = 1;

    this.canvas = new Canvas(canvasEl, {
      width,
      height,
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: "#ffffff",
      defaultCursor: CURSORS.default,
      hoverCursor: CURSORS.move,
      moveCursor: CURSORS.move,
    });

    setupGlobalUI();
    this.bindEvents();
  }

  public dispose() {
    if (this.syncTransformRaf !== null) {
      cancelAnimationFrame(this.syncTransformRaf);
      this.syncTransformRaf = null;
    }
    if (!this.canvas) return;
    this.canvas.off();
    this.canvas.dispose();
    this.canvas = null;
  }

  // ==================== 事件绑定 ====================

  private bindEvents() {
    // !的意思时断言canvas不为空
    const c = this.canvas!;
    // 绑定 Fabric.js 事件
    //created 事件：当用户创建新对象（如文本框）时触发
    c.on("selection:created", (e: FabricSelectionEvent) =>
      this.onSelectionChanged(e.selected?.[0])
    );
    // updated 事件：当用户更新选中对象（如改变文本内容）时触发
    c.on("selection:updated", (e: FabricSelectionEvent) =>
      this.onSelectionChanged(e.selected?.[0])
    );
    // cleared 事件：当用户清除选中对象（如点击空白区域）时触发
    c.on("selection:cleared", () => this.onSelectionChanged(undefined));
    // scaling 事件：当用户缩放选中对象（如拖动缩放框）时触发
    c.on("object:scaling", (e: FabricScalingEvent) => this.onScaling(e));
    // resizing 事件：当用户调整选中对象的大小（如拖动调整框）时触发
    c.on("object:resizing", (e: FabricObjectEvent) => this.onResizing(e.target));
    // moving 事件：当用户拖动选中对象（如移动文本框）时触发
    c.on("object:moving", (e: FabricObjectEvent) =>
      this.syncLiveTransform(e.target as FabricObject & { id?: string })
    );
    // rotating 事件：当用户旋转选中对象（如拖动旋转框）时触发
    c.on("object:rotating", (e: FabricObjectEvent) =>
      this.syncLiveTransform(e.target as FabricObject & { id?: string })
    );
    // modified 事件：当用户修改选中对象（如改变旋转角度）时触发
    c.on("object:modified", (e: FabricModifiedEvent) => this.onModified(e));
    // text:changed 事件：当用户改变文本内容时触发
    c.on("text:changed", (e: FabricObjectEvent) =>
      this.onTextChanged(e.target)
    );
  }

  private onSelectionChanged(target?: FabricObject) {
    const id = target ? (target as CustomTextbox).id : null;
    useEditorStore.getState().setActiveLayer(id ?? null);
  }

  private onScaling(e: FabricScalingEvent) {
    const target = e.target;
    if (!(target instanceof CustomTextbox)) {
      this.syncLiveTransform(target as CustomTextbox);
      return;
    }

    target.constrainScaling();

    const corner = e.transform?.corner ?? "";
    const scaleX = target.scaleX ?? 1;
    const scaleY = target.scaleY ?? 1;
    const isSideResize =
      corner === "ml" ||
      corner === "mr" ||
      e.transform?.action === "scaleX" ||
      (Math.abs(scaleX - 1) > 1e-3 && Math.abs(scaleY - 1) < 1e-3);
    if (isSideResize) {
      const center = target.getCenterPoint();
      const newWidth = Math.max((target.width ?? 0) * scaleX, 1);
      target.set({ width: newWidth, scaleX: 1 });
      target.setPositionByOrigin(center, "center", "center");
      target.initDimensions();
      target.autoFitHeight();
      this.canvas?.requestRenderAll();
    }

    this.syncLiveTransform(target);
  }

  private onResizing(target: FabricObject) {
    this.syncLiveTransform(target as FabricObject & { id?: string });
  }

  private onModified(e: FabricModifiedEvent) {
    const target = e.target;
    const targetWithId = target as CustomTextbox;
    if (!targetWithId?.id) return;

    if (target instanceof CustomTextbox) {
      const corner = e.transform?.corner ?? "";
      target.finalizeScaling(corner);
      if (corner === "ml" || corner === "mr") {
        target.initDimensions();
        target.autoFitHeight();
      }
    } else if (target instanceof FabricImage) {
      // 图片图层：将 scaleX/scaleY 转换为实际宽高，保持归一化
      this.finalizeImageScaling(target as FabricImageLayer);
    }

    this.syncLayerTransform(targetWithId);
  }

  /** 将图片图层的 scaleX/scaleY 转换为实际 width/height，确保导出 JSON 中 scale 始终为 1 */
  private finalizeImageScaling(img: FabricImageLayer) {
    const scaleX = img.scaleX ?? 1;
    const scaleY = img.scaleY ?? 1;
    if (Math.abs(scaleX - 1) < 1e-4 && Math.abs(scaleY - 1) < 1e-4) return;

    const newW = Math.max((img.width ?? 0) * scaleX, 1);
    const newH = Math.max((img.height ?? 0) * scaleY, 1);
    img.set({ width: newW, height: newH, scaleX: 1, scaleY: 1 });

    // 同步更新 clipPath 尺寸（圆角遮罩）
    if (img.clipPath instanceof Rect) {
      img.clipPath.set({ width: newW, height: newH });
    }
    img.setCoords();
  }

  private onTextChanged(target: FabricObject) {
    const tb = target as CustomTextbox;
    if (!tb.id || tb.text === undefined) return;

    const pageId = this.getCurrentPageId();
    if (!pageId) return;

    tb.autoFitHeight();

    const text = tb.text || "";
    const trimmed = text.trim() || i18n.t('rightPanel.emptyText');
    const name = trimmed.length > 15 ? trimmed.slice(0, 15) + "..." : trimmed;

    useEditorStore.getState().updateLayer(tb.id, {
      content: text,
      name,
      width: tb.width ?? 0,
      height: tb.height ?? 0,
    });
  }

  private static round1(n: number) {
    return Math.round(n * 10) / 10;
  }

  /** 拖动/旋转/缩放过程中实时同步视觉属性到 Store（不做 scale 转换） */
  private syncLiveTransform(target: FabricObject & { id?: string }) {
    if (this.syncTransformRaf !== null) return;

    this.syncTransformRaf = requestAnimationFrame(() => {
      this.syncTransformRaf = null;
      if (!target?.id) return;
      const pageId = this.getCurrentPageId();
      if (!pageId) return;

      const r = EditorEngine.round1;
      const scaleX = target.scaleX ?? 1;
      const scaleY = target.scaleY ?? 1;
      const updates: Partial<BaseLayer> = {
        x: r(target.left ?? 0),
        y: r(target.top ?? 0),
        rotation: Math.round(target.angle ?? 0),
        width: r((target.width ?? 0) * scaleX),
        height: r((target.height ?? 0) * scaleY),
      };

      // 文本图层额外同步 fontSize（缩放过程中字号会随尺寸变化）
      if (target instanceof Textbox) {
        const isCornerScaling = scaleX !== 1 || scaleY !== 1;
        if (isCornerScaling) {
          const scale = (scaleX + scaleY) / 2;
          (updates as Partial<TextLayer>).fontSize = r(Math.max((target.fontSize ?? 12) * scale, 1));
        } else {
          (updates as Partial<TextLayer>).fontSize = r(target.fontSize ?? 12);
        }
      }

      useEditorStore.getState().updateLayer(target.id, updates as Partial<TextLayer>);
    });
  }

  /** 将画布对象的变换属性同步到 Store（操作完成时调用，推入历史栈） */
  private syncLayerTransform(target: FabricObject & { id?: string }) {
    if (!target?.id) return;
    const pageId = this.getCurrentPageId();
    if (!pageId) return;

    const r = EditorEngine.round1;
    const updates: Partial<BaseLayer> = {
      x: r(target.left ?? 0),
      y: r(target.top ?? 0),
      rotation: Math.round(target.angle ?? 0),
      width: r(target.width ?? 0),
      height: r(target.height ?? 0),
    };

    // 文本图层额外同步 fontSize
    if (target instanceof Textbox) {
      (updates as Partial<TextLayer>).fontSize = r(target.fontSize ?? 12);
    }

    useEditorStore.getState().updateLayer(target.id, updates as Partial<TextLayer>);
  }

  // ==================== 公共 API ====================

  /** 为图片图层应用 Fabric 内置滤镜（亮度、对比度、饱和度） */
  private applyImageFilters(img: FabricImage, layer: Pick<ImageLayer, 'brightness' | 'contrast' | 'saturation'>) {
    const list: filters.BaseFilter<string>[] = [];
    if (layer.brightness) list.push(new filters.Brightness({ brightness: layer.brightness }));
    if (layer.contrast)   list.push(new filters.Contrast({ contrast: layer.contrast }));
    if (layer.saturation) list.push(new filters.Saturation({ saturation: layer.saturation }));
    img.filters = list;
    img.applyFilters();
  }

  /**
   * 添加图片图层到画布，并返回居中后的实际坐标和尺寸。
   * 图片缩放到画布 80% 以内（保持宽高比），scaleX/scaleY 归一化为 1。
   */
  public async addImageLayer(
    layer: ImageLayer
  ): Promise<{ x: number; y: number; width: number; height: number } | undefined> {
    if (!this.canvas) return undefined;

    let img: FabricImage;
    try {
      img = await FabricImage.fromURL(layer.url);
    } catch {
      return undefined;
    }

    if (!this.canvas) return undefined;

    const naturalW = img.width ?? 1;
    const naturalH = img.height ?? 1;

    // 按比例缩放：确保宽高均不超过画布的 80%
    const maxW = this.docWidth * 0.8;
    const maxH = this.docHeight * 0.8;
    const scale = Math.min(1, maxW / naturalW, maxH / naturalH);
    const finalW = Math.round(naturalW * scale);
    const finalH = Math.round(naturalH * scale);

    // 直接设置实际宽高，scaleX/scaleY 保持 1
    const imgWithId = img as FabricImageLayer;
    imgWithId.id = layer.id;

    img.set({
      width: finalW,
      height: finalH,
      scaleX: 1,
      scaleY: 1,
      angle: layer.rotation ?? 0,
      opacity: layer.opacity ?? 1,
      flipX: layer.flipX ?? false,
      flipY: layer.flipY ?? false,
      stroke: layer.stroke ?? null,
      strokeWidth: layer.strokeWidth ?? 0,
      strokeDashArray: layer.strokeDashArray ?? null,
      originX: 'left',
      originY: 'top',
    });

    // 圆角遮罩：通过 Rect clipPath 实现
    const radius = layer.borderRadius ?? 0;
    if (radius > 0) {
      img.clipPath = new Rect({
        width: finalW,
        height: finalH,
        rx: radius,
        ry: radius,
        originX: 'center',
        originY: 'center',
      });
    }

    this.applyImageFilters(img, layer);

    this.canvas.add(img);
    // 必须用 viewportCenterObject：当 displayZoom != 1 时，centerObject 坐标会偏移
    this.canvas.viewportCenterObject(img);
    img.setCoords();

    this.canvas.setActiveObject(img);
    this.canvas.requestRenderAll();

    return {
      x: EditorEngine.round1(img.left ?? 0),
      y: EditorEngine.round1(img.top ?? 0),
      width: finalW,
      height: finalH,
    };
  }

  /** 图片图层属性更新：处理滤镜、圆角 clipPath、翻转等图片专属逻辑 */
  private updateImageLayerProps(img: FabricImageLayer, props: Record<string, unknown>) {
    const filterKeys = new Set(['brightness', 'contrast', 'saturation']);
    const hasFilterChange = Object.keys(props).some((k) => filterKeys.has(k));

    // 提取滤镜相关属性，其余属性直接 set
    const directProps: Record<string, unknown> = {};
    const filterOverrides: Partial<Pick<ImageLayer, 'brightness' | 'contrast' | 'saturation'>> = {};

    for (const [k, v] of Object.entries(props)) {
      if (filterKeys.has(k)) {
        (filterOverrides as Record<string, unknown>)[k] = v;
      } else if (k === 'borderRadius') {
        // 更新或新建 clipPath
        const radius = (v as number) ?? 0;
        if (radius > 0) {
          if (img.clipPath instanceof Rect) {
            img.clipPath.set({ rx: radius, ry: radius });
          } else {
            img.clipPath = new Rect({
              width: img.width ?? 100,
              height: img.height ?? 100,
              rx: radius,
              ry: radius,
              originX: 'center',
              originY: 'center',
            });
          }
        } else {
          img.clipPath = undefined;
        }
      } else {
        directProps[k] = v;
      }
    }

    if (Object.keys(directProps).length > 0) {
      img.set({ ...directProps, dirty: true });
      img.setCoords();
    }

    // 滤镜需要从 Store 读取最新完整状态后重新全量应用
    if (hasFilterChange) {
      const state = useEditorStore.getState();
      const page = state.document?.pages.find((p) => p.pageId === state.currentPageId)
        ?? state.document?.pages[0];
      const storeLayer = page?.layers.find((l) => l.id === img.id) as ImageLayer | undefined;

      const merged = {
        brightness: (filterOverrides.brightness ?? storeLayer?.brightness) as number | undefined,
        contrast: (filterOverrides.contrast ?? storeLayer?.contrast) as number | undefined,
        saturation: (filterOverrides.saturation ?? storeLayer?.saturation) as number | undefined,
      };
      this.applyImageFilters(img, merged);
    }
  }

  public updateLayerProps(layerId: string, props: Record<string, unknown>) {
    if (!this.canvas) return;
    const target = this.findObjectById(layerId);
    if (!target) return;

    // 图片图层：特殊属性单独处理
    if (target instanceof FabricImage) {
      this.updateImageLayerProps(target as FabricImageLayer, props);
      this.canvas.requestRenderAll();
      return;
    }

    const finalProps: Record<string, unknown> = { ...props, dirty: true };

    // fill 属性需要将 FillStyle 转换为 Fabric Gradient
    if (finalProps.fill !== undefined) {
      const w = (target as CustomTextbox).width ?? 100;
      const h = (target as CustomTextbox).height ?? 100;
      finalProps.fill = fillStyleToFabric(
        finalProps.fill as string | FillStyle,
        w,
        h
      );
    }
    if (props.height !== undefined) {
      finalProps._manualHeight = props.height;
    }

    target.set(finalProps);

    if (
      LAYOUT_KEYS.some((k) => props[k] !== undefined) &&
      target instanceof Textbox
    ) {
      target.initDimensions();
      if (target instanceof CustomTextbox && props.height === undefined) {
        target.autoFitHeight();
      }
      requestAnimationFrame(() => {
        const id = (target as CustomTextbox).id;
        if (id) {
          useEditorStore.getState().updateLayer(id, {
            width: target.width ?? 0,
            height: target.height ?? 0,
          });
        }
      });
    }

    this.canvas.requestRenderAll();
  }

  public selectLayer(layerId: string) {
    if (!this.canvas) return;
    const target = this.findObjectById(layerId);
    if (target) this.canvas.setActiveObject(target);
    else this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  public addTextLayer(
    layer: TextLayer
  ): { x: number; y: number; width: number; height: number } | undefined {
    if (!this.canvas) return;

    // 必须使用文档原始宽度（不含 displayZoom），因为 Fabric 对象坐标始终在文档空间，
    // canvas.getWidth() 返回的是 docWidth * displayZoom，会污染文本宽度计算
    const maxTextW = this.docWidth * 0.9;

    // 先用足够大的宽度创建，让文字排成一行以便测量
    const node = CustomTextbox.fromLayer({ ...layer, width: maxTextW });
    node.initDimensions();

    // 测量文字自然宽度（一行所需的宽度）
    const naturalW = node.calcTextWidth();
    // 宽度：优先一行显示，超出画布 90% 则限制换行
    const finalW = Math.min(naturalW + 2, maxTextW);

    node.set({ width: finalW });
    node._manualHeight = undefined;
    node.initDimensions();

    const fontSize = node.fontSize ?? 12;
    const lineHeight = node.lineHeight ?? 1.2;
    const finalH = Math.max(node.calcTextHeight(), fontSize * lineHeight);
    node.set({ height: finalH });
    node._manualHeight = finalH;

    // 必须用 viewportCenterObject 而非 centerObject：
    // centerObject 使用 CSS 像素坐标（docWidth * zoom / 2），zoom != 1 时会偏移；
    // viewportCenterObject 会通过逆视口变换还原为文档坐标（docWidth / 2），始终居中
    this.canvas.add(node as unknown as FabricObject);
    this.canvas.viewportCenterObject(node as unknown as FabricObject);
    node.setCoords();

    this.canvas.setActiveObject(node as unknown as FabricObject);
    this.canvas.requestRenderAll();

    return {
      x: node.left ?? 0,
      y: node.top ?? 0,
      width: finalW,
      height: finalH,
    };
  }

  public loadDocument(doc: DesignDocument) {
    if (!this.canvas) return;
    this.canvas.clear();
    this.resizeCanvas(doc.global.width, doc.global.height);
    const page = doc.pages[0];
    if (page?.background) {
      this.setBackground(page.background, doc.global.width, doc.global.height);
    }
    this.canvas.requestRenderAll();
  }

  public resizeCanvas(width: number, height: number) {
    if (!this.canvas) return;
    this.docWidth = width;
    this.docHeight = height;
    this._applyCanvasSize();
  }

  /**
   * 设置画布的显示缩放比例。
   * 通过 Fabric 原生 setZoom + setDimensions 实现，确保 canvas buffer 以实际显示分辨率渲染，
   * 避免 CSS transform: scale 导致的字体模糊问题。
   */
  public setDisplayZoom(zoom: number) {
    if (!this.canvas) return;
    this.displayZoom = zoom;
    this._applyCanvasSize();
  }

  /**
   * 内部：根据当前 docWidth/docHeight/displayZoom 计算实际 canvas 尺寸并应用。
   * 使用 Fabric setZoom + setDimensions 保证 buffer 精确对应显示像素。
   */
  private _applyCanvasSize() {
    const c = this.canvas!;
    const w = Math.round(this.docWidth * this.displayZoom);
    const h = Math.round(this.docHeight * this.displayZoom);
    // 尺寸未变则跳过，避免 setDimensions 清空 context 导致不必要的闪烁
    if (c.getWidth() === w && c.getHeight() === h) return;
    c.setZoom(this.displayZoom);
    c.setDimensions({ width: w, height: h });
    c.calcOffset();
    // 必须同步 renderAll：setDimensions 已清空 context，requestRenderAll 是异步 RAF，
    // 二者之间有一帧空白 → 文字闪烁
    c.renderAll();
  }

  public setBackground(background: PageBackground, width: number, height: number) {
    if (!this.canvas) return;
    const c = this.canvas;

    this.backgroundAbort?.abort();
    this.backgroundAbort = new AbortController();
    const { signal } = this.backgroundAbort;

    if (background.type === "color") {
      c.backgroundImage = undefined;
      c.backgroundColor = background.value;
      c.requestRenderAll();
      return;
    }

    if (background.type === "gradient") {
      c.backgroundImage = undefined;
      c.backgroundColor = fillStyleToFabric(background.value, width, height);
      c.requestRenderAll();
      return;
    }

    const fit = background.fit ?? "cover";
    const url = background.url;

    if (!url) {
      c.backgroundImage = undefined;
      c.backgroundColor = "#ffffff";
      c.requestRenderAll();
      return;
    }

    FabricImage.fromURL(url, { signal })
      .then((img) => {
        if (signal.aborted || !this.canvas) return;

        img.set({ selectable: false, evented: false });

        const iw = img.width ?? 1;
        const ih = img.height ?? 1;

        if (fit === "tile") {
          c.backgroundImage = undefined;
          c.backgroundColor = new Pattern({
            source: img.getElement(),
            repeat: "repeat",
          });
          c.requestRenderAll();
          return;
        }

        if (fit === "stretch") {
          const scaleX = width / iw;
          const scaleY = height / ih;
          img.set({ originX: "left", originY: "top", left: 0, top: 0, scaleX, scaleY });
          c.backgroundImage = img;
          c.backgroundColor = "#ffffff";
          c.requestRenderAll();
          return;
        }

        if (fit === "none") {
          img.set({
            originX: "center",
            originY: "center",
            left: width / 2,
            top: height / 2,
            scaleX: 1,
            scaleY: 1,
          });
          c.backgroundImage = img;
          c.backgroundColor = "#ffffff";
          c.requestRenderAll();
          return;
        }

        const scale = Math.max(width / iw, height / ih);
        const scaledW = iw * scale;
        const scaledH = ih * scale;
        img.set({
          originX: "left",
          originY: "top",
          left: (width - scaledW) / 2,
          top: (height - scaledH) / 2,
          scaleX: scale,
          scaleY: scale,
        });
        c.backgroundImage = img;
        c.backgroundColor = "#ffffff";
        c.requestRenderAll();
      })
      .catch(() => {});
  }

  // ==================== 内部工具 ====================

  private getCurrentPageId(): string | undefined {
    return useEditorStore.getState().currentPageId ?? undefined;
  }

  private findObjectById(id: string): FabricObject | undefined {
    return this.canvas
      ?.getObjects()
      .find((obj) => (obj as CustomTextbox).id === id);
  }
}

export const engineInstance = new EditorEngine();
