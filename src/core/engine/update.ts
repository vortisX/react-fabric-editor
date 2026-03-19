import { FabricImage, type Canvas, type FabricObject } from "fabric";

import type { ImageLayer } from "../../types/schema";
import { SCHEMA_TO_FABRIC } from "../constants";
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

const IMAGE_SCHEMA_MAP: Record<string, string> = {
  x: "left",
  y: "top",
  rotation: "angle",
};

const OMITTED_SCHEMA_KEYS = new Set([
  "id",
  "type",
  "name",
  "locked",
  "lockMovement",
]);

const mapSchemaPatchToFabricProps = (
  target: FabricObject,
  props: Record<string, unknown>,
): Record<string, unknown> => {
  const mappedProps: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(props)) {
    if (OMITTED_SCHEMA_KEYS.has(key)) continue;

    if (target instanceof FabricImage) {
      const fabricKey = IMAGE_SCHEMA_MAP[key] ?? key;
      mappedProps[fabricKey] = rawValue;
      continue;
    }

    const fabricKey = SCHEMA_TO_FABRIC[key] ?? key;
    mappedProps[fabricKey] =
      key === "letterSpacing" ? Number(rawValue ?? 0) * 10 : rawValue;
  }

  return mappedProps;
};

export const updateFabricLayerProps = ({
  canvas,
  target,
  props,
  readStoreLayer,
}: UpdateLayerPropsParams): void => {
  const mappedProps = mapSchemaPatchToFabricProps(target, props);

  if (target instanceof FabricImage) {
    void updateImageLayerProps({
      img: target as FabricImageLayer,
      props: mappedProps,
      readStoreLayer,
    }).then(() => {
      canvas.requestRenderAll();
    });
    return;
  }

  target.set(buildTextLayerProps(target, mappedProps));

  if (shouldHandleTextLayoutUpdate(target, mappedProps)) {
    handleTextLayoutUpdate(target, mappedProps);
  }

  canvas.requestRenderAll();
};
