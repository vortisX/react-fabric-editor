import type { GroupLayer, Layer } from "../../types/schema";
import { normalizeGroupLayer } from "./groupGeometry";

/** 叶子图层只包含真正会映射到 Fabric 对象的文本层和图片层。 */
export type LeafLayer = Exclude<Layer, GroupLayer>;

/** 描述一个图层在树中的父级与同级位置，供重排/分组逻辑复用。 */
export interface LayerLocation {
  layer: Layer;
  parentId: string | null;
  index: number;
  siblings: Layer[];
}

/** 描述从根节点到某个图层的完整路径，便于回溯其祖先组合。 */
export interface LayerPathEntry {
  layer: Layer;
  parentId: string | null;
}

/** 判断某个图层节点是否为组合图层。 */
export const isGroupLayer = (layer: Layer): layer is GroupLayer =>
  layer.type === "group";

/** 在树中按 id 递归查找图层节点。 */
export const findLayerById = (
  layers: Layer[],
  layerId: string,
): Layer | undefined => {
  for (const layer of layers) {
    if (layer.id === layerId) return layer;
    if (!isGroupLayer(layer)) continue;

    const found = findLayerById(layer.children, layerId);
    if (found) return found;
  }

  return undefined;
};

/** 在树中定位图层的父级与索引位置。 */
export const findLayerLocation = (
  layers: Layer[],
  layerId: string,
  parentId: string | null = null,
): LayerLocation | null => {
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index >= 0) {
    return {
      layer: layers[index],
      parentId,
      index,
      siblings: layers,
    };
  }

  for (const layer of layers) {
    if (!isGroupLayer(layer)) continue;

    const found = findLayerLocation(layer.children, layerId, layer.id);
    if (found) return found;
  }

  return null;
};

/** 在树中查找某个图层的完整祖先路径。 */
export const findLayerPath = (
  layers: Layer[],
  layerId: string,
  parentId: string | null = null,
): LayerPathEntry[] | null => {
  for (const layer of layers) {
    if (layer.id === layerId) {
      return [{ layer, parentId }];
    }

    if (!isGroupLayer(layer)) continue;
    const childPath = findLayerPath(layer.children, layerId, layer.id);
    if (!childPath) continue;

    return [{ layer, parentId }, ...childPath];
  }

  return null;
};

/** 返回某个图层当前在画布上真正可被选中的节点 id，并兼容组内编辑态。 */
export const resolveSelectableLayerId = (
  layers: Layer[],
  layerId: string,
  editingGroupIds: string[] = [],
): string | null => {
  const path = findLayerPath(layers, layerId);
  if (!path?.length) return null;

  const editingGroupIdSet = new Set(editingGroupIds);
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const entry = path[index];
    if (entry.parentId === null || editingGroupIdSet.has(entry.parentId)) {
      return entry.layer.id;
    }
  }

  return path[path.length - 1]?.layer.id ?? null;
};

/** 判断某个节点分支中是否包含目标图层 id。 */
export const branchContainsLayerId = (
  layer: Layer,
  targetId: string,
): boolean => {
  if (layer.id === targetId) return true;
  if (!isGroupLayer(layer)) return false;
  return layer.children.some((child) => branchContainsLayerId(child, targetId));
};

/** 把指定父节点下的 children 替换成新数组，并保持其它分支引用稳定。 */
const replaceChildrenAtParent = (
  layers: Layer[],
  parentId: string | null,
  nextChildren: Layer[],
): Layer[] => {
  if (parentId === null) return nextChildren;

  let hasChanged = false;
  const nextLayers = layers.map((layer) => {
    if (!isGroupLayer(layer)) return layer;

    if (layer.id === parentId) {
      hasChanged = true;
      return { ...layer, children: nextChildren };
    }

    const nestedChildren = replaceChildrenAtParent(
      layer.children,
      parentId,
      nextChildren,
    );
    if (nestedChildren === layer.children) return layer;

    hasChanged = true;
    return { ...layer, children: nestedChildren };
  });

  return hasChanged ? nextLayers : layers;
};

