import { FabricObject } from 'fabric';

// ==================== Schema 映射 ====================

/**
 * Schema 属性名 → Fabric 画布属性名的映射表
 * 未列出的属性名会直接透传（key 不变）
 */
export const SCHEMA_TO_FABRIC: Record<string, string> = {
  x: 'left',
  y: 'top',
  rotation: 'angle',
  content: 'text',
  letterSpacing: 'charSpacing',
  textBackgroundColor: 'boxBackgroundColor',
  stroke: 'boxStroke',
  strokeWidth: 'boxStrokeWidth',
  strokeDashArray: 'boxStrokeDashArray',
  borderRadius: 'boxBorderRadius',
};

// ==================== 全局样式 ====================

/** 全局控件皮肤样式 */
export const EDITOR_GLOBAL_STYLE: Partial<FabricObject> = {
  transparentCorners: false,
  cornerColor: '#ffffff',
  cornerStrokeColor: '#18a0fb',
  borderColor: '#18a0fb',
  cornerSize: 8,
  padding: 0,
  cornerStyle: 'circle',
  borderDashArray: null,
};

// ==================== SVG 光标相关 ====================

/** 最小化 SVG 编码，仅转义必要字符，避免 encodeURIComponent 导致的浏览器兼容问题 */
function svgToDataUri(svg: string): string {
  return svg.replace(/"/g, "'").replace(/#/g, '%23');
}

function svgCursor(svg: string, hx: number, hy: number, fallback: string): string {
  return `url("data:image/svg+xml,${svgToDataUri(svg)}") ${hx} ${hy}, ${fallback}`;
}

/** 生成指定角度的双向箭头 resize 光标 — 小箭头 + 长杆 */
function resizeSvg(angle: number): string {
  const d = 'M3 12 L7 8 V10.5 H17 V8 L21 12 L17 16 V13.5 H7 V16 Z';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" shape-rendering="geometricPrecision">` +
    `<path transform="rotate(${angle} 12 12)" d="${d}" fill="white" stroke="white" stroke-width="3" stroke-linejoin="round"/>` +
    `<path transform="rotate(${angle} 12 12)" d="${d}" fill="black"/>` +
    `</svg>`
  );
}

/** 生成指定角度的旋转光标 — 两个箭头 + 弧线连接 */
function rotateSvg(angle: number): string {
  const arrowTop = 'M4 5.5 L7.5 2 L7.5 9 Z';
  const arrowBot = 'M20 18.5 L16.5 22 L16.5 15 Z';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" shape-rendering="geometricPrecision">` +
    `<g transform="rotate(${angle} 12 12)">` +
    `<path d="M7 5.5 A7.5 7.5 0 0 1 17 5.5" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round"/>` +
    `<path d="M7 5.5 A7.5 7.5 0 0 1 17 5.5" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="${arrowTop}" fill="white" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="${arrowTop}" fill="black"/>` +
    `<path d="M17 18.5 A7.5 7.5 0 0 1 7 18.5" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round"/>` +
    `<path d="M17 18.5 A7.5 7.5 0 0 1 7 18.5" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="${arrowBot}" fill="white" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="${arrowBot}" fill="black"/>` +
    `</g>` +
    `</svg>`
  );
}

const ARROW_D = 'M4.5 2 Q4 1 4 2 L4 16 Q4 17.5 5 16.5 L8 13 Q8.5 12.2 9.5 12.2 L14 12 Q15.5 12 14 11 Z';
const ARROW_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" shape-rendering="geometricPrecision">` +
  `<path d="${ARROW_D}" transform="rotate(-15 4 1)" fill="white" stroke="white" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` +
  `<path d="${ARROW_D}" transform="rotate(-15 4 1)" fill="black"/>` +
  `</svg>`;

const MOVE_D = 'M12 2.5 L8.5 6 H10.5 V10.5 H6 V8.5 L2.5 12 L6 15.5 V13.5 H10.5 V18 H8.5 L12 21.5 L15.5 18 H13.5 V13.5 H18 V15.5 L21.5 12 L18 8.5 V10.5 H13.5 V6 H15.5 Z';
const MOVE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" shape-rendering="geometricPrecision">` +
  `<path d="${MOVE_D}" fill="white" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>` +
  `<path d="${MOVE_D}" fill="black"/>` +
  `</svg>`;

