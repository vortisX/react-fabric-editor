// src/core/engine.ts
// 1. 采用最新版 ESM 按需导入规范
import { Canvas, FabricObject } from "fabric";
import type { DesignDocument } from "../types/schema";

export class EditorEngine {
  public canvas: Canvas | null = null;
  private containerId: string;

  constructor(containerId: string) {
    this.containerId = containerId;
  }

  /**
   * 1. 初始化画布
   */
  public init(width: number, height: number) {
    if (this.canvas) {
      this.dispose();
    }

    // 2. 直接实例化引入的 Canvas 类
    const canvasEl = document.getElementById(
      this.containerId,
    ) as HTMLCanvasElement;
    if (!canvasEl) {
      console.error("[Engine] 找不到 Canvas DOM 节点");
      return;
    }

    this.canvas = new Canvas(canvasEl, {
      width,
      height,
      preserveObjectStacking: true, // 选中图层时，不要强制把它置顶
      selection: true, // 允许鼠标在空白处拖拽框选
      backgroundColor: "#ffffff",
    });

    // 3. 核心 UI 覆写：最新版移除了 prototype.set，直接修改类的原型属性
    // 打造 Figma / 稿定设计 风格的高级选中控制框
    FabricObject.prototype.transparentCorners = false;
    FabricObject.prototype.cornerColor = "#ffffff";
    FabricObject.prototype.cornerStrokeColor = "#0d99ff";
    FabricObject.prototype.borderColor = "#0d99ff";
    FabricObject.prototype.cornerSize = 8;
    FabricObject.prototype.padding = 0;
    FabricObject.prototype.cornerStyle = "circle";
    FabricObject.prototype.borderDashArray = [4, 4];

    console.log("[Engine] Fabric.js 最新版引擎初始化成功");
  }

  /**
   * 2. 加载 JSON 数据并渲染
   */
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

  /**
   * 3. 销毁画布，释放内存
   */
  public dispose() {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
      console.log("[Engine] Fabric.js 实例已安全销毁");
    }
  }
}