/** 递归映射某个命中的图层节点。 */
const mapLayerById = (
  layers: Layer[],
  layerId: string,
  transform: (layer: Layer) => Layer,
): Layer[] | null => {
  let hasChanged = false;

  const nextLayers = layers.map((layer) => {
    if (layer.id === layerId) {
      hasChanged = true;
      return transform(layer);
    }

    if (!isGroupLayer(layer)) return layer;

    const nextChildren = mapLayerById(layer.children, layerId, transform);
    if (!nextChildren) return layer;

    hasChanged = true;
    return { ...layer, children: nextChildren };
  });

  return hasChanged ? nextLayers : null;
};

/** 递归映射某个命中分支，用于组级联锁定/显隐。 */
const mapLayerBranchById = (
  layers: Layer[],
  layerId: string,
  transform: (layer: Layer) => Layer,
): Layer[] | null => {
  let hasChanged = false;

  const applyBranchTransform = (layer: Layer): Layer => {
    const nextLayer = transform(layer);
    if (!isGroupLayer(nextLayer)) return nextLayer;

    return {
      ...nextLayer,
      children: nextLayer.children.map((child) => applyBranchTransform(child)),
    };
  };

  const nextLayers = layers.map((layer) => {
    if (layer.id === layerId) {
      hasChanged = true;
      return applyBranchTransform(layer);
    }

    if (!isGroupLayer(layer)) return layer;

    const nextChildren = mapLayerBranchById(layer.children, layerId, transform);
    if (!nextChildren) return layer;

    hasChanged = true;
    return { ...layer, children: nextChildren };
  });

  return hasChanged ? nextLayers : null;
};

/** 更新单个图层节点，不级联影响其子节点。 */
export const updateLayerById = (
  layers: Layer[],
  layerId: string,
  transform: (layer: Layer) => Layer,
): Layer[] | null => mapLayerById(layers, layerId, transform);

/** 更新整条图层分支，常用于组合图层的显隐/锁定级联。 */
export const updateLayerBranchById = (
  layers: Layer[],
  layerId: string,
  transform: (layer: Layer) => Layer,
): Layer[] | null => mapLayerBranchById(layers, layerId, transform);

/** 把树形图层展开为可渲染的叶子图层，并合并父级的锁定/显隐状态。 */
export const flattenRenderableLayers = (
  layers: Layer[],
  inheritedVisible = true,
  inheritedLocked = false,
): LeafLayer[] => {
  const result: LeafLayer[] = [];

  for (const layer of layers) {
    const nextVisible = inheritedVisible && (layer.visible ?? true);
    const nextLocked = inheritedLocked || (layer.locked ?? false);

    if (isGroupLayer(layer)) {
      result.push(
        ...flattenRenderableLayers(layer.children, nextVisible, nextLocked),
      );
      continue;
    }

    result.push({
      ...layer,
      visible: nextVisible,
      locked: nextLocked,
      lockMovement: nextLocked || layer.lockMovement,
    });
  }

  return result;
};

/** 收集树中全部组合图层 id，供默认展开和 UI 恢复使用。 */
export const collectGroupIds = (layers: Layer[]): string[] =>
  layers.flatMap((layer) =>
    isGroupLayer(layer)
      ? [layer.id, ...collectGroupIds(layer.children)]
      : [],
  );

/** 判断一组候选图层是否满足“同一父级且至少两个”的分组前置条件。 */
export const canGroupLayers = (
  layers: Layer[],
  layerIds: string[],
): boolean => {
  const uniqueIds = [...new Set(layerIds)];
  if (uniqueIds.length < 2) return false;

  const locations = uniqueIds.map((layerId) => findLayerLocation(layers, layerId));
  if (locations.some((item) => item === null)) return false;

  const parentId = locations[0]?.parentId ?? null;
  return locations.every((item) => item?.parentId === parentId);
};

