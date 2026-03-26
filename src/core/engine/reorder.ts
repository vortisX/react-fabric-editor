import { Group, type Canvas, type FabricObject } from "fabric";

import type { GroupLayer, Layer } from "../../types/schema";
import type { EditableFabricObject, FabricGroupLayer } from "./types";

interface FabricCollectionHost {
  getObjects: () => FabricObject[];
  remove: (...objects: FabricObject[]) => unknown;
  insertAt: (index: number, ...objects: FabricObject[]) => unknown;
}

const readObjectId = (object: FabricObject): string | null => {
  const id = (object as EditableFabricObject).id;
  return typeof id === "string" ? id : null;
};

const buildVisibleOrder = (
  layers: Layer[],
  editingGroupIdSet: ReadonlySet<string>,
): string[] => {
  const orderedIds: string[] = [];
  layers.forEach((layer) => {
    if (layer.type === "group" && editingGroupIdSet.has(layer.id)) {
      orderedIds.push(...buildVisibleOrder(layer.children, editingGroupIdSet));
      return;
    }
    orderedIds.push(layer.id);
  });
  return orderedIds;
};

const reorderCollectionByIds = (
  host: FabricCollectionHost,
  orderedIds: string[],
): boolean => {
  const currentObjects = host.getObjects();
  if (currentObjects.length <= 1) return false;

  const objectMap = new Map<string, FabricObject>();
  currentObjects.forEach((object) => {
    const objectId = readObjectId(object);
    if (!objectId) return;
    objectMap.set(objectId, object);
  });

  const orderedObjects: FabricObject[] = [];
  for (const id of orderedIds) {
    const object = objectMap.get(id);
    if (!object) return false;
    orderedObjects.push(object);
  }

  const orderedObjectSet = new Set(orderedObjects);
  const trailingObjects = currentObjects.filter(
    (object) => !orderedObjectSet.has(object),
  );
  const nextObjects = [...orderedObjects, ...trailingObjects];
  const hasChanged = nextObjects.some(
    (object, index) => object !== currentObjects[index],
  );
  if (!hasChanged) return false;

  host.remove(...currentObjects);
  nextObjects.forEach((object, index) => {
    host.insertAt(index, object);
    object.setCoords();
  });
  return true;
};

const syncClosedGroupChildrenOrder = (
  groupObject: FabricGroupLayer,
  groupLayer: GroupLayer,
): boolean => {
  let hasChanged = reorderCollectionByIds(
    groupObject as unknown as FabricCollectionHost,
    groupLayer.children.map((child) => child.id),
  );

  const childObjectMap = new Map<string, FabricObject>();
  groupObject.getObjects().forEach((object) => {
    const objectId = readObjectId(object);
    if (!objectId) return;
    childObjectMap.set(objectId, object);
  });

  groupLayer.children.forEach((childLayer) => {
    if (childLayer.type !== "group") return;
    const childObject = childObjectMap.get(childLayer.id);
    if (!(childObject instanceof Group)) return;
    hasChanged =
      syncClosedGroupChildrenOrder(
        childObject as unknown as FabricGroupLayer,
        childLayer,
      ) || hasChanged;
  });

  groupObject.setCoords();
  return hasChanged;
};

const syncExpandedBranchGroups = (
  layers: Layer[],
  topLevelObjectMap: ReadonlyMap<string, FabricObject>,
  editingGroupIdSet: ReadonlySet<string>,
): boolean => {
  let hasChanged = false;
  layers.forEach((layer) => {
    if (layer.type !== "group") return;
    if (editingGroupIdSet.has(layer.id)) {
      hasChanged =
        syncExpandedBranchGroups(
          layer.children,
          topLevelObjectMap,
          editingGroupIdSet,
        ) || hasChanged;
      return;
    }
    const groupObject = topLevelObjectMap.get(layer.id);
    if (!(groupObject instanceof Group)) return;
    hasChanged =
      syncClosedGroupChildrenOrder(
        groupObject as unknown as FabricGroupLayer,
        layer,
      ) || hasChanged;
  });
  return hasChanged;
};

export const reorderVisibleLayerObjects = (
  canvas: Canvas,
  layers: Layer[],
  editingGroupIds: string[],
): boolean => {
  const editingGroupIdSet = new Set(editingGroupIds);
  const orderedTopLevelIds = buildVisibleOrder(layers, editingGroupIdSet);

  const originalRenderOnAddRemove = canvas.renderOnAddRemove;
  canvas.renderOnAddRemove = false;

  let hasChanged = false;
  try {
    hasChanged =
      reorderCollectionByIds(
        canvas as unknown as FabricCollectionHost,
        orderedTopLevelIds,
      ) || hasChanged;

    const topLevelObjectMap = new Map<string, FabricObject>();
    canvas.getObjects().forEach((object) => {
      const objectId = readObjectId(object);
      if (!objectId) return;
      topLevelObjectMap.set(objectId, object);
    });

    hasChanged =
      syncExpandedBranchGroups(layers, topLevelObjectMap, editingGroupIdSet) ||
      hasChanged;
  } finally {
    canvas.renderOnAddRemove = originalRenderOnAddRemove;
  }

  return hasChanged;
};
