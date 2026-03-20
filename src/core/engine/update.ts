import { FabricImage, Group, type Canvas, type FabricObject } from "fabric";

import type { ImageLayer } from "../../types/schema";
import { SCHEMA_TO_FABRIC } from "../constants";
import {
  buildTextLayerProps,
  handleTextLayoutUpdate,
  shouldHandleTextLayoutUpdate,
  updateImageLayerProps,
} from "./layers";
import { applyLayerInteractionState } from "./interaction";
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
  "lockMovement",
]);

/**
 * 把 Schema 层 patch 映射成 Fabric 可识别的属性补丁。
 * 文本和图片在字段命名上存在差异，因此这里按对象类型分别处理。
 */
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
    // Fabric 的 charSpacing 单位是 1/1000 em，而 Schema 里按更直观的字距值保存，因此这里做一次换算。
    mappedProps[fabricKey] =
      key === "letterSpacing" ? Number(rawValue ?? 0) * 10 : rawValue;
  }

  return mappedProps;
};

/**
 * 把来自 Store 的图层属性更新应用到 Fabric 对象。
 * 图片与文本走不同分支：图片需要异步归一尺寸/滤镜，文本则需要额外处理布局。
 */
export const updateFabricLayerProps = ({
  canvas,
  target,
  props,
  readStoreLayer,
}: UpdateLayerPropsParams): void => {
  const nextVisible =
    props.visible === undefined ? undefined : Boolean(props.visible);
  const nextLocked =
    props.locked === undefined ? undefined : Boolean(props.locked);
  const mappedProps = mapSchemaPatchToFabricProps(target, props);

  if (nextVisible !== undefined || nextLocked !== undefined) {
    applyLayerInteractionState(target, {
      visible: nextVisible ?? Boolean(target.visible),
      locked:
        nextLocked ??
        Boolean(
          target.lockMovementX ||
            target.lockMovementY ||
            target.lockScalingX ||
            target.lockScalingY ||
            target.lockRotation,
        ),
    });
  }

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

  if (target instanceof Group) {
    target.set({ ...mappedProps, dirty: true });
    target.setCoords();
    canvas.requestRenderAll();
    return;
  }

  target.set(buildTextLayerProps(target, mappedProps));

  if (shouldHandleTextLayoutUpdate(target, mappedProps)) {
    handleTextLayoutUpdate(target, mappedProps);
  }

  canvas.requestRenderAll();
};
