import { Textbox, FabricObject } from 'fabric';
import type { TextLayer } from '../types/schema';
import { applyCustomControls } from './EditorUI';

export interface CustomTextbox extends Textbox {
  id?: string;
  boxStroke?: string;
  boxStrokeWidth?: number;
  boxStrokeDashArray?: number[];
  boxBackgroundColor?: string;
  boxBorderRadius?: number;
  _manualHeight?: number; // 核心新增：记录用户手动拖拽或输入的高度
}

interface OverridableTextbox extends CustomTextbox {
  _render(ctx: CanvasRenderingContext2D): void;
  initDimensions(): void; // 拦截尺寸初始化
}

export const createCustomTextbox = (layer: TextLayer): CustomTextbox => {
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
    splitByGrapheme: true,
    
    transparentCorners: false,
    cornerColor: '#ffffff',
    cornerStrokeColor: '#18a0fb',
    borderColor: '#18a0fb',
    cornerSize: 8,
    padding: 0,
    cornerStyle: 'circle',
    borderDashArray: undefined, 
  }) as unknown as CustomTextbox;

  textNode.set({
    id: layer.id,
    boxStroke: layer.stroke ?? '',
    boxStrokeWidth: layer.strokeWidth ?? 0,
    boxStrokeDashArray: layer.strokeDashArray,
    boxBackgroundColor: layer.textBackgroundColor ?? '',
    boxBorderRadius: layer.borderRadius ?? 0,
    _manualHeight: layer.height, // 加载时恢复手动高度
  });

  applyCustomControls(textNode as unknown as FabricObject);

  const overrideNode = textNode as unknown as OverridableTextbox;
  
  // === 核心修复：拦截尺寸计算，强行锁死用户指定的高度！ ===
  const originalInitDimensions = overrideNode.initDimensions.bind(overrideNode);
  overrideNode.initDimensions = function() {
    originalInitDimensions(); // 先让原生算完文字真实高度
    if (this._manualHeight !== undefined) {
      this.height = this._manualHeight; // 强行覆写为外框手动高度！
    }
  };

  const originalRender = overrideNode._render.bind(overrideNode);
  overrideNode._render = function(this: OverridableTextbox, ctx: CanvasRenderingContext2D) {
    const w = this.width ?? 0;
    const h = this.height ?? 0;
    const r = this.boxBorderRadius ?? 0;

    if (this.boxBackgroundColor) {
      ctx.save();
      ctx.fillStyle = this.boxBackgroundColor;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, r);
      else ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill();
      ctx.restore();
    }

    // 裁剪文字渲染区域，防止文字超出边框
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.clip();
    originalRender(ctx);
    ctx.restore(); 
    
    const strokeColor = this.boxStroke;
    const strokeWidth = this.boxStrokeWidth;
    
    if (strokeColor && strokeWidth && strokeWidth > 0) {
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      if (this.boxStrokeDashArray) ctx.setLineDash(this.boxStrokeDashArray);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, r);
      else ctx.rect(-w / 2, -h / 2, w, h);
      ctx.stroke();
      ctx.restore();
    }
  };

  return textNode;
};