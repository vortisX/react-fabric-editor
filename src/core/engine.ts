import { Canvas, FabricObject, Textbox, Gradient } from 'fabric';
import type { DesignDocument, TextLayer, FillStyle } from '../types/schema';
import { useEditorStore } from '../store/useEditorStore';
import { setupGlobalUI } from './EditorUI';
import { CustomTextbox } from './CustomTextbox';
import { CURSORS } from './cursors';

/**
 * 将 Schema 的 FillStyle 转换为 Fabric.js 可用的 fill 值。
 * - SolidFill / 纯色字符串 → 返回颜色字符串
 * - GradientFill → 返回 Fabric Gradient 实例
 */
export function fillStyleToFabric(
  fill: string | FillStyle,
  width: number,
  height: number,
): string | InstanceType<typeof Gradient<'linear'>> {
  if (typeof fill === 'string') return fill;
  if (fill.type === 'solid') return fill.color;

  const isHorizontal = fill.direction === 'horizontal';
  return new Gradient({
    type: 'linear',
    coords: {
      x1: 0,
      y1: 0,
      x2: isHorizontal ? width : 0,
      y2: isHorizontal ? 0 : height,
    },
    colorStops: fill.colorStops.map((s) => ({
      offset: s.offset,
      color: s.color,
    })),
  });
}

const LAYOUT_KEYS = ['text', 'width', 'height', 'textAlign', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'charSpacing', 'fontStyle'] as const;

