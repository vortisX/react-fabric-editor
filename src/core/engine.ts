import { Canvas, FabricObject, Textbox } from "fabric";
import type { DesignDocument, TextLayer } from "../types/schema";
import { useEditorStore } from "../store/useEditorStore";

// 1. 扩展 Fabric 原生对象类型，加入业务侧的 id
interface CustomFabricObject extends FabricObject {
  id?: string;
}

// 2. 专门为 Textbox 扩展，解决 instanceof 后的类型收窄报错
interface CustomTextbox extends Textbox {
  id?: string;
}

// 3. 严格定义 Fabric 选中事件的参数类型
interface FabricSelectionEvent {
  selected?: CustomFabricObject[];
}

export class EditorEngine {
  public canvas: Canvas | null = null;

  public init(canvasEl: HTMLCanvasElement, width: number, height: number) {
    if (this.canvas) {
      this.dispose();
    }

    this.canvas = new Canvas(canvasEl, {
      width,
      height,
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: "#ffffff",
    });

    // 定制高级控制框UI
    FabricObject.prototype.transparentCorners = false;
    FabricObject.prototype.cornerColor = "#ffffff";
    FabricObject.prototype.cornerStrokeColor = "#0d99ff";
    FabricObject.prototype.borderColor = "#0d99ff";
    FabricObject.prototype.cornerSize = 8;
    FabricObject.prototype.padding = 0;
    FabricObject.prototype.cornerStyle = "circle";
    FabricObject.prototype.borderDashArray = [4, 4];

    this.bindEvents();
    console.log("[Engine] Fabric.js v7 引擎初始化成功，事件已绑定");
  }

  /**
   * 核心神经枢纽：监听画布上发生的一切，并向大脑汇报
   */
  private bindEvents() {
    if (!this.canvas) return;

    // A. 监听选中图层
    this.canvas.on("selection:created", this.handleSelection);
    this.canvas.on("selection:updated", this.handleSelection);

    // B. 监听取消选中 (点击了画布空白处)
    this.canvas.on("selection:cleared", () => {
      useEditorStore.getState().setActiveLayer(null);
    });

    // C. 核心拦截器：拦截文本的拉伸，强制转换为字号和外框宽度的变化！
    this.canvas.on("object:scaling", (e) => {
      const target = e.target;
      if (!target || !(target instanceof Textbox)) return;

      const scaleX = target.scaleX ?? 1;
      const scaleY = target.scaleY ?? 1;

      target.set({
        width: Math.max(target.width * scaleX, 20), // 限制最小宽度
        fontSize: Math.max(target.fontSize * scaleY, 12), // 限制最小字号
        scaleX: 1,
        scaleY: 1,
      });
    });

    // D. 监听图层被移动、缩放、旋转结束的那一刻
    this.canvas.on("object:modified", (e) => {
      const target = e.target as CustomFabricObject;
      const targetId = target?.id;
      if (!target || !targetId) return;

      const state = useEditorStore.getState();
      const currentPageId = state.document?.pages[0]?.pageId;

      if (currentPageId) {
        // 反向将最新的坐标和角度写入 Zustand
        const updates: Partial<TextLayer> = {
          x: target.left ?? 0,
          y: target.top ?? 0,
          rotation: target.angle ?? 0,
          width: target.width ?? 0,
          height: target.height ?? 0,
        };

        // 如果是文本框，把重新计算过的 fontSize 也同步回去
        if (target instanceof Textbox) {
          updates.fontSize = Math.round(target.fontSize);
        }

        state.updateLayer(currentPageId, targetId, updates);
      }
    });

    // E. 监听文字内容的实时打字修改
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.canvas.on("text:changed", (e: any) => {
      const target = e.target as CustomTextbox;
      if (!target || !target.id || target.text === undefined) return;

      const state = useEditorStore.getState();
      const currentPageId = state.document?.pages[0]?.pageId;

      if (currentPageId) {
        state.updateLayer(currentPageId, target.id, {
          content: target.text,
          width: target.width ?? 0,
          height: target.height ?? 0,
        });
      }
    });
  }

  // 处理选中逻辑的回调函数
  private handleSelection = (e: FabricSelectionEvent) => {
    const target = e.selected?.[0];
    if (target && target.id) {
      useEditorStore.getState().setActiveLayer(target.id);
    }
  };

  // 根据 ID 精确修改画布中某个图层的属性 (供右侧面板调用)
  public updateLayerProps(layerId: string, props: Record<string, unknown>) {
    if (!this.canvas) return;

    const target = this.canvas
      .getObjects()
      .find((obj) => (obj as CustomFabricObject).id === layerId);

    if (target) {
      target.set(props);
      this.canvas.renderAll();
    }
  }

  // 从外部命令 Fabric 选中某个特定的图层 (供左侧图层树调用)
  public selectLayer(layerId: string) {
    if (!this.canvas) return;

    const target = this.canvas
      .getObjects()
      .find((obj) => (obj as CustomFabricObject).id === layerId);

    if (target) {
      this.canvas.setActiveObject(target);
    } else {
      this.canvas.discardActiveObject();
    }
    this.canvas.renderAll();
  }

  // 添加文本图层
  public addTextLayer(layer: TextLayer) {
    if (!this.canvas) return;

    // 使用 Textbox 替代 IText，拥有真正的“段落边界”概念
    const textNode = new Textbox(layer.content, {
      left: layer.x,
      top: layer.y,
      width: layer.width,
      angle: layer.rotation,
      fill: layer.fill,
      fontSize: layer.fontSize,
      fontFamily: layer.fontFamily,
      fontWeight: layer.fontWeight,
      textAlign: layer.textAlign,
      lineHeight: layer.lineHeight ?? 1.2,
      charSpacing: layer.letterSpacing ?? 0,
      fontStyle: layer.fontStyle ?? "normal",
      underline: layer.underline ?? false,
      textBackgroundColor: layer.textBackgroundColor ?? "",
      stroke: layer.stroke ?? "",
      strokeWidth: layer.strokeWidth ?? 0,
      strokeDashArray: layer.strokeDashArray,
      splitByGrapheme: true, // 允许中文字符在中途自动换行
    });

    textNode.set("id", layer.id);

    this.canvas.add(textNode);
    this.canvas.setActiveObject(textNode);
    this.canvas.renderAll();
  }

  // 加载整个文档 (MVP 阶段目前只加载背景，后续会加入图层遍历加载)
  public loadDocument(doc: DesignDocument) {
    if (!this.canvas) return;
    this.canvas.clear();
    this.canvas.setDimensions({
      width: doc.global.width,
      height: doc.global.height,
    });
    const page = doc.pages[0];
    if (page?.background.type === "color") {
      this.canvas.backgroundColor = page.background.value;
    }
    this.canvas.renderAll();
  }

  public dispose() {
    if (this.canvas) {
      this.canvas.off();
      this.canvas.dispose();
      this.canvas = null;
    }
  }
}

export const engineInstance = new EditorEngine();
