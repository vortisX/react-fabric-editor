import type { Canvas } from "fabric";

import { useEditorStore } from "../../store/useEditorStore";
import { createGroupObject } from "./groupLayer";
import {
  alignGroupObjectToBounds,
  captureObjectSceneSnapshots,
  measureObjectsBounds,
  restoreObjectSceneSnapshots,
} from "./groupAlignment";
import { createFabricObjectFromLayer } from "./layers";
import {
  findEditingChildren,
  findTopLevelObjectById,
  isTopLevelGroupObject,
  readGroupLayer,
} from "./queries";
import type { EditableFabricObject, FabricGroupLayer } from "./types";

/** 记录一层组内编辑上下文，保证嵌套组能逐层进入与退出。 */
export interface GroupEditingEntry {
  groupId: string;
  insertIndex: number;
  parentGroupId: string | null;
}

interface EnterGroupEditingParams {
  canvas: Canvas;
  groupId: string;
  stack: GroupEditingEntry[];
}

interface ExitGroupEditingParams {
  canvas: Canvas;
  shouldSelectGroup: boolean;
  stack: GroupEditingEntry[];
}

interface NormalizeGroupObjectParams {
  canvas: Canvas;
  groupId: string;
  preserveSelection: boolean;
}

/** 把当前编辑栈同步到 Store，供图层树等 UI 判断哪一层已被展开到画布顶层。 */
const syncEditingGroupIds = (stack: GroupEditingEntry[]): void => {
  useEditorStore.setState({
    editingGroupIds: stack.map((entry) => entry.groupId),
  });
};

/** 为进入组内编辑临时创建顶层子对象，并标记它们的直接编辑父组。 */
const createEditingChildObjects = async (
  groupId: string,
): Promise<EditableFabricObject[]> => {
  const groupLayer = readGroupLayer(groupId);
  if (!groupLayer) return [];

  const childObjects = await Promise.all(
    groupLayer.children.map((child) => createFabricObjectFromLayer(child)),
  );

  return childObjects.map((object) => {
    const editableObject = object as EditableFabricObject;
    editableObject.editingParentGroupId = groupId;
    return editableObject;
  });
};

/** 清空全部组编辑上下文，常用于整文档重载或引擎销毁。 */
export const resetGroupEditingState = (): void => {
  syncEditingGroupIds([]);
};

/** 把某个组合节点展开为当前画布顶层子对象，并返回新的嵌套编辑栈。 */
export const enterGroupEditing = async ({
  canvas,
  groupId,
  stack,
}: EnterGroupEditingParams): Promise<GroupEditingEntry[]> => {
  const groupLayer = readGroupLayer(groupId);
  const currentGroupObject = findTopLevelObjectById(canvas, groupId);
  if (!groupLayer || !isTopLevelGroupObject(currentGroupObject)) {
    return stack;
  }

  const insertIndex = canvas.getObjects().indexOf(currentGroupObject);
  if (insertIndex < 0) return stack;

  const nextEntry: GroupEditingEntry = {
    groupId,
    insertIndex,
    parentGroupId: stack[stack.length - 1]?.groupId ?? null,
  };
  const childSnapshots = captureObjectSceneSnapshots(
    currentGroupObject.getObjects() as EditableFabricObject[],
  );
  const childObjects = await createEditingChildObjects(groupId);
  restoreObjectSceneSnapshots(childObjects, childSnapshots);

  canvas.remove(currentGroupObject);
  childObjects.forEach((object, index) => {
    canvas.insertAt(insertIndex + index, object);
  });
  canvas.discardActiveObject();
  canvas.requestRenderAll();
  useEditorStore.getState().setActiveLayer(groupId, "engine");

  const nextStack = [...stack, nextEntry];
  syncEditingGroupIds(nextStack);
  return nextStack;
};

/** 退出当前最内层组编辑，并按最新 Store 快照把该组重新装配回画布。 */
export const exitCurrentGroupEditing = async ({
  canvas,
  shouldSelectGroup,
  stack,
}: ExitGroupEditingParams): Promise<GroupEditingEntry[]> => {
  const currentEntry = stack[stack.length - 1];
  if (!currentEntry) return stack;

  const editingChildren = findEditingChildren(canvas, currentEntry.groupId);
  const editingBounds = measureObjectsBounds(editingChildren);
  if (editingChildren.length > 0) {
    canvas.remove(...editingChildren);
  }

  const groupLayer = readGroupLayer(currentEntry.groupId);
  if (groupLayer) {
    const groupObject = await createGroupObject({
      layer: groupLayer,
      createChildObject: createFabricObjectFromLayer,
    });

    if (currentEntry.parentGroupId) {
      (groupObject as EditableFabricObject).editingParentGroupId =
        currentEntry.parentGroupId;
    }

    if (editingBounds) {
      alignGroupObjectToBounds(groupObject, editingBounds);
    }
    canvas.insertAt(currentEntry.insertIndex, groupObject as FabricGroupLayer);
    if (shouldSelectGroup) {
      canvas.setActiveObject(groupObject);
    }
  }

  canvas.requestRenderAll();

  const nextStack = stack.slice(0, -1);
  syncEditingGroupIds(nextStack);
  return nextStack;
};

/** 用 Store 中标准化后的 group 快照重建当前可见组合对象，避免多次缩放后残留 scale 误差。 */
export const normalizeVisibleGroupObject = async ({
  canvas,
  groupId,
  preserveSelection,
}: NormalizeGroupObjectParams): Promise<void> => {
  const groupLayer = readGroupLayer(groupId);
  const currentGroup = findTopLevelObjectById(canvas, groupId);
  if (!groupLayer || !isTopLevelGroupObject(currentGroup)) return;

  const normalizedGroup = await createGroupObject({
    layer: groupLayer,
    createChildObject: createFabricObjectFromLayer,
  });

  const latestGroup = findTopLevelObjectById(canvas, groupId);
  if (!isTopLevelGroupObject(latestGroup)) return;

  const objectIndex = canvas.getObjects().indexOf(latestGroup);
  const shouldReselect =
    preserveSelection && canvas.getActiveObject() === latestGroup;
  const parentEditingGroupId = latestGroup.editingParentGroupId;
  const previousBounds = latestGroup.getBoundingRect();
  normalizedGroup.editingParentGroupId = parentEditingGroupId;
  alignGroupObjectToBounds(normalizedGroup, {
    left: previousBounds.left,
    top: previousBounds.top,
  });
  canvas.remove(latestGroup);
  canvas.insertAt(objectIndex, normalizedGroup as FabricGroupLayer);

  if (shouldReselect) {
    canvas.setActiveObject(normalizedGroup);
  }

  canvas.requestRenderAll();
};

