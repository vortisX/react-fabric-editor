import { Canvas, FabricObject, Textbox, Gradient, FabricImage, Pattern } from "fabric";
import { i18n } from '../locales';
import type { DesignDocument, TextLayer, FillStyle, PageBackground } from "../types/schema";
import { useEditorStore } from "../store/useEditorStore";
import { setupGlobalUI } from "./EditorUI";
import { CustomTextbox } from "./CustomTextbox";
import { CURSORS } from "./constants";

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

  // ==================== 生命周期 ====================

  public init(canvasEl: HTMLCanvasElement, width: number, height: number) {
    if (this.canvas) this.dispose();

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
      this.syncLiveTransform(e.target as CustomTextbox)
    );
    // rotating 事件：当用户旋转选中对象（如拖动旋转框）时触发
    c.on("object:rotating", (e: FabricObjectEvent) =>
      this.syncLiveTransform(e.target as CustomTextbox)
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
    this.syncLiveTransform(target as CustomTextbox);
  }

  private onModified(e: FabricModifiedEvent) {
    const target = e.target as CustomTextbox;
    if (!target?.id) return;

    if (target instanceof CustomTextbox) {
      const corner = e.transform?.corner ?? "";
      target.finalizeScaling(corner);
      if (corner === "ml" || corner === "mr") {
        target.initDimensions();
        target.autoFitHeight();
      }
    }

    this.syncLayerTransform(target);
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
  private syncLiveTransform(target: CustomTextbox) {
    if (this.syncTransformRaf !== null) return;

    this.syncTransformRaf = requestAnimationFrame(() => {
      this.syncTransformRaf = null;
      if (!target?.id) return;
      const pageId = this.getCurrentPageId();
      if (!pageId) return;

      const r = EditorEngine.round1;
      const scaleX = target.scaleX ?? 1;
      const scaleY = target.scaleY ?? 1;
      const updates: Partial<TextLayer> = {
        x: r(target.left ?? 0),
        y: r(target.top ?? 0),
        rotation: Math.round(target.angle ?? 0),
        width: r((target.width ?? 0) * scaleX),
        height: r((target.height ?? 0) * scaleY),
      };

      if (target instanceof Textbox) {
        const isCornerScaling = scaleX !== 1 || scaleY !== 1;
        if (isCornerScaling) {
          const scale = (scaleX + scaleY) / 2;
          updates.fontSize = r(Math.max((target.fontSize ?? 12) * scale, 1));
        } else {
          updates.fontSize = r(target.fontSize ?? 12);
        }
      }

      useEditorStore.getState().updateLayer(target.id, updates);
    });
  }

  /** 将画布对象的变换属性同步到 Store */
  private syncLayerTransform(target: CustomTextbox) {
    const pageId = this.getCurrentPageId();
    if (!pageId) return;

    const r = EditorEngine.round1;
    const updates: Partial<TextLayer> = {
      x: r(target.left ?? 0),
      y: r(target.top ?? 0),
      rotation: Math.round(target.angle ?? 0),
      width: r(target.width ?? 0),
      height: r(target.height ?? 0),
    };

    if (target instanceof Textbox) {
      updates.fontSize = r(target.fontSize ?? 12);
    }

    useEditorStore.getState().updateLayer(target.id, updates);
  }

  // ==================== 公共 API ====================

  public updateLayerProps(layerId: string, props: Record<string, unknown>) {
    if (!this.canvas) return;
    const target = this.findObjectById(layerId);
    if (!target) return;

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

    const canvasW = this.canvas.getWidth();
    const maxTextW = canvasW * 0.9;

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

    // 居中放置（使用 Fabric 内置方法，确保水平和垂直都居中）
    this.canvas.add(node as unknown as FabricObject);
    this.canvas.centerObject(node as unknown as FabricObject);
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
    // 尺寸未变则跳过：setDimensions 即使尺寸相同也会重置 canvas context，
    // 这会在 mount 时产生不必要的清空（useLayoutEffect 初次运行时 init 已完成）。
    if (this.canvas.getWidth() === width && this.canvas.getHeight() === height) return;
    this.canvas.setDimensions({ width, height });
    this.canvas.calcOffset();
    // 必须同步 renderAll 而非 requestRenderAll：
    // setDimensions 清空了 canvas context，requestRenderAll 是异步 RAF，
    // 二者之间有一帧空白 → 文字闪烁。同步 renderAll 在清空后立即填充内容。
    this.canvas.renderAll();
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
