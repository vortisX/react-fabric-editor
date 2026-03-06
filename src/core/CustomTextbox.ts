import { Textbox, FabricObject } from 'fabric';
import type { TextLayer } from '../types/schema';
import { applyCustomControls } from './EditorUI';

// 暴露给外部的定制类型接口
export interface CustomTextbox extends Textbox {
  id?: string;
  boxStroke?: string;
  boxStrokeWidth?: number;
  boxStrokeDashArray?: number[];
  boxBackgroundColor?: string;
  boxBorderRadius?: number;
}

// 内部覆写专用接口
interface OverridableTextbox extends CustomTextbox {
  _render(ctx: CanvasRenderingContext2D): void;
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
    
    // ==========================================
    // 🎨 核心修复：实例级别强制覆写，绝对保底！
    // ==========================================
    transparentCorners: false,
    cornerColor: '#ffffff',
    cornerStrokeColor: '#18a0fb',
    borderColor: '#18a0fb',
    cornerSize: 8,
    padding: 0,
    cornerStyle: 'circle', // 焊死圆形！
    borderDashArray: undefined, 
  }) as unknown as CustomTextbox;

  textNode.set({
    id: layer.id,
    boxStroke: layer.stroke ?? '',
    boxStrokeWidth: layer.strokeWidth ?? 0,
    boxStrokeDashArray: layer.strokeDashArray,
    boxBackgroundColor: layer.textBackgroundColor ?? '',
    boxBorderRadius: layer.borderRadius ?? 0,
  });

  // 注入自研的极简胶囊 UI
  applyCustomControls(textNode as unknown as FabricObject);

  // 核心渲染器拦截：背景 -> 原生文字 -> 边框
  const overrideNode = textNode as unknown as OverridableTextbox;
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

    originalRender(ctx); 
    
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