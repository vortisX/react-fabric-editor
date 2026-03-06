import { Textbox, FabricObject } from 'fabric';
import type { TextLayer } from '../types/schema';
import { applyCustomControls } from './EditorUI';

/**
 * 自定义文本框：在 Fabric.js Textbox 基础上扩展
 * - 支持外框背景色、描边、圆角
 * - 文字超出边框自动裁剪
 * - 支持手动锁定高度 (_manualHeight)
 */
export class CustomTextbox extends Textbox {
  declare id: string;
  declare boxStroke: string;
  declare boxStrokeWidth: number;
  declare boxStrokeDashArray: number[] | undefined;
  declare boxBackgroundColor: string;
  declare boxBorderRadius: number;
  declare _manualHeight: number | undefined;

  /** 拦截尺寸计算，锁定用户指定的高度 */
  initDimensions() {
    super.initDimensions();
    if (this._manualHeight !== undefined) {
      this.height = this._manualHeight;
    }
  }

  /** 自定义渲染：背景 → 裁剪文字 → 描边 */
  _render(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;
    const r = this.boxBorderRadius ?? 0;

    // 背景填充
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
    super._render(ctx);
    ctx.restore();

    // 外框描边
    if (this.boxStroke && this.boxStrokeWidth > 0) {
      ctx.save();
      ctx.strokeStyle = this.boxStroke;
      ctx.lineWidth = this.boxStrokeWidth;
      if (this.boxStrokeDashArray) ctx.setLineDash(this.boxStrokeDashArray);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, r);
      else ctx.rect(-w / 2, -h / 2, w, h);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** 从 TextLayer schema 创建 CustomTextbox 实例 */
export function createCustomTextbox(layer: TextLayer): CustomTextbox {
  const textbox = new CustomTextbox(layer.content, {
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
  });

  textbox.set({
    id: layer.id,
    boxStroke: layer.stroke ?? '',
    boxStrokeWidth: layer.strokeWidth ?? 0,
    boxStrokeDashArray: layer.strokeDashArray,
    boxBackgroundColor: layer.textBackgroundColor ?? '',
    boxBorderRadius: layer.borderRadius ?? 0,
    _manualHeight: layer.height,
  });

  applyCustomControls(textbox as unknown as FabricObject);
  return textbox;
}