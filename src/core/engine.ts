import { Canvas, FabricObject, Textbox } from 'fabric';
import type { DesignDocument, TextLayer } from '../types/schema';
import { useEditorStore } from '../store/useEditorStore';
import { setupGlobalUI } from './EditorUI';
import { createCustomTextbox, type CustomTextbox } from './CustomTextbox';

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

    setupGlobalUI();

    this.bindEvents();
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transform = (e as any).transform;
      const corner: string = transform?.corner ?? '';
      const anchorOriginX = transform?.originX ?? 'left';
      const anchorOriginY = transform?.originY ?? 'top';

      // 记住锚点位置（拖动控制点对面的角/边）
      const anchorPoint = target.getPointByOrigin(anchorOriginX, anchorOriginY);

      const scaleX = target.scaleX ?? 1;
      const scaleY = target.scaleY ?? 1;
      const oldFontSize = target.fontSize ?? 12;
      const lineHeight = target.lineHeight ?? 1.2;

      const isCorner = ['tl', 'tr', 'bl', 'br'].includes(corner);

      if (isCorner) {
        // 四角拖动：等比缩放框体 + 字体大小（使用均匀缩放比，不取整，确保丝滑）
        const uniformScale = (scaleX + scaleY) / 2;
        const newFontSize = Math.max(oldFontSize * uniformScale, 1);
        const newWidth = Math.max((target.width ?? 0) * uniformScale, newFontSize);
        const newHeight = Math.max((target.height ?? 0) * uniformScale, newFontSize * lineHeight);

        target.set({
          fontSize: newFontSize,
          width: newWidth,
          height: newHeight,
          _manualHeight: newHeight,
          scaleX: 1,
          scaleY: 1
        });
      } else {
        // 其他控制点：通用缩放
        const minWidth = oldFontSize;
        const minHeight = oldFontSize * lineHeight;
        const newWidth = Math.max((target.width ?? 0) * scaleX, minWidth);
        const newHeight = Math.max((target.height ?? 0) * scaleY, minHeight);

        target.set({
          width: newWidth,
          height: newHeight,
          _manualHeight: newHeight,
          scaleX: 1,
          scaleY: 1
        });
      }

      // 恢复锚点位置，防止拖动到最小时框体漂移
      target.setPositionByOrigin(anchorPoint, anchorOriginX, anchorOriginY);
    });

    // Fabric.js Textbox 的 ml/mr 使用 changeWidth，触发 object:resizing 而非 object:scaling
    this.canvas.on('object:resizing', (e) => {
      const target = e.target as unknown as CustomTextbox;
      if (!target || !(target instanceof Textbox)) return;

      const oldFontSize = target.fontSize ?? 12;
      const lineHeight = target.lineHeight ?? 1.2;

      // Fabric 已经直接修改了 width，用 calcTextHeight 获取文字换行后的真实高度
      const textHeight = target.calcTextHeight();
      const autoHeight = Math.max(textHeight, oldFontSize * lineHeight);
      target.height = autoHeight;
      target._manualHeight = autoHeight;
      target.dirty = true;
      target.setCoords();
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

        // 同步字号（四角拖动会改变 fontSize）
        if (target instanceof Textbox) {
          updates.fontSize = target.fontSize ?? 12;
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
        // === 核心新增：画布内打字时，动态计算并同步图层名称 ===
        const textVal = target.text || '';
        const newName = textVal.trim() || '空文本';
        const finalName = newName.length > 15 ? newName.slice(0, 15) + '...' : newName;

        state.updateLayer(currentPageId, target.id, {
          content: textVal,
          name: finalName, // 同步给左侧的图层树结构
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
      const finalProps = { ...props, dirty: true };
      if (props.height !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (finalProps as any)._manualHeight = props.height;
      }
      
      target.set(finalProps);

      if (props.text !== undefined || props.width !== undefined || props.height !== undefined || props.textAlign !== undefined || props.fontFamily !== undefined) {

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