/** 把同一父级下的多个图层打包成一个新的组合图层。 */
export const groupLayersInTree = (
  layers: Layer[],
  layerIds: string[],
  groupLayer: GroupLayer,
): { layers: Layer[]; groupId: string } | null => {
  if (!canGroupLayers(layers, layerIds)) return null;

  const uniqueIds = [...new Set(layerIds)];
  const locations = uniqueIds
    .map((layerId) => findLayerLocation(layers, layerId))
    .filter((item): item is LayerLocation => item !== null)
    .sort((left, right) => left.index - right.index);

  const parentId = locations[0]?.parentId ?? null;
  const siblings = locations[0]?.siblings ?? [];
  const selectedIds = new Set(uniqueIds);
  const insertIndex = locations[0]?.index ?? 0;
  const children = siblings.filter((layer) => selectedIds.has(layer.id));
  const nextSiblings = siblings.filter((layer) => !selectedIds.has(layer.id));
  nextSiblings.splice(
    insertIndex,
    0,
    normalizeGroupLayer({ ...groupLayer, children }),
  );

  return {
    layers: replaceChildrenAtParent(layers, parentId, nextSiblings),
    groupId: groupLayer.id,
  };
};

/** 把某个组合图层拆开，恢复为同级多个图层。 */
export const ungroupLayerInTree = (
  layers: Layer[],
  groupId: string,
): Layer[] | null => {
  const location = findLayerLocation(layers, groupId);
  if (!location || !isGroupLayer(location.layer)) return null;

  const nextSiblings = [...location.siblings];
  nextSiblings.splice(location.index, 1, ...location.layer.children);
  return replaceChildrenAtParent(layers, location.parentId, nextSiblings);
};

/** 把指定图层移动到目标父级和目标索引位置。 */
export const moveLayerInTree = (
  layers: Layer[],
  layerId: string,
  nextParentId: string | null,
  nextIndex: number,
): Layer[] | null => {
  const sourceLocation = findLayerLocation(layers, layerId);
  if (!sourceLocation) return null;

  if (nextParentId === layerId) return null;
  if (
    isGroupLayer(sourceLocation.layer) &&
    nextParentId !== null &&
    branchContainsLayerId(sourceLocation.layer, nextParentId)
  ) {
    return null;
  }

  const withoutSourceSiblings = [...sourceLocation.siblings];
  const [movingLayer] = withoutSourceSiblings.splice(sourceLocation.index, 1);
  const withoutSourceTree = replaceChildrenAtParent(
    layers,
    sourceLocation.parentId,
    withoutSourceSiblings,
  );

  const normalizedTargetParentId =
    nextParentId === sourceLocation.layer.id ? sourceLocation.parentId : nextParentId;
  const targetSiblings =
    normalizedTargetParentId === null
      ? withoutSourceTree
      : (
          findLayerById(withoutSourceTree, normalizedTargetParentId) as GroupLayer | undefined
        )?.children;

  if (!targetSiblings) return null;

  const adjustedIndex =
    normalizedTargetParentId === sourceLocation.parentId &&
    sourceLocation.index < nextIndex
      ? nextIndex - 1
      : nextIndex;
  const clampedIndex = Math.max(Math.min(adjustedIndex, targetSiblings.length), 0);
  const nextTargetSiblings = [...targetSiblings];
  nextTargetSiblings.splice(clampedIndex, 0, movingLayer);

  const nextTree = replaceChildrenAtParent(
    withoutSourceTree,
    normalizedTargetParentId,
    nextTargetSiblings,
  );

  const nextLocation = findLayerLocation(nextTree, layerId);
  if (
    nextLocation?.parentId === sourceLocation.parentId &&
    nextLocation.index === sourceLocation.index
  ) {
    return null;
  }

  return nextTree;
};

/** 在同一父级内把图层上移或下移一位。 */
export const moveLayerByStep = (
  layers: Layer[],
  layerId: string,
  step: -1 | 1,
): Layer[] | null => {
  const location = findLayerLocation(layers, layerId);
  if (!location) return null;

  const targetIndex = location.index + step;
  if (targetIndex < 0 || targetIndex >= location.siblings.length) return null;

  const nextSiblings = [...location.siblings];
  const [movingLayer] = nextSiblings.splice(location.index, 1);
  nextSiblings.splice(targetIndex, 0, movingLayer);

  return replaceChildrenAtParent(layers, location.parentId, nextSiblings);
};
