import { Canvas, FabricObject, Textbox } from 'fabric';
import type { DesignDocument, TextLayer } from '../types/schema';
import { useEditorStore } from '../store/useEditorStore';
import { setupGlobalUI } from './EditorUI';
import { CustomTextbox } from './CustomTextbox';

const LAYOUT_KEYS = ['text', 'width', 'height', 'textAlign', 'fontFamily'] as const;

export class EditorEngine {
  public canvas: Canvas | null = null;

  // ==================== 生命周期 ====================

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

  public dispose() {
    if (!this.canvas) return;
    this.canvas.off();
    this.canvas.dispose();
    this.canvas = null;
  }

  // ==================== 事件绑定 ====================

  private bindEvents() {
    const c = this.canvas!;

    c.on('selection:created', (e) => this.onSelectionChanged(e.selected?.[0]));
    c.on('selection:updated', (e) => this.onSelectionChanged(e.selected?.[0]));
    c.on('selection:cleared', () => this.onSelectionChanged(undefined));

    c.on('object:scaling', (e) => this.onScaling(e.target));
    c.on('object:resizing', (e) => this.onResizing(e.target));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.on('object:modified', (e: any) => this.onModified(e));
    c.on('text:changed', (e) => this.onTextChanged(e.target));
  }

  private onSelectionChanged(target?: FabricObject) {
    const id = target ? (target as CustomTextbox).id : null;
    useEditorStore.getState().setActiveLayer(id ?? null);
  }

  private onScaling(target: FabricObject) {
    if (target instanceof CustomTextbox) target.constrainScaling();
  }

  private onResizing(target: FabricObject) {
    if (target instanceof CustomTextbox) target.autoFitHeight();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onModified(e: any) {
    const target = e.target as CustomTextbox;
    if (!target?.id) return;

    if (target instanceof CustomTextbox) {
      target.finalizeScaling(e.transform?.corner ?? '');
    }

    this.syncLayerTransform(target);
  }

  private onTextChanged(target: FabricObject) {
    const tb = target as CustomTextbox;
    if (!tb.id || tb.text === undefined) return;

    const pageId = this.getCurrentPageId();
    if (!pageId) return;

    const text = tb.text || '';
    const trimmed = text.trim() || '空文本';
    const name = trimmed.length > 15 ? trimmed.slice(0, 15) + '...' : trimmed;

    useEditorStore.getState().updateLayer(pageId, tb.id, {
      content: text,
      name,
      width: tb.width ?? 0,
      height: tb.height ?? 0,
    });
  }

  /** 将画布对象的变换属性同步到 Store */
  private syncLayerTransform(target: CustomTextbox) {
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

  // ==================== 公共 API ====================

  public updateLayerProps(layerId: string, props: Record<string, unknown>) {
    if (!this.canvas) return;
    const target = this.findObjectById(layerId);
    if (!target) return;

    const finalProps: Record<string, unknown> = { ...props, dirty: true };
    if (props.height !== undefined) {
      finalProps._manualHeight = props.height;
    }

    target.set(finalProps);

    if (LAYOUT_KEYS.some((k) => props[k] !== undefined) && target instanceof Textbox) {
      target.initDimensions();
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
    const node = CustomTextbox.fromLayer(layer);
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

  // ==================== 内部工具 ====================

  private getCurrentPageId(): string | undefined {
    return useEditorStore.getState().document?.pages[0]?.pageId;
  }

  private findObjectById(id: string): FabricObject | undefined {
    return this.canvas?.getObjects().find((obj) => (obj as CustomTextbox).id === id);
  }
}

export const engineInstance = new EditorEngine();