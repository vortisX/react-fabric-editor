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

  /** 拖动中：仅做最小尺寸约束，不修改 fontSize / 不重置 scale，完全依赖 Fabric 原生定位 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleScaling(e: any) {
    const target = e.target;
    if (!(target instanceof CustomTextbox)) return;

    const fontSize = target.fontSize ?? 12;
    const lineHeight = target.lineHeight ?? 1.2;
    const scaleX = target.scaleX ?? 1;
    const scaleY = target.scaleY ?? 1;

    // 计算缩放后的视觉尺寸，约束最小值
    const visualW = (target.width ?? 0) * scaleX;
    const visualH = (target.height ?? 0) * scaleY;
    const minW = fontSize * scaleX;
    const minH = fontSize * lineHeight * scaleY;

    if (visualW < minW) target.scaleX = minW / (target.width ?? 1);
    if (visualH < minH) target.scaleY = minH / (target.height ?? 1);
  }

  /** 松手后：一次性将 scale 转换为真实尺寸，四角额外同步 fontSize */
  private finalizeScaling(target: CustomTextbox, corner: string) {
    const scaleX = target.scaleX ?? 1;
    const scaleY = target.scaleY ?? 1;
    if (scaleX === 1 && scaleY === 1) return;

    const fontSize = target.fontSize ?? 12;
    const lineHeight = target.lineHeight ?? 1.2;
    const isCorner = ['tl', 'tr', 'bl', 'br'].includes(corner);

    // left/top 已经被 Fabric 计算好了，直接保存
    const left = target.left;
    const top = target.top;

    const newWidth = (target.width ?? 0) * scaleX;
    const newHeight = (target.height ?? 0) * scaleY;
    let newFontSize = fontSize;

    if (isCorner) {
      const scale = (scaleX + scaleY) / 2;
      newFontSize = Math.max(fontSize * scale, 1);
    }

    const finalW = Math.max(newWidth, newFontSize);
    const finalH = Math.max(newHeight, newFontSize * lineHeight);

    // 先清 _manualHeight，防止 set() 触发 initDimensions 时用旧值覆写高度
    target._manualHeight = undefined;

    target.set({
      fontSize: newFontSize,
      width: finalW,
      height: finalH,
      scaleX: 1,
      scaleY: 1,
    });

    // 恢复位置和手动高度
    target._manualHeight = finalH;
    target.left = left;
    target.top = top;
    target.setCoords();
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

  /** 操作完成 → 归一化 scale + 同步属性到 Zustand Store */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleModified(e: any) {
    const target = e.target as CustomTextbox;
    if (!target?.id) return;

    // 松手时将 scale 转换为真实尺寸 + fontSize
    const corner: string = e.transform?.corner ?? '';
    if (target instanceof CustomTextbox) {
      this.finalizeScaling(target, corner);
    }

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