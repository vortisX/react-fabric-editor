import { FabricObject, Control } from 'fabric';

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
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">` +
    `<path transform="rotate(${angle} 12 12)" ` +
    `d="M3 12 L7 8 V10.5 H17 V8 L21 12 L17 16 V13.5 H7 V16 Z" ` +
    `fill="black" stroke="white" stroke-width="1.5" stroke-linejoin="round" paint-order="stroke"/>` +
    `</svg>`
  );
}

const ARROW_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">` +
  `<path d="M4.5 2 Q4 1 4 2 L4 16 Q4 17.5 5 16.5 L8 13 Q8.5 12.2 9.5 12.2 L14 12 Q15.5 12 14 11 Z" transform="rotate(-15 4 1)" ` +
  `fill="black" stroke="white" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"/>` +
  `</svg>`;

const MOVE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">` +
  `<path d="M12 2.5 L8.5 6 H10.5 V10.5 H6 V8.5 L2.5 12 L6 15.5 V13.5 H10.5 V18 H8.5 L12 21.5 L15.5 18 H13.5 V13.5 H18 V15.5 L21.5 12 L18 8.5 V10.5 H13.5 V6 H15.5 Z" ` +
  `fill="black" stroke="white" stroke-width="1.3" stroke-linejoin="round" paint-order="stroke"/>` +
  `</svg>`;

const ROTATE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">` +
  `<path d="M14.5 4.5 A7.5 7.5 0 1 0 19.5 12" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/>` +
  `<path d="M14.5 4.5 A7.5 7.5 0 1 0 19.5 12" fill="none" stroke="black" stroke-width="2" stroke-linecap="round"/>` +
  `<path d="M14.5 1.5 L14.5 7.5 L19.5 4.5 Z" ` +
  `fill="black" stroke="white" stroke-width="1.3" stroke-linejoin="round" paint-order="stroke"/>` +
  `</svg>`;

// ==================== 导出光标值 ====================

export const CURSORS = {
  default: svgCursor(ARROW_SVG, 5, 2, 'default'),
  move: svgCursor(MOVE_SVG, 12, 12, 'move'),
  rotate: svgCursor(ROTATE_SVG, 12, 12, 'crosshair'),
  /** 按象限 0-8 索引的 resize 光标（8 方向覆盖） */
  resize: [
    svgCursor(resizeSvg(0), 12, 12, 'ew-resize'),      // 0: e
    svgCursor(resizeSvg(45), 12, 12, 'nwse-resize'),    // 1: se
    svgCursor(resizeSvg(90), 12, 12, 'ns-resize'),      // 2: s
    svgCursor(resizeSvg(135), 12, 12, 'nesw-resize'),   // 3: sw
    svgCursor(resizeSvg(0), 12, 12, 'ew-resize'),       // 4: w
    svgCursor(resizeSvg(45), 12, 12, 'nwse-resize'),    // 5: nw
    svgCursor(resizeSvg(90), 12, 12, 'ns-resize'),      // 6: n
    svgCursor(resizeSvg(135), 12, 12, 'nesw-resize'),   // 7: ne
    svgCursor(resizeSvg(0), 12, 12, 'ew-resize'),       // 8: e (wrap)
  ] as const,
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

/** 旋转控制点的光标处理器 */
function customRotateCursorHandler(): string {
  return CURSORS.rotate;
}

/** 给控件设置自定义光标处理器 */
export function applyCursorsToControls(obj: FabricObject): void {
  const controls = obj.controls as Record<string, Control>;
  if (!controls) return;

  for (const key of ['tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb']) {
    if (controls[key]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (controls[key] as any).cursorStyleHandler = customCursorHandler;
    }
  }

  if (controls.mtr) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (controls.mtr as any).cursorStyleHandler = customRotateCursorHandler;
  }
}
