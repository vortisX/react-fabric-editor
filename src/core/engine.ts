import { Canvas, FabricObject, IText } from 'fabric';
import type { DesignDocument, TextLayer } from '../types/schema';

export class EditorEngine {
  public canvas: Canvas | null = null;

  // 重点修改：直接接收真实 DOM 元素
  public init(canvasEl: HTMLCanvasElement, width: number, height: number) {
    if (this.canvas) {
      this.dispose();
    }

    // 直接使用传进来的 DOM 进行实例化，绝不依赖全局搜索
    this.canvas = new Canvas(canvasEl, {
      width,
      height,
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: '#ffffff'
    });

    FabricObject.prototype.transparentCorners = false;
    FabricObject.prototype.cornerColor = '#ffffff';
    FabricObject.prototype.cornerStrokeColor = '#0d99ff';
    FabricObject.prototype.borderColor = '#0d99ff';
    FabricObject.prototype.cornerSize = 8;
    FabricObject.prototype.padding = 0;
    FabricObject.prototype.cornerStyle = 'circle';
    FabricObject.prototype.borderDashArray = [4, 4];

    console.log('[Engine] Fabric.js v7 引擎初始化成功');
  }

  public addTextLayer(layer: TextLayer) {
    if (!this.canvas) return;

    const textNode = new IText(layer.content, {
      left: layer.x,
      top: layer.y,
      fill: layer.fill,
      fontSize: layer.fontSize,
      fontFamily: layer.fontFamily,
      fontWeight: layer.fontWeight as number | string,
      textAlign: layer.textAlign
    });

    textNode.set('id', layer.id);

    this.canvas.add(textNode);
    this.canvas.setActiveObject(textNode);
    this.canvas.renderAll();
  }

  public loadDocument(doc: DesignDocument) {
    if (!this.canvas) return;
    this.canvas.clear();
    this.canvas.setDimensions({ width: doc.global.width, height: doc.global.height });
    const page = doc.pages[0];
    if (page?.background.type === 'color') {
      this.canvas.backgroundColor = page.background.value;
    }
    this.canvas.renderAll();
  }

  public dispose() {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
  }
}

export const engineInstance = new EditorEngine();