type FabricSelectionEvent = { selected?: FabricObject[] };
type FabricObjectEvent = { target: FabricObject };
type FabricModifiedEvent = { target: FabricObject; transform?: { corner?: string } };

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
      defaultCursor: CURSORS.default,
      hoverCursor: CURSORS.move,
      moveCursor: CURSORS.move,
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

    c.on('selection:created', (e: FabricSelectionEvent) => this.onSelectionChanged(e.selected?.[0]));
    c.on('selection:updated', (e: FabricSelectionEvent) => this.onSelectionChanged(e.selected?.[0]));
    c.on('selection:cleared', () => this.onSelectionChanged(undefined));

    c.on('object:scaling', (e: FabricObjectEvent) => this.onScaling(e.target));
    c.on('object:resizing', (e: FabricObjectEvent) => this.onResizing(e.target));
    c.on('object:moving', (e: FabricObjectEvent) => this.syncLiveTransform(e.target as CustomTextbox));
    c.on('object:rotating', (e: FabricObjectEvent) => this.syncLiveTransform(e.target as CustomTextbox));
    c.on('object:modified', (e: FabricModifiedEvent) => this.onModified(e));
    c.on('text:changed', (e: FabricObjectEvent) => this.onTextChanged(e.target));
  }

  private onSelectionChanged(target?: FabricObject) {
    const id = target ? (target as CustomTextbox).id : null;
    useEditorStore.getState().setActiveLayer(id ?? null);
  }

  private onScaling(target: FabricObject) {
    if (target instanceof CustomTextbox) target.constrainScaling();
    this.syncLiveTransform(target as CustomTextbox);
  }

  private onResizing(target: FabricObject) {
    if (target instanceof CustomTextbox) target.autoFitHeight();
    this.syncLiveTransform(target as CustomTextbox);
  }

  private onModified(e: FabricModifiedEvent) {
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

    tb.autoFitHeight();

    const text = tb.text || '';
    const trimmed = text.trim() || '空文本';
    const name = trimmed.length > 15 ? trimmed.slice(0, 15) + '...' : trimmed;

    useEditorStore.getState().updateLayer(tb.id, {
      content: text,
      name,
      width: tb.width ?? 0,
      height: tb.height ?? 0,
    });
  }

  private static round1(n: number) { return Math.round(n * 10) / 10; }

  /** 拖动/旋转/缩放过程中实时同步视觉属性到 Store（不做 scale 转换） */
  private syncLiveTransform(target: CustomTextbox) {
    if (!target?.id) return;
    const pageId = this.getCurrentPageId();
    if (!pageId) return;

    const r = EditorEngine.round1;
    const scaleX = target.scaleX ?? 1;
    const scaleY = target.scaleY ?? 1;
    const updates: Partial<TextLayer> = {
      x: r(target.left ?? 0),
      y: r(target.top ?? 0),
      rotation: Math.round(target.angle ?? 0),
      width: r((target.width ?? 0) * scaleX),
      height: r((target.height ?? 0) * scaleY),
    };

    if (target instanceof Textbox) {
      const isCornerScaling = scaleX !== 1 || scaleY !== 1;
      if (isCornerScaling) {
        const scale = (scaleX + scaleY) / 2;
        updates.fontSize = r(Math.max((target.fontSize ?? 12) * scale, 1));
      } else {
        updates.fontSize = r(target.fontSize ?? 12);
      }
    }

    useEditorStore.getState().updateLayer(target.id, updates);
  }

  /** 将画布对象的变换属性同步到 Store */
  private syncLayerTransform(target: CustomTextbox) {
    const pageId = this.getCurrentPageId();
    if (!pageId) return;

    const r = EditorEngine.round1;
    const updates: Partial<TextLayer> = {
      x: r(target.left ?? 0),
      y: r(target.top ?? 0),
      rotation: Math.round(target.angle ?? 0),
      width: r(target.width ?? 0),
      height: r(target.height ?? 0),
    };

    if (target instanceof Textbox) {
      updates.fontSize = r(target.fontSize ?? 12);
    }

    useEditorStore.getState().updateLayer(target.id, updates);
  }

  // ==================== 公共 API ====================

  public updateLayerProps(layerId: string, props: Record<string, unknown>) {
    if (!this.canvas) return;
    const target = this.findObjectById(layerId);
    if (!target) return;

    const finalProps: Record<string, unknown> = { ...props, dirty: true };

    // fill 属性需要将 FillStyle 转换为 Fabric Gradient
    if (finalProps.fill !== undefined) {
      const w = (target as CustomTextbox).width ?? 100;
      const h = (target as CustomTextbox).height ?? 100;
      finalProps.fill = fillStyleToFabric(finalProps.fill as string | FillStyle, w, h);
    }
    if (props.height !== undefined) {
      finalProps._manualHeight = props.height;
    }

    target.set(finalProps);

    if (LAYOUT_KEYS.some((k) => props[k] !== undefined) && target instanceof Textbox) {
      target.initDimensions();
      if (target instanceof CustomTextbox && props.height === undefined) {
        target.autoFitHeight();
      }
      setTimeout(() => {
        const id = (target as CustomTextbox).id;
        if (id) {
          useEditorStore.getState().updateLayer(id, {
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

  public addTextLayer(layer: TextLayer): { x: number; y: number; width: number; height: number } | undefined {
    if (!this.canvas) return;

    const canvasW = this.canvas.getWidth();
    const maxTextW = canvasW * 0.9;

    // 先用足够大的宽度创建，让文字排成一行以便测量
    const node = CustomTextbox.fromLayer({ ...layer, width: maxTextW });
    node.initDimensions();

    // 测量文字自然宽度（一行所需的宽度）
    const naturalW = node.calcTextWidth();
    // 宽度：优先一行显示，超出画布 90% 则限制换行
    const finalW = Math.min(naturalW + 2, maxTextW);

    node.set({ width: finalW });
    node._manualHeight = undefined;
    node.initDimensions();

    const fontSize = node.fontSize ?? 12;
    const lineHeight = node.lineHeight ?? 1.2;
    const finalH = Math.max(node.calcTextHeight(), fontSize * lineHeight);
    node.set({ height: finalH });
    node._manualHeight = finalH;

    // 居中放置（使用 Fabric 内置方法，确保水平和垂直都居中）
    this.canvas.add(node as unknown as FabricObject);
    this.canvas.centerObject(node as unknown as FabricObject);
    node.setCoords();

    this.canvas.setActiveObject(node as unknown as FabricObject);
    this.canvas.renderAll();

    return { x: node.left ?? 0, y: node.top ?? 0, width: finalW, height: finalH };
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
    return useEditorStore.getState().currentPageId ?? undefined;
  }

  private findObjectById(id: string): FabricObject | undefined {
    return this.canvas?.getObjects().find((obj) => (obj as CustomTextbox).id === id);
  }
}

export const engineInstance = new EditorEngine();
