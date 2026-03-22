import type { Canvas } from "fabric";

import { useEditorStore } from "../../store/useEditorStore";
import { createGroupObject } from "./groupLayer";
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

interface GroupBoundsSnapshot {
  left: number;
  top: number;
}

/** 把当前编辑栈同步到 Store，供图层树等 UI 判断“哪一层已被展开到画布顶层”。 */
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

/** 对齐重建前后的组合包围盒左上角，避免 Group 归一化后出现肉眼可见的跳动。 */
const alignGroupObjectToBounds = (
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
  const childObjects = await createEditingChildObjects(groupId);

  canvas.remove(currentGroupObject);
  childObjects.forEach((object, index) => {
    canvas.insertAt(insertIndex + index, object);
    object.setCoords();
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

    canvas.insertAt(currentEntry.insertIndex, groupObject as FabricGroupLayer);
    groupObject.setCoords();
    if (shouldSelectGroup) {
      canvas.setActiveObject(groupObject);
    }
  }

  canvas.requestRenderAll();

  const nextStack = stack.slice(0, -1);
  syncEditingGroupIds(nextStack);
  return nextStack;
};

/** 用 Store 中的标准化快照重建当前可见组合对象，避免多次缩放后残留 scale 误差。 */
export const normalizeVisibleGroupObject = async ({
  canvas,
  groupId,
  preserveSelection,
}: NormalizeGroupObjectParams): Promise<void> => {
  const groupLayer = readGroupLayer(groupId);
  const currentGroup = findTopLevelObjectById(canvas, groupId);
  if (!groupLayer || !isTopLevelGroupObject(currentGroup)) return;

  const objectIndex = canvas.getObjects().indexOf(currentGroup);
  const shouldReselect =
    preserveSelection && canvas.getActiveObject() === currentGroup;
  const parentEditingGroupId = currentGroup.editingParentGroupId;
  const previousBounds = currentGroup.getBoundingRect();
  canvas.remove(currentGroup);

  const normalizedGroup = await createGroupObject({
    layer: groupLayer,
    createChildObject: createFabricObjectFromLayer,
  });
  normalizedGroup.editingParentGroupId = parentEditingGroupId;
  alignGroupObjectToBounds(normalizedGroup, {
    left: previousBounds.left,
    top: previousBounds.top,
  });
  canvas.insertAt(objectIndex, normalizedGroup as FabricGroupLayer);

  if (shouldReselect) {
    canvas.setActiveObject(normalizedGroup);
  }

  canvas.requestRenderAll();
};
