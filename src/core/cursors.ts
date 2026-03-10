import { FabricObject, Control, controlsUtils } from 'fabric';

// ==================== SVG 光标（Figma 风格：黑色 + 白色描边） ====================

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
    // 上半弧 + 箭头
    `<path d="M7 5.5 A7.5 7.5 0 0 1 17 5.5" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round"/>` +
    `<path d="M7 5.5 A7.5 7.5 0 0 1 17 5.5" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="${arrowTop}" fill="white" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="${arrowTop}" fill="black"/>` +
    // 下半弧 + 箭头
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

// ==================== 导出光标值 ====================

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

// ==================== 象限计算 ====================

/**
 * 根据控制点的名义位置 (control.x, control.y) 和对象旋转角度确定象限。
 * 不使用屏幕坐标，避免宽扁矩形导致四角被判定为水平方向的问题。
 */
function findControlQuadrant(fabricObject: FabricObject, control: Control): number {
  const angle = Math.atan2(control.y, control.x);
  const rotation = ((fabricObject.angle ?? 0) * Math.PI) / 180;
  const total = angle + rotation + Math.PI * 2;
  return Math.round((total % (Math.PI * 2)) / (Math.PI / 4)) % 8;
}

// ==================== 自定义光标处理器 ====================

/** 缩放 / 侧边控制点的光标处理器 */
function customCursorHandler(
  _eventData: Event,
  control: Control,
  fabricObject: FabricObject,
): string {
  const n = findControlQuadrant(fabricObject, control);
  return CURSORS.resize[n];
}

/** 四角旋转光标映射 */
const ROTATE_CORNER_CURSORS: Record<string, string> = {
  rotTL: CURSORS.rotateTL,
  rotTR: CURSORS.rotateTR,
  rotBR: CURSORS.rotateBR,
  rotBL: CURSORS.rotateBL,
};

/** 旋转控制点的光标处理器（根据控制点名称返回对应角度的旋转光标） */
function customRotateCursorHandler(
  _eventData: Event,
  control: Control,
  _fabricObject: FabricObject,
): string {
  // 通过在 controls 中查找匹配 control 引用来确定 key
  const obj = _fabricObject;
  const controls = obj.controls as Record<string, Control>;
  for (const key of Object.keys(controls)) {
    if (controls[key] === control && ROTATE_CORNER_CURSORS[key]) {
      return ROTATE_CORNER_CURSORS[key];
    }
  }
  return CURSORS.rotateTL;
}

// ==================== Figma 风格四角旋转控制点 ====================

/** 四角旋转配置，dx/dy 是该角落朝外的方向 */
const ROT_CORNERS = [
  { key: 'rotTL', x: -0.5, y: -0.5, dx: -1, dy: -1 },
  { key: 'rotTR', x: 0.5, y: -0.5, dx: 1, dy: -1 },
  { key: 'rotBR', x: 0.5, y: 0.5, dx: 1, dy: 1 },
  { key: 'rotBL', x: -0.5, y: 0.5, dx: -1, dy: 1 },
] as const;

const HIT_CENTER = 9;    // 各轴偏移
const HIT_SIZE = 8;      // 碰撞区边长

/** 在四角外侧添加旋转控制点 */
function addCornerRotateControls(obj: FabricObject): void {
  const controls = obj.controls as Record<string, Control>;
  if (!controls || controls.rotTL) return;

  const rotHandler = controlsUtils.rotationWithSnapping;

  for (const c of ROT_CORNERS) {
    controls[c.key] = new Control({
      x: c.x,
      y: c.y,
      offsetX: c.dx * HIT_CENTER,
      offsetY: c.dy * HIT_CENTER,
      actionName: 'rotate',
      actionHandler: rotHandler,
      cursorStyleHandler: customRotateCursorHandler,
      render: () => {},
      sizeX: HIT_SIZE,
      sizeY: HIT_SIZE,
    });
  }
}

/** 给控件设置自定义光标处理器 + 添加四角旋转 */
export function applyCursorsToControls(obj: FabricObject): void {
  const controls = obj.controls as Record<string, Control>;
  if (!controls) return;

  for (const key of ['tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb']) {
    if (controls[key]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (controls[key] as any).cursorStyleHandler = customCursorHandler;
    }
  }

  // 隐藏默认 mtr 旋转控制点
  if (controls.mtr) {
    controls.mtr.visible = false;
  }

  // 在四角外侧添加 Figma 风格旋转控制点
  addCornerRotateControls(obj);
}
