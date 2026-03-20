import { emitCommand } from "../../../../../store/editorStore.shared";
import { useEditorStore } from "../../../../../store/useEditorStore";

/** 更新组合图层名称。 */
export const renameGroupLayer = (layerId: string, name: string): void => {
  useEditorStore.getState().updateLayer(layerId, { name });
};

/** 拆分组合图层，恢复为同级节点。 */
export const ungroupLayer = (layerId: string): void => {
  useEditorStore.getState().ungroupLayer(layerId);
};

/** 在组内把子节点上移一层。 */
export const moveGroupChildUp = (layerId: string): void => {
  useEditorStore.getState().moveLayerUp(layerId);
};

/** 在组内把子节点下移一层。 */
export const moveGroupChildDown = (layerId: string): void => {
  useEditorStore.getState().moveLayerDown(layerId);
};

/** 主动进入指定组合的组内编辑。 */
export const enterGroupEditing = (groupId: string): void => {
  useEditorStore.setState((state) => ({
    ...emitCommand(state, {
      type: "group:edit-enter",
      groupId,
    }),
  }));
};

/** 退出当前最内层组内编辑。 */
export const exitGroupEditing = (): void => {
  useEditorStore.setState((state) => ({
    ...emitCommand(state, {
      type: "group:edit-exit",
    }),
  }));
};
