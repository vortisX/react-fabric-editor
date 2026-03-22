import { type FabricObject } from "fabric";

import type { BaseLayer } from "../../types/schema";
import { CustomTextbox } from "../text/CustomTextbox";

/** 把 Schema 中的显隐/锁定状态转换成 Fabric 交互属性。 */
export const buildLayerInteractionProps = ({
  visible,
  locked,
}: Pick<BaseLayer, "visible" | "locked">): Record<string, unknown> => ({
  visible,
  selectable: visible,
  evented: visible,
  hasControls: visible && !locked,
  lockMovementX: locked,
  lockMovementY: locked,
  lockScalingX: locked,
  lockScalingY: locked,
  lockRotation: locked,
});

/** 把显隐/锁定状态真正应用到 Fabric 对象实例。 */
export const applyLayerInteractionState = (
  target: FabricObject,
  state: Pick<BaseLayer, "visible" | "locked">,
): void => {
  target.set(buildLayerInteractionProps(state));

  if (target instanceof CustomTextbox) {
    target.set({ editable: state.visible && !state.locked });
  }
};
