import { FabricImage, type Canvas, type FabricObject } from "fabric";

import type { ImageLayer } from "../../types/schema";
import {
  buildTextLayerProps,
  handleTextLayoutUpdate,
  shouldHandleTextLayoutUpdate,
  updateImageLayerProps,
} from "./layers";
import type { FabricImageLayer } from "./types";

interface UpdateLayerPropsParams {
  canvas: Canvas;
  target: FabricObject;
  props: Record<string, unknown>;
  readStoreLayer: () => ImageLayer | undefined;
}

export const updateFabricLayerProps = ({
  canvas,
  target,
  props,
  readStoreLayer,
}: UpdateLayerPropsParams): void => {
  if (target instanceof FabricImage) {
    const nextProps = { ...props };

    if (nextProps.width !== undefined) {
      nextProps.scaleX = (nextProps.width as number) / (target.width ?? 1);
      delete nextProps.width;
    }
    if (nextProps.height !== undefined) {
      nextProps.scaleY = (nextProps.height as number) / (target.height ?? 1);
      delete nextProps.height;
    }
    if (nextProps.rotation !== undefined) {
      nextProps.angle = nextProps.rotation;
      delete nextProps.rotation;
    }

    updateImageLayerProps({
      img: target as FabricImageLayer,
      props: nextProps,
      readStoreLayer,
    });
    canvas.requestRenderAll();
    return;
  }

  target.set(buildTextLayerProps(target, props));

  if (shouldHandleTextLayoutUpdate(target, props)) {
    handleTextLayoutUpdate(target, props);
  }

  canvas.requestRenderAll();
};
