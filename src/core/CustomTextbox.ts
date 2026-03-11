import { Textbox, FabricObject, Control, controlsUtils } from 'fabric';
import type { TextLayer } from '../types/schema';
import { fillStyleToFabric } from './engine';
import { applyCursorsToControls } from './cursors';

// ==================== 胶囊控制点渲染 ====================

const renderVerticalPill = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Record<string, unknown>,
  fabricObj: FabricObject,
): void => {
  ctx.save();
  ctx.translate(left, top);
  // 跟随对象旋转角度
  const angle = ((fabricObj.angle ?? 0) * Math.PI) / 180;
  ctx.rotate(angle);
  ctx.fillStyle =
    (styleOverride?.cornerColor as string) || fabricObj.cornerColor || '#ffffff';
  ctx.strokeStyle =
    (styleOverride?.cornerStrokeColor as string) || fabricObj.cornerStrokeColor || '#18a0fb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundedRect(ctx, -3, -7, 6, 14, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

// ==================== 控制点增强 ====================

function applyCustomControls(obj: FabricObject): void {
  const controls = obj.controls as Record<string, Control & { _isEnhanced?: boolean }>;
  if (!controls) return;

  const handleWidth = (eventData: unknown, transform: unknown, x: number, y: number) => {
    const changed = (controlsUtils.changeWidth as unknown as (a: unknown, b: unknown, c: number, d: number) => boolean)(
      eventData,
      transform,
      x,
      y,
    );
    const t = (transform as { target?: unknown })?.target;
    if (changed && t instanceof CustomTextbox) {
      t.initDimensions();
      t.autoFitHeight();
      t.canvas?.requestRenderAll();
    }
    return changed;
  };

  if (controls.mtr) controls.mtr.visible = false;
  if (controls.mt) controls.mt.visible = false;
  if (controls.mb) controls.mb.visible = false;

  if (controls.ml && !controls.ml._isEnhanced) {
    controls.ml.render = renderVerticalPill;
    controls.ml.actionHandler = handleWidth as unknown as Control['actionHandler'];
    controls.ml.actionName = 'resizing';
    controls.ml._isEnhanced = true;
  }
  if (controls.mr && !controls.mr._isEnhanced) {
    controls.mr.render = renderVerticalPill;
    controls.mr.actionHandler = handleWidth as unknown as Control['actionHandler'];
    controls.mr.actionName = 'resizing';
    controls.mr._isEnhanced = true;
  }
}

// ==================== 圆角矩形路径工具 ====================

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// ==================== 自定义文本框 ====================

export class CustomTextbox extends Textbox {
  declare id: string;
  declare boxStroke: string;
  declare boxStrokeWidth: number;
  declare boxStrokeDashArray: number[] | undefined;
  declare boxBackgroundColor: string;
  declare boxBorderRadius: number;
  declare _manualHeight: number | undefined;

  // ---------- 尺寸管理 ----------

  /** 拦截尺寸计算，锁定用户指定的高度 */
  initDimensions() {
    super.initDimensions();
    if (this._manualHeight !== undefined) {
      this.height = this._manualHeight;
    }
  }

  /**
   * 重写两端对齐逻辑：
   * 原版只拉伸空格、且跳过硬换行行。
   * 这里对所有行生效，无空格时将多余宽度均分到字符间隙，
   * 实现「第一个字贴左、最后一个字贴右、中间均匀分布」。
   */
  enlargeSpaces() {
    if (!this.textAlign.includes('justify')) return;
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      const line = this._textLines[i];
      const currentLineWidth = this.getLineWidth(i);
      if (currentLineWidth >= this.width || line.length <= 1) continue;

      const diff = this.width - currentLineWidth;
      const spaces = this.textLines[i].match(this._reSpacesAndTabs);

      if (spaces) {
        // 有空格：拉伸空格字符（原版逻辑）
        const diffSpace = diff / spaces.length;
        let acc = 0;
        for (let j = 0; j <= line.length; j++) {
          const cb = this.__charBounds[i][j];
          if (this._reSpaceAndTab.test(line[j])) {
            cb.width += diffSpace;
            cb.kernedWidth += diffSpace;
            cb.left += acc;
            acc += diffSpace;
          } else {
            cb.left += acc;
          }
        }
      } else {
        // 无空格（中文等 CJK）：均分到字符间隙
        // 第一个字符不加间距（贴左边），后续字符各加 perGap
        const gaps = line.length - 1;
        const perGap = diff / gaps;
        let acc = 0;
        for (let j = 0; j < line.length; j++) {
          const cb = this.__charBounds[i][j];
          cb.left += acc;
          if (j > 0) {
            cb.kernedWidth += perGap;
            acc += perGap;
          }
        }
      }
    }
  }

  /**
   * 重写渲染方法：对 justify + 无空格的行强制逐字渲染。
   * 原版会把无空格的整行合成一个字符串一次性绘制，
   * 导致 __charBounds 的间距修改不生效。
   */
  _renderChars(method: string, ctx: CanvasRenderingContext2D, line: string[], left: number, top: number, lineIndex: number): void {
    const isJustifyNoSpaces =
      this.textAlign.includes('justify') &&
      !this.charSpacing &&
      line.length > 1 &&
      !this.textLines[lineIndex]?.match(this._reSpacesAndTabs);

    if (isJustifyNoSpaces) {
      // 临时设置 charSpacing 使 _renderChars 逐字渲染
      const saved = this.charSpacing;
      this.charSpacing = 1e-8;
      // @ts-expect-error calling parent's protected method
      super._renderChars(method, ctx, line, left, top, lineIndex);
      this.charSpacing = saved;
    } else {
      // @ts-expect-error calling parent's protected method
      super._renderChars(method, ctx, line, left, top, lineIndex);
    }
  }

  /** 拖动中约束最小尺寸，不修改 fontSize / 不重置 scale */
  constrainScaling() {
    const fontSize = this.fontSize ?? 12;
    const lineHeight = this.lineHeight ?? 1.2;
    const scaleX = this.scaleX ?? 1;
    const scaleY = this.scaleY ?? 1;

    const visualW = (this.width ?? 0) * scaleX;
    const visualH = (this.height ?? 0) * scaleY;
    const minW = fontSize * scaleX;
    const minH = fontSize * lineHeight * scaleY;

    if (visualW < minW) this.scaleX = minW / (this.width ?? 1);
    if (visualH < minH) this.scaleY = minH / (this.height ?? 1);
  }

  /** 松手后将 scale 转换为真实尺寸，四角同步 fontSize */
  finalizeScaling(corner: string) {
    const scaleX = this.scaleX ?? 1;
    const scaleY = this.scaleY ?? 1;
    if (scaleX === 1 && scaleY === 1) return;

    const fontSize = this.fontSize ?? 12;
    const lineHeight = this.lineHeight ?? 1.2;
    const isCorner = ['tl', 'tr', 'bl', 'br'].includes(corner);

    const left = this.left;
    const top = this.top;

    const newWidth = (this.width ?? 0) * scaleX;
    const newHeight = (this.height ?? 0) * scaleY;
    let newFontSize = fontSize;

    if (isCorner) {
      const scale = (scaleX + scaleY) / 2;
      newFontSize = Math.max(fontSize * scale, 1);
    }

    const finalW = Math.max(newWidth, newFontSize);
    const finalH = Math.max(newHeight, newFontSize * lineHeight);

    // 必须在 set() 之前设置 _manualHeight，因为 Text.set() 在赋值属性后
    // 会因 fontSize 属于 textLayoutProperties 而触发 initDimensions()，
    // 如果此时 _manualHeight 为 undefined，height 会被 calcTextHeight() 覆盖为
    // 错误的值，导致后续拖动时 Y 轴偏移。
    this._manualHeight = finalH;
    this.set({ fontSize: newFontSize, width: finalW, scaleX: 1, scaleY: 1 });

    this.left = left;
    this.top = top;
    this.setCoords();
  }

  /** ml/mr 侧边拖动后自动适应文字高度 */
  autoFitHeight() {
    const fontSize = this.fontSize ?? 12;
    const lineHeight = this.lineHeight ?? 1.2;
    const autoHeight = Math.max(this.calcTextHeight(), fontSize * lineHeight);

    this.height = autoHeight;
    this._manualHeight = autoHeight;
    this.dirty = true;
    this.setCoords();
  }

  // ---------- 自定义渲染 ----------

  _render(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;
    const r = this.boxBorderRadius ?? 0;

    this.renderBoxBackground(ctx, w, h, r);
    this.renderClippedText(ctx, w, h);
    this.renderBoxStroke(ctx, w, h, r);
  }

  private renderBoxBackground(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
    if (!this.boxBackgroundColor) return;
    ctx.save();
    ctx.fillStyle = this.boxBackgroundColor;
    ctx.beginPath();
    drawRoundedRect(ctx, -w / 2, -h / 2, w, h, r);
    ctx.fill();
    ctx.restore();
  }

  private renderClippedText(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.clip();
    super._render(ctx);
    ctx.restore();
  }

  private renderBoxStroke(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
    if (!this.boxStroke || this.boxStrokeWidth <= 0) return;
    ctx.save();
    ctx.strokeStyle = this.boxStroke;
    ctx.lineWidth = this.boxStrokeWidth;
    if (this.boxStrokeDashArray) ctx.setLineDash(this.boxStrokeDashArray);
    ctx.beginPath();
    drawRoundedRect(ctx, -w / 2, -h / 2, w, h, r);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 工厂方法 ----------

  static fromLayer(layer: TextLayer): CustomTextbox {
    const fabricFill = fillStyleToFabric(layer.fill, layer.width, layer.height ?? 0);
    const textbox = new CustomTextbox(layer.content, {
      left: layer.x,
      top: layer.y,
      width: layer.width,
      angle: layer.rotation,
      fill: fabricFill,
      fontSize: layer.fontSize,
      fontFamily: layer.fontFamily,
      fontWeight: layer.fontWeight,
      textAlign: layer.textAlign,
      lineHeight: layer.lineHeight ?? 1.2,
      charSpacing: (layer.letterSpacing ?? 0) * 10,
      fontStyle: layer.fontStyle ?? 'normal',
      underline: layer.underline ?? false,
      linethrough: layer.linethrough ?? false,
      splitByGrapheme: true,
      snapAngle: 1,
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
    applyCursorsToControls(textbox as unknown as FabricObject);
    return textbox;
  }
}
