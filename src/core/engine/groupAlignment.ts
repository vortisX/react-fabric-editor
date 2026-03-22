import type { FabricObject } from "fabric";

import type { EditableFabricObject, FabricGroupLayer } from "./types";

/** 记录组合图层在画布上的包围盒左上角，用于重建前后对齐视觉位置。 */
export interface GroupBoundsSnapshot {
  left: number;
  top: number;
}

/** 记录对象在场景坐标系中的位置与角度，用于切换组编辑时保持子节点稳定。 */
export interface ObjectSceneSnapshot {
  left: number;
  top: number;
  angle: number;
}

/** 读取一组对象当前联合包围盒的左上角，供组合/重建后恢复视觉位置。 */
export const measureObjectsBounds = (
  objects: FabricObject[],
): GroupBoundsSnapshot | null => {
  if (objects.length === 0) return null;

  const boundsList = objects.map((object) => object.getBoundingRect());
  return {
    left: Math.min(...boundsList.map((bounds) => bounds.left)),
    top: Math.min(...boundsList.map((bounds) => bounds.top)),
  };
};

/** 对齐重建前后的组合包围盒左上角，避免 Group 切换形态时出现肉眼可见的跳动。 */
export const alignGroupObjectToBounds = (
  groupObject: FabricGroupLayer,
  bounds: GroupBoundsSnapshot,
): void => {
  const currentBounds = groupObject.getBoundingRect();
  groupObject.set({
    left: (groupObject.left ?? currentBounds.left) + bounds.left - currentBounds.left,
    top: (groupObject.top ?? currentBounds.top) + bounds.top - currentBounds.top,
  });
  groupObject.setCoords();
};

/** 记录一组对象当前的场景坐标，供进入组编辑后把新建子节点对齐回原位置。 */
export const captureObjectSceneSnapshots = (
  objects: EditableFabricObject[],
): Map<string, ObjectSceneSnapshot> => {
  const snapshots = new Map<string, ObjectSceneSnapshot>();

  objects.forEach((object) => {
    const objectId = object.id;
    if (!objectId) return;

    const point = object.getXY();
    snapshots.set(objectId, {
      left: point.x,
      top: point.y,
      angle: object.getTotalAngle(),
    });
  });

  return snapshots;
};

/** 把新创建的对象对齐回旧对象的场景坐标，避免进组或重建时整体漂移。 */
export const restoreObjectSceneSnapshots = (
  objects: EditableFabricObject[],
  snapshots: Map<string, ObjectSceneSnapshot>,
): void => {
  objects.forEach((object) => {
    const objectId = object.id;
    if (!objectId) return;

    const snapshot = snapshots.get(objectId);
    if (!snapshot) return;

    object.set({
      left: snapshot.left,
      top: snapshot.top,
      angle: snapshot.angle,
    });
    object.setCoords();
  });
};
