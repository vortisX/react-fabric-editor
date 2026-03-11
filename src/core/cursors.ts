import { FabricObject, Control, controlsUtils } from 'fabric';
import {
  CURSORS,
  ROTATE_CORNER_CURSORS,
  ROT_CORNERS,
  HIT_CENTER,
  HIT_SIZE,
} from './constants';



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
      const control = controls[key] as Control & { cursorStyleHandler?: typeof customCursorHandler };
      control.cursorStyleHandler = customCursorHandler;
    }
  }

  // 隐藏默认 mtr 旋转控制点
  if (controls.mtr) {
    controls.mtr.visible = false;
  }

  // 在四角外侧添加 Figma 风格旋转控制点
  addCornerRotateControls(obj);
}
