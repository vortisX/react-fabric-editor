import { Canvas, FabricObject, Textbox } from 'fabric';
import type { DesignDocument, TextLayer } from '../types/schema';
import { useEditorStore } from '../store/useEditorStore';
import { setupGlobalUI } from './EditorUI';
import { createCustomTextbox, CustomTextbox } from './CustomTextbox';

export class EditorEngine {
  public canvas: Canvas | null = null;

  public init(canvasEl: HTMLCanvasElement, width: number, height: number) {
    if (this.canvas) this.dispose();

    this.canvas = new Canvas(canvasEl, {
      width,
      height,
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: '#ffffff',
    });

    setupGlobalUI();
    this.bindEvents();
  }

  // ==================== 事件绑定 ====================

  private bindEvents() {
    const c = this.canvas!;

    c.on('selection:created', (e) => this.syncActiveLayer(e.selected?.[0]));
    c.on('selection:updated', (e) => this.syncActiveLayer(e.selected?.[0]));
    c.on('selection:cleared', () => useEditorStore.getState().setActiveLayer(null));

    c.on('object:scaling', (e) => this.handleScaling(e));
    c.on('object:resizing', (e) => this.handleResizing(e));
    c.on('object:modified', (e) => this.handleModified(e));
    c.on('text:changed', (e) => this.handleTextChanged(e));
  }

  private syncActiveLayer(target?: FabricObject) {
    const id = (target as CustomTextbox)?.id;
    if (id) useEditorStore.getState().setActiveLayer(id);
  }

  /** 四角拖动：等比缩放框体 + 字体；其他控制点：通用最小值约束 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleScaling(e: any) {
    const target = e.target;
    if (!(target instanceof CustomTextbox)) return;

    const { corner = '', originX = 'left', originY = 'top' } = e.transform ?? {};
    const anchorPoint = target.getPointByOrigin(originX, originY);

    const scaleX = target.scaleX ?? 1;
    const scaleY = target.scaleY ?? 1;
    const fontSize = target.fontSize ?? 12;
    const lineHeight = target.lineHeight ?? 1.2;

    if (['tl', 'tr', 'bl', 'br'].includes(corner)) {
      // 四角：均匀缩放字号 + 框体
      const scale = (scaleX + scaleY) / 2;
      const newFontSize = Math.max(fontSize * scale, 1);
      const newWidth = Math.max((target.width ?? 0) * scale, newFontSize);
      const newHeight = Math.max((target.height ?? 0) * scale, newFontSize * lineHeight);
      target.set({
        fontSize: newFontSize, width: newWidth,
        height: newHeight, _manualHeight: newHeight,
        scaleX: 1, scaleY: 1,
      });
    } else {
      // 通用：仅缩放框体，字号不变
      const newWidth = Math.max((target.width ?? 0) * scaleX, fontSize);
      const newHeight = Math.max((target.height ?? 0) * scaleY, fontSize * lineHeight);
      target.set({
        width: newWidth, height: newHeight, _manualHeight: newHeight,
        scaleX: 1, scaleY: 1,
      });
    }

    // 恢复锚点位置，防止拖到最小时框体漂移
    target.setPositionByOrigin(anchorPoint, originX, originY);
  }

  /** ml/mr 侧边拖动（Fabric Textbox 的 changeWidth 行为）：自动适应文字高度 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleResizing(e: any) {
    const target = e.target;
    if (!(target instanceof CustomTextbox)) return;

    const fontSize = target.fontSize ?? 12;
    const lineHeight = target.lineHeight ?? 1.2;
    const autoHeight = Math.max(target.calcTextHeight(), fontSize * lineHeight);

    target.height = autoHeight;
    target._manualHeight = autoHeight;
    target.dirty = true;
    target.setCoords();
  }

  /** 操作完成 → 同步属性到 Zustand Store */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleModified(e: any) {
    const target = e.target as CustomTextbox;
    if (!target?.id) return;

    const pageId = this.getCurrentPageId();
    if (!pageId) return;

    const updates: Partial<TextLayer> = {
      x: target.left ?? 0,
      y: target.top ?? 0,
      rotation: target.angle ?? 0,
      width: target.width ?? 0,
      height: target.height ?? 0,
    };

    if (target instanceof Textbox) {
      updates.fontSize = target.fontSize ?? 12;
    }

    useEditorStore.getState().updateLayer(pageId, target.id, updates);
  }

  /** 画布内编辑文字 → 同步内容和图层名称 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleTextChanged(e: any) {
    const target = e.target as CustomTextbox;
    if (!target?.id || target.text === undefined) return;

    const pageId = this.getCurrentPageId();
    if (!pageId) return;

    const text = target.text || '';
    const trimmed = text.trim() || '空文本';
    const name = trimmed.length > 15 ? trimmed.slice(0, 15) + '...' : trimmed;

    useEditorStore.getState().updateLayer(pageId, target.id, {
      content: text,
      name,
      width: target.width ?? 0,
      height: target.height ?? 0,
    });
  }

  // ==================== 公共 API ====================

  public updateLayerProps(layerId: string, props: Record<string, unknown>) {
    if (!this.canvas) return;
    const target = this.findObjectById(layerId);
    if (!target) return;

    // 同步 _manualHeight 以保持高度锁定
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalProps: Record<string, any> = { ...props, dirty: true };
    if (props.height !== undefined) {
      finalProps._manualHeight = props.height;
    }

    target.set(finalProps);

    // 影响文字排版的属性变更后，重新计算尺寸
    const layoutKeys = ['text', 'width', 'height', 'textAlign', 'fontFamily'];
    if (layoutKeys.some((k) => props[k] !== undefined) && target instanceof Textbox) {
      target.initDimensions();
      // 延迟同步，initDimensions 可能改变 width/height
      setTimeout(() => {
        const pageId = this.getCurrentPageId();
        const id = (target as CustomTextbox).id;
        if (pageId && id) {
          useEditorStore.getState().updateLayer(pageId, id, {
            width: target.width ?? 0,
            height: target.height ?? 0,
          });
        }
      }, 0);
    }

    this.canvas.renderAll();
  }

  public selectLayer(layerId: string) {
    if (!this.canvas) return;
    const target = this.findObjectById(layerId);
    if (target) this.canvas.setActiveObject(target);
    else this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  public addTextLayer(layer: TextLayer) {
    if (!this.canvas) return;
    const node = createCustomTextbox(layer);
    this.canvas.add(node as unknown as FabricObject);
    this.canvas.setActiveObject(node as unknown as FabricObject);
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

  // ==================== 内部工具 ====================

  private getCurrentPageId(): string | undefined {
    return useEditorStore.getState().document?.pages[0]?.pageId;
  }

  private findObjectById(id: string): FabricObject | undefined {
    return this.canvas?.getObjects().find((obj) => (obj as CustomTextbox).id === id);
  }
}

export const engineInstance = new EditorEngine();