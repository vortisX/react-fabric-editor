import { Canvas, FabricObject, Textbox } from 'fabric';
import type { DesignDocument, TextLayer } from '../types/schema';
import { useEditorStore } from '../store/useEditorStore';
import { setupGlobalUI } from './EditorUI';
import { createCustomTextbox, type CustomTextbox } from './CustomTextbox';

// 扩展暴露 ID 的基础对象
export interface CustomFabricObject extends FabricObject {
  id?: string;
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

    // 初始化全局定制 UI 配置
    setupGlobalUI();

    this.bindEvents();
    console.log('[Engine] 核心引擎初始化成功，高级定制 UI 已挂载');
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
          updates.fontSize = Math.round((target as Textbox).fontSize ?? 36);
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
    
    const target = this.canvas.getObjects().find(
      (obj) => (obj as unknown as CustomFabricObject).id === layerId
    );

    if (target) {
      this.canvas.setActiveObject(target);
    } else {
      this.canvas.discardActiveObject();
    }
    this.canvas.renderAll();
  }

  public addTextLayer(layer: TextLayer) {
    if (!this.canvas) return;
    
    // 调用自研渲染层创建文本
    const textNode = createCustomTextbox(layer);
    
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