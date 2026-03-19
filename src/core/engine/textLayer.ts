import { Textbox, type Canvas, type FabricObject } from "fabric";

import { useEditorStore } from "../../store/useEditorStore";
import type { FillStyle, TextLayer } from "../../types/schema";
import { CustomTextbox } from "../CustomTextbox";
import { fillStyleToFabric } from "./fill";
import { LAYOUT_KEYS } from "./helpers";
import type { LayerMeasurement } from "./types";

/** Create a Fabric textbox from the schema layer. */
export const createTextObject = (layer: TextLayer): CustomTextbox =>
  CustomTextbox.fromLayer(layer);

/** Build the final Fabric prop patch for a text layer update. */
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
    finalProps._manualHeight = props.height;
  }

  return finalProps;
};

/** Check whether a text layer patch requires a post-set layout pass. */
export const shouldHandleTextLayoutUpdate = (
  target: FabricObject,
  props: Record<string, unknown>,
): target is Textbox =>
  LAYOUT_KEYS.some((key) => props[key] !== undefined) && target instanceof Textbox;

/** Recalculate textbox dimensions and push the normalized size back to the store. */
export const handleTextLayoutUpdate = (
  target: Textbox,
  props: Record<string, unknown>,
): void => {
  target.initDimensions();

  if (target instanceof CustomTextbox && props.height === undefined) {
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

/** Add a text layer to the canvas and return the normalized placement result. */
export const addTextLayerToCanvas = (
  canvas: Canvas,
  layer: TextLayer,
  docWidth: number,
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

  canvas.add(node as unknown as FabricObject);
  canvas.viewportCenterObject(node as unknown as FabricObject);
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
