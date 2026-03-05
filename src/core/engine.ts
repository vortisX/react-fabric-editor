import { Canvas, FabricObject, IText } from "fabric";
import type { DesignDocument, TextLayer } from "../types/schema";
// 1. 直接引入 Zustand 大脑的实体
import { useEditorStore } from "../store/useEditorStore";

// 2. 优雅地扩展 Fabric 原生对象类型，加入我们业务侧的 id，彻底杜绝 any
interface CustomFabricObject extends FabricObject {
  id?: string;
}
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

    FabricObject.prototype.transparentCorners = false;
    FabricObject.prototype.cornerColor = "#ffffff";
    FabricObject.prototype.cornerStrokeColor = "#0d99ff";
    FabricObject.prototype.borderColor = "#0d99ff";
    FabricObject.prototype.cornerSize = 8;
    FabricObject.prototype.padding = 0;
    FabricObject.prototype.cornerStyle = "circle";
    FabricObject.prototype.borderDashArray = [4, 4];

    // 3. 初始化完成后，立刻绑定画布交互事件
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
      console.log("[Engine] 取消选中");
    });

    // C. 监听图层被移动、缩放、旋转结束的那一刻
    this.canvas.on("object:modified", (e) => {
      const target = e.target as CustomFabricObject;
      if (!target || !target.id) return;

      const state = useEditorStore.getState();
      const currentPageId = state.document?.pages[0]?.pageId; // MVP 阶段默认第一页

      if (currentPageId) {
        // 反向将最新的坐标和角度写入 Zustand
        state.updateLayer(currentPageId, target.id, {
          x: target.left ?? 0,
          y: target.top ?? 0,
          rotation: target.angle ?? 0,
        });
        console.log(
          `[Engine] 图层 ${target.id} 坐标已同步至大脑: X:${target.left}, Y:${target.top}`,
        );
      }
    });
  }

  // 处理选中逻辑的回调函数
  private handleSelection = (e: FabricSelectionEvent) => {
    // Fabric 支持多选，MVP 阶段我们只处理单选的第一个元素
    const target = e.selected?.[0] as CustomFabricObject;
    if (target && target.id) {
      useEditorStore.getState().setActiveLayer(target.id);
      console.log(`[Engine] 选中图层: ${target.id}`);
    }
  };

  public addTextLayer(layer: TextLayer) {
    if (!this.canvas) return;

    const textNode = new IText(layer.content, {
      left: layer.x,
      top: layer.y,
      fill: layer.fill,
      fontSize: layer.fontSize,
      fontFamily: layer.fontFamily,
      fontWeight: layer.fontWeight as number | string,
      textAlign: layer.textAlign,
    });

    textNode.set("id", layer.id);

    this.canvas.add(textNode);
    this.canvas.setActiveObject(textNode);
    this.canvas.renderAll();
  }
  // 新增方法：根据 ID 精确修改画布中某个图层的属性
  public updateLayerProps(layerId: string, props: Partial<CustomFabricObject>) {
    if (!this.canvas) return;

    // 遍历当前画布上的所有对象，找到对应 ID 的那个
    const target = this.canvas
      .getObjects()
      .find((obj) => (obj as CustomFabricObject).id === layerId);

    if (target) {
      target.set(props);
      this.canvas.renderAll(); // 重新渲染画布
    }
  }
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
  // 新增方法：从外部命令 Fabric 选中某个特定的图层
  public selectLayer(layerId: string) {
    if (!this.canvas) return;

    // 找到对应 ID 的图层
    const target = this.canvas
      .getObjects()
      .find((obj) => (obj as CustomFabricObject).id === layerId);

    if (target) {
      this.canvas.setActiveObject(target);
    } else {
      this.canvas.discardActiveObject(); // 找不到就取消选中
    }
    this.canvas.renderAll();
  }
  public dispose() {
    if (this.canvas) {
      // 销毁时清理事件监听，防止内存泄漏
      this.canvas.off();
      this.canvas.dispose();
      this.canvas = null;
    }
  }
}

export const engineInstance = new EditorEngine();
