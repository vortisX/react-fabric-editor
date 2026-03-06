import { Canvas, FabricObject, Textbox } from 'fabric';
import type { DesignDocument, TextLayer } from '../types/schema';
import { useEditorStore } from '../store/useEditorStore';

interface CustomFabricObject extends FabricObject {
  id?: string;
}

interface CustomTextbox extends Textbox {
  id?: string;
  boxStroke?: string;
  boxStrokeWidth?: number;
  boxStrokeDashArray?: number[];
  boxBackgroundColor?: string;
  boxBorderRadius?: number;
}

interface OverridableTextbox extends CustomTextbox {
  _render(ctx: CanvasRenderingContext2D): void;
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

    this.bindEvents();
    console.log('[Engine] 引擎初始化成功，支持圆角和两端对齐');
  }

  private bindEvents() {
    if (!this.canvas) return;

    this.canvas.on('selection:created', (e) => {
      const target = e.selected?.[0] as unknown as CustomFabricObject;
      if (target && target.id) useEditorStore.getState().setActiveLayer(target.id);
    });

    this.canvas.on('selection:updated', (e) => {
      const target = e.selected?.[0] as unknown as CustomFabricObject;
      if (target && target.id) useEditorStore.getState().setActiveLayer(target.id);
    });
    
    this.canvas.on('selection:cleared', () => {
      useEditorStore.getState().setActiveLayer(null);
    });

    this.canvas.on('object:scaling', (e) => {
      const target = e.target as unknown as CustomTextbox;
      if (!target || !(target instanceof Textbox)) return;

      const scaleX = target.scaleX ?? 1;
      const scaleY = target.scaleY ?? 1;

      target.set({
        width: Math.max((target.width ?? 0) * scaleX, 20),
        fontSize: Math.max((target.fontSize ?? 0) * scaleY, 12),
        scaleX: 1,
        scaleY: 1
      });
    });

    this.canvas.on('object:modified', (e) => {
      const target = e.target as unknown as CustomFabricObject;
      const targetId = target?.id; 
      if (!target || !targetId) return;

      const state = useEditorStore.getState();
      const currentPageId = state.document?.pages[0]?.pageId;

      if (currentPageId) {
        const updates: Partial<TextLayer> = {
          x: target.left ?? 0,
          y: target.top ?? 0,
          rotation: target.angle ?? 0,
          width: target.width ?? 0,
          height: target.height ?? 0,
        };

        if (target instanceof Textbox) {
          updates.fontSize = Math.round(target.fontSize ?? 36);
        }

        state.updateLayer(currentPageId, targetId, updates);
      }
    });

    this.canvas.on('text:changed', (e) => {
      const target = e.target as unknown as CustomTextbox;
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

  public updateLayerProps(layerId: string, props: Record<string, unknown>) {
    if (!this.canvas) return;

    const target = this.canvas.getObjects().find(
      (obj) => (obj as unknown as CustomFabricObject).id === layerId
    );

    if (target) {
      target.set({ ...props, dirty: true });

      if (props.text !== undefined || props.width !== undefined || props.height !== undefined || props.textAlign !== undefined) {
        if (target instanceof Textbox) {
          target.initDimensions(); 
        }
        
        setTimeout(() => {
          const state = useEditorStore.getState();
          const currentPageId = state.document?.pages[0]?.pageId;
          if (currentPageId && (target as unknown as CustomFabricObject).id) {
            state.updateLayer(currentPageId, (target as unknown as CustomFabricObject).id!, {
              width: target.width ?? 0,
              height: target.height ?? 0,
            });
          }
        }, 0);
      }

      this.canvas.renderAll();
    }
  }

  public selectLayer(layerId: string) {
    if (!this.canvas) return;
    const target = this.canvas.getObjects().find((obj) => (obj as unknown as CustomFabricObject).id === layerId);
    if (target) {
      this.canvas.setActiveObject(target);
    } else {
      this.canvas.discardActiveObject();
    }
    this.canvas.renderAll();
  }

  public addTextLayer(layer: TextLayer) {
    if (!this.canvas) return;

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
      fontStyle: layer.fontStyle ?? 'normal',
      underline: layer.underline ?? false,
      // 注意：这里故意不传 backgroundColor 给原生系统，由我们自己画圆角背景
      splitByGrapheme: true,
    }) as unknown as CustomTextbox;

    textNode.set({
      id: layer.id,
      boxStroke: layer.stroke ?? '',
      boxStrokeWidth: layer.strokeWidth ?? 0,
      boxStrokeDashArray: layer.strokeDashArray,
      boxBackgroundColor: layer.textBackgroundColor ?? '',
      boxBorderRadius: layer.borderRadius ?? 0, // 新增弧度
    });

    const overrideNode = textNode as unknown as OverridableTextbox;
    const originalRender = overrideNode._render.bind(overrideNode);
    
    // 自定义渲染：画圆角背景 -> 画文字 -> 画圆角边框
    overrideNode._render = function(this: OverridableTextbox, ctx: CanvasRenderingContext2D) {
      const w = this.width ?? 0;
      const h = this.height ?? 0;
      const r = this.boxBorderRadius ?? 0;

      // 1. 绘制带弧度的背景色
      if (this.boxBackgroundColor) {
        ctx.save();
        ctx.fillStyle = this.boxBackgroundColor;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-w / 2, -h / 2, w, h, r);
        } else {
          ctx.rect(-w / 2, -h / 2, w, h);
        }
        ctx.fill();
        ctx.restore();
      }

      // 2. 绘制原生文字
      originalRender(ctx); 
      
      // 3. 绘制带弧度的边框描边
      const strokeColor = this.boxStroke;
      const strokeWidth = this.boxStrokeWidth;
      
      if (strokeColor && strokeWidth && strokeWidth > 0) {
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        if (this.boxStrokeDashArray) {
          ctx.setLineDash(this.boxStrokeDashArray);
        }
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-w / 2, -h / 2, w, h, r);
        } else {
          ctx.rect(-w / 2, -h / 2, w, h);
        }
        ctx.stroke();
        ctx.restore();
      }
    };

    this.canvas.add(textNode as unknown as FabricObject);
    this.canvas.setActiveObject(textNode as unknown as FabricObject);
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
      this.canvas.off();
      this.canvas.dispose();
      this.canvas = null;
    }
  }
}

export const engineInstance = new EditorEngine();