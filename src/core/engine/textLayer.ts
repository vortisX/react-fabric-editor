import { Textbox, type Canvas, type FabricObject } from "fabric";

import { useEditorStore } from "../../store/useEditorStore";
import type { FillStyle, TextLayer } from "../../types/schema";
import { CustomTextbox } from "../CustomTextbox";
import { fillStyleToFabric } from "./fill";
import { LAYOUT_KEYS } from "./helpers";
import type { LayerMeasurement } from "./types";

/** 根据 Schema 文本图层创建对应的 Fabric 文本框对象。 */
export const createTextObject = (layer: TextLayer): CustomTextbox =>
  CustomTextbox.fromLayer(layer);

/**
 * 构造文本图层更新时最终传给 Fabric 的属性补丁。
 * 这里会处理 fill 转换与 `_manualHeight` 这种 Fabric 外部扩展字段。
 */
export const buildTextLayerProps = (
  target: FabricObject,
  props: Record<string, unknown>,
): Record<string, unknown> => {
  const finalProps: Record<string, unknown> = { ...props, dirty: true };

  if (finalProps.fill !== undefined) {
    const width = (target as CustomTextbox).width ?? 100;
    const height = (target as CustomTextbox).height ?? 100;
    finalProps.fill = fillStyleToFabric(
      finalProps.fill as string | FillStyle,
      width,
      height,
    );
  }

  if (props.height !== undefined) {
    // 手动高度需要单独透传给 CustomTextbox，避免后续 autoFit 覆盖用户显式输入的高度。
    finalProps._manualHeight = props.height;
  }

  return finalProps;
};

/** 判断本次文本 patch 是否需要在 set 之后额外做一次布局重算。 */
export const shouldHandleTextLayoutUpdate = (
  target: FabricObject,
  props: Record<string, unknown>,
): target is Textbox =>
  LAYOUT_KEYS.some((key) => props[key] !== undefined) && target instanceof Textbox;

/**
 * 重新计算 Textbox 尺寸，并把标准化后的宽高回写到 Store。
 * 这样 UI 面板与导出 JSON 看到的始终是 Textbox 当前真实尺寸。
 */
export const handleTextLayoutUpdate = (
  target: Textbox,
  props: Record<string, unknown>,
): void => {
  target.initDimensions();

  if (target instanceof CustomTextbox && props.height === undefined) {
    // 当用户没有显式改高度时，文本框高度由内容自动撑开。
    target.autoFitHeight();
  }

  requestAnimationFrame(() => {
    const id = (target as CustomTextbox).id;
    if (!id) return;

    useEditorStore.getState().updateLayer(
      id,
      {
        width: target.width ?? 0,
        height: target.height ?? 0,
      },
      { commit: false, origin: "engine" },
    );
  });
};

/**
 * 把文本图层添加到画布中，并返回标准化后的落位结果。
 * 新建文本时会先按内容测量真实尺寸，再以文档中心作为默认落点。
 */
export const addTextLayerToCanvas = (
  canvas: Canvas,
  layer: TextLayer,
  docWidth: number,
  docHeight: number,
): LayerMeasurement | undefined => {
  const maxTextWidth = docWidth * 0.9;
  const node = createTextObject({ ...layer, width: maxTextWidth });
  node.initDimensions();

  const naturalWidth = node.calcTextWidth();
  const finalWidth = Math.min(naturalWidth + 2, maxTextWidth);

  node.set({ width: finalWidth });
  node._manualHeight = undefined;
  node.initDimensions();

  const fontSize = node.fontSize ?? 12;
  const lineHeight = node.lineHeight ?? 1.2;
  const finalHeight = Math.max(node.calcTextHeight(), fontSize * lineHeight);
  node.set({ height: finalHeight });
  node._manualHeight = finalHeight;

  node.set({
    left: (docWidth - finalWidth) / 2,
    top: (docHeight - finalHeight) / 2,
  });

  canvas.add(node as unknown as FabricObject);
  node.setCoords();

  canvas.setActiveObject(node as unknown as FabricObject);
  canvas.requestRenderAll();

  return {
    x: node.left ?? 0,
    y: node.top ?? 0,
    width: finalWidth,
    height: finalHeight,
  };
};