export const CURSORS = {
  default: svgCursor(ARROW_SVG, 7, 3, 'default'),
  move: svgCursor(MOVE_SVG, 16, 16, 'move'),
  /** 按象限 0-8 索引的 resize 光标（8 方向覆盖） */
  resize: [
    svgCursor(resizeSvg(0), 16, 16, 'ew-resize'),      // 0: e
    svgCursor(resizeSvg(45), 16, 16, 'nwse-resize'),    // 1: se
    svgCursor(resizeSvg(90), 16, 16, 'ns-resize'),      // 2: s
    svgCursor(resizeSvg(135), 16, 16, 'nesw-resize'),   // 3: sw
    svgCursor(resizeSvg(0), 16, 16, 'ew-resize'),       // 4: w
    svgCursor(resizeSvg(45), 16, 16, 'nwse-resize'),    // 5: nw
    svgCursor(resizeSvg(90), 16, 16, 'ns-resize'),      // 6: n
    svgCursor(resizeSvg(135), 16, 16, 'nesw-resize'),   // 7: ne
    svgCursor(resizeSvg(0), 16, 16, 'ew-resize'),       // 8: e (wrap)
  ] as const,
  /** 四角旋转光标：tl=135°, tr=225°, br=315°(≡-45°), bl=45° */
  rotateTL: svgCursor(rotateSvg(135), 16, 16, 'crosshair'),
  rotateTR: svgCursor(rotateSvg(225), 16, 16, 'crosshair'),
  rotateBR: svgCursor(rotateSvg(315), 16, 16, 'crosshair'),
  rotateBL: svgCursor(rotateSvg(45), 16, 16, 'crosshair'),
};

export const ROTATE_CORNER_CURSORS: Record<string, string> = {
  rotTL: CURSORS.rotateTL,
  rotTR: CURSORS.rotateTR,
  rotBR: CURSORS.rotateBR,
  rotBL: CURSORS.rotateBL,
};

/** 四角旋转配置，dx/dy 是该角落朝外的方向 */
export const ROT_CORNERS = [
  { key: 'rotTL', x: -0.5, y: -0.5, dx: -1, dy: -1 },
  { key: 'rotTR', x: 0.5, y: -0.5, dx: 1, dy: -1 },
  { key: 'rotBR', x: 0.5, y: 0.5, dx: 1, dy: 1 },
  { key: 'rotBL', x: -0.5, y: 0.5, dx: -1, dy: 1 },
] as const;

export const HIT_CENTER = 9;    // 各轴偏移
export const HIT_SIZE = 8;      // 碰撞区边长

// ==================== 主题色 / 画布配置 ====================

export const THEME_PRIMARY = '#18a0fb';
export const THEME_PANEL_BG = '#f5f5f5';

export const CANVAS_MIN_PX = 1;
export const CANVAS_MAX_PX = 9999;

export type CanvasUnit = 'px' | 'mm' | 'cm' | 'in';

export const PX_TO_MM = 0.264583;
export const MM_PER_CM = 10;
export const MM_PER_IN = 25.4;

export type CanvasPresetId =
  | 'custom'
  | 'square_1000'
  | 'xiaohongshu_3_4'
  | 'wechat_head'
  | 'wechat_sub_1_1'
  | 'a4'
  | 'a3'
  | 'a5'
  | 'photo_1_inch'
  | 'photo_2_inch';

export type CanvasPreset = {
  id: CanvasPresetId;
  label: string;
  width: number;
  height: number;
  unit: CanvasUnit;
};

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'custom', label: '自定义', width: 0, height: 0, unit: 'px' },
  { id: 'square_1000', label: '正方形 1000×1000 px', width: 1000, height: 1000, unit: 'px' },
  { id: 'xiaohongshu_3_4', label: '小红书配图（3:4）1242×1656 px', width: 1242, height: 1656, unit: 'px' },
  { id: 'wechat_head', label: '公众号首图 1800×766 px', width: 1800, height: 766, unit: 'px' },
  { id: 'wechat_sub_1_1', label: '公众号次图（1:1）1000×1000 px', width: 1000, height: 1000, unit: 'px' },
  { id: 'a4', label: 'A4 纸 210×297 px', width: 210, height: 297, unit: 'px' },
  { id: 'a3', label: 'A3 纸 297×420 px', width: 297, height: 420, unit: 'px' },
  { id: 'a5', label: 'A5 纸 148×210 px', width: 148, height: 210, unit: 'px' },
  { id: 'photo_1_inch', label: '证件照 1 寸 25×35 mm', width: 25, height: 35, unit: 'mm' },
  { id: 'photo_2_inch', label: '证件照 2 寸 35×49 mm', width: 35, height: 49, unit: 'mm' },
];
