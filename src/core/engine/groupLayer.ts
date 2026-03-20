import { Group, Point, type FabricObject } from "fabric";

import { applyLayerControls } from "../layerControls";
import { normalizeGroupLayer } from "../groupGeometry";
import type { GroupLayer, ImageLayer, Layer, TextLayer } from "../../types/schema";
import { round1 } from "./helpers";
import { buildLayerInteractionProps } from "./interaction";
import type { FabricGroupLayer, FabricLayerTarget } from "./types";

interface CreateGroupObjectParams {
  layer: GroupLayer;
  createChildObject: (child: Layer) => Promise<FabricObject>;
}

interface ReadGroupSnapshotParams {
  target: FabricGroupLayer;
  readStoreLayer: (layerId: string) => Layer | undefined;
}

/** 判断 Fabric 节点是否为带 id 的组合对象。 */
const isFabricGroupLayer = (target: FabricObject): target is FabricGroupLayer =>
  target instanceof Group && typeof (target as FabricLayerTarget).id === "string";

/** 从 Fabric 对象读取当前总缩放。 */
const getAbsoluteScale = (target: FabricObject): { x: number; y: number } => {
  const scale = target.getObjectScaling();
  return {
    x: Math.abs(scale.x),
    y: Math.abs(scale.y),
  };
};

/** 从 Fabric 叶子对象生成标准化后的几何字段。 */
const readLeafGeometry = (target: FabricObject) => {
  const absolutePosition = target.getXY();
  const absoluteScale = getAbsoluteScale(target);

  return {
    x: round1(absolutePosition.x),
    y: round1(absolutePosition.y),
    width: round1((target.width ?? 0) * absoluteScale.x),
    height: round1((target.height ?? 0) * absoluteScale.y),
    rotation: Math.round(target.getTotalAngle()),
  };
};

/** 递归读取 Group 对象当前的边界与子节点几何，回写成 Schema。 */
const readGroupLayerSnapshot = ({
  target,
  readStoreLayer,
}: ReadGroupSnapshotParams): GroupLayer | null => {
  const storeLayer = readStoreLayer(target.id);
  if (!storeLayer || storeLayer.type !== "group") return null;
  const bounds = target.getBoundingRect();

  const children = target.getObjects().map((child) => {
    const childId = (child as FabricLayerTarget).id;
    if (!childId) return null;

    if (isFabricGroupLayer(child)) {
      return readGroupLayerSnapshot({ target: child, readStoreLayer });
    }

    const childStoreLayer = readStoreLayer(childId);
    if (!childStoreLayer || childStoreLayer.type === "group") return null;

    const geometry = readLeafGeometry(child);
    if (childStoreLayer.type === "text") {
      return {
        ...childStoreLayer,
        ...geometry,
        fontSize: round1((child as unknown as { fontSize?: number }).fontSize ?? 12),
      } as TextLayer;
    }

    return {
      ...childStoreLayer,
      ...geometry,
    } as ImageLayer;
  }).filter((child): child is Layer => child !== null);

  return normalizeGroupLayer({
    ...storeLayer,
    x: round1(bounds.left),
    y: round1(bounds.top),
    width: round1(bounds.width),
    height: round1(bounds.height),
    rotation: 0,
    children,
  });
};

/** 根据 Schema 组合图层递归创建对应的 Fabric Group 对象。 */
export const createGroupObject = async ({
  layer,
  createChildObject,
}: CreateGroupObjectParams): Promise<FabricGroupLayer> => {
  const normalizedLayer = normalizeGroupLayer(layer);
  const childObjects = await Promise.all(
    normalizedLayer.children.map((child) => createChildObject(child)),
  );
  const group = new Group(childObjects, {
    ...buildLayerInteractionProps({
      visible: normalizedLayer.visible ?? true,
      locked: normalizedLayer.locked ?? false,
    }),
    opacity: normalizedLayer.opacity ?? 1,
    subTargetCheck: false,
    objectCaching: false,
  }) as FabricGroupLayer;

  group.set({
    id: normalizedLayer.id,
    angle: 0,
    originX: "left",
    originY: "top",
    left: normalizedLayer.x,
    top: normalizedLayer.y,
  });
  group.setPositionByOrigin(
    new Point(normalizedLayer.x, normalizedLayer.y),
    "left",
    "top",
  );
  group.setCoords();
  applyLayerControls(group);
  return group;
};

/** 从 Fabric 组合对象读取当前整组几何快照。 */
export const readFabricGroupSnapshot = (
  target: FabricGroupLayer,
  readStoreLayer: (layerId: string) => Layer | undefined,
): GroupLayer | null =>
  readGroupLayerSnapshot({
    target,
    readStoreLayer,
  });
