import {
  FabricImage,
  Rect,
  filters,
  type Canvas,
} from "fabric";

import type { ImageLayer } from "../../types/schema";
import { EDITOR_GLOBAL_STYLE } from "../constants";
import { applyLayerControls } from "../layerControls";
import { round1 } from "./helpers";
import type { FabricImageLayer, LayerMeasurement } from "./types";

interface AddImageLayerParams {
  canvas: Canvas;
  layer: ImageLayer;
  docWidth: number;
  docHeight: number;
  displayZoom: number;
}

interface UpdateImageLayerPropsParams {
  img: FabricImageLayer;
  props: Record<string, unknown>;
  readStoreLayer: () => ImageLayer | undefined;
}

const FILTER_KEYS = new Set(["brightness", "contrast", "saturation"]);

const loadHtmlImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });

const resizeImageElement = async (
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<HTMLImageElement> => {
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.max(Math.round(width), 1);
  canvas.height = Math.max(Math.round(height), 1);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas_context_unavailable");
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return loadHtmlImage(canvas.toDataURL("image/png"));
};

const updateImageClipPath = (
  img: FabricImageLayer,
  width: number,
  height: number,
  borderRadius: number,
): void => {
  if (borderRadius <= 0) {
    img.clipPath = undefined;
    return;
  }

  if (img.clipPath instanceof Rect) {
    img.clipPath.set({ width, height, rx: borderRadius, ry: borderRadius });
    return;
  }

  img.clipPath = new Rect({
    width,
    height,
    rx: borderRadius,
    ry: borderRadius,
    originX: "center",
    originY: "center",
  });
};

const normalizeImageObjectSize = async (
  img: FabricImageLayer,
  width: number,
  height: number,
): Promise<void> => {
  const source = img.getElement() as CanvasImageSource;
  const resizedElement = await resizeImageElement(source, width, height);
  img.setElement(resizedElement, { width, height });
  img.set({ width, height, scaleX: 1, scaleY: 1, dirty: true });
  img.setCoords();
};

/** Apply the schema-side filter values to a Fabric image instance. */
export const applyImageFilters = (
  img: FabricImage,
  layer: Pick<ImageLayer, "brightness" | "contrast" | "saturation">,
): void => {
  const nextFilters: filters.BaseFilter<string>[] = [];

  if (layer.brightness) {
    nextFilters.push(new filters.Brightness({ brightness: layer.brightness }));
  }
  if (layer.contrast) {
    nextFilters.push(new filters.Contrast({ contrast: layer.contrast }));
  }
  if (layer.saturation) {
    nextFilters.push(new filters.Saturation({ saturation: layer.saturation }));
  }

  img.filters = nextFilters;
  img.applyFilters();
};

const applyBaseImageProps = (
  img: FabricImageLayer,
  layer: ImageLayer,
  width: number,
  height: number,
): void => {
  img.set({
    ...EDITOR_GLOBAL_STYLE,
    width,
    height,
    scaleX: 1,
    scaleY: 1,
    left: layer.x,
    top: layer.y,
    angle: layer.rotation ?? 0,
    opacity: layer.opacity ?? 1,
    visible: layer.visible ?? true,
    flipX: layer.flipX ?? false,
    flipY: layer.flipY ?? false,
    stroke: layer.stroke ?? null,
    strokeWidth: layer.strokeWidth ?? 0,
    strokeDashArray: layer.strokeDashArray ?? null,
    originX: "left",
    originY: "top",
  });
  updateImageClipPath(img, width, height, layer.borderRadius ?? 0);
  applyImageFilters(img, layer);
  applyLayerControls(img);
};

/** Create a normalized Fabric image object from the schema layer. */
export const createImageObject = async (
  layer: ImageLayer,
  width: number,
  height: number,
): Promise<FabricImageLayer> => {
  const img = (await FabricImage.fromURL(layer.url)) as FabricImageLayer;
  img.id = layer.id;

  const normalizedElement = await resizeImageElement(
    img.getElement() as CanvasImageSource,
    width,
    height,
  );
  img.setElement(normalizedElement, { width, height });
  applyBaseImageProps(img, layer, width, height);
  return img;
};

/**
 * Add an image layer to the canvas and normalize the resulting object size.
 * The placed image is limited to 80% of the document viewport.
 */
export const addImageLayerToCanvas = async ({
  canvas,
  layer,
  docWidth,
  docHeight,
  displayZoom,
}: AddImageLayerParams): Promise<LayerMeasurement | undefined> => {
  let previewImage: FabricImage;
  try {
    previewImage = await FabricImage.fromURL(layer.url);
  } catch {
    return undefined;
  }

  const naturalWidth = previewImage.width ?? 1;
  const naturalHeight = previewImage.height ?? 1;

  const resolvedDocWidth = docWidth || canvas.width / displayZoom || 800;
  const resolvedDocHeight = docHeight || canvas.height / displayZoom || 600;
  const maxWidth = resolvedDocWidth * 0.8;
  const maxHeight = resolvedDocHeight * 0.8;
  const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);
  const finalWidth = Math.round(naturalWidth * scale);
  const finalHeight = Math.round(naturalHeight * scale);

  let img: FabricImageLayer;
  try {
    img = await createImageObject(layer, finalWidth, finalHeight);
  } catch {
    return undefined;
  }

  canvas.add(img);
  canvas.viewportCenterObject(img);
  img.setCoords();

  canvas.setActiveObject(img);
  canvas.requestRenderAll();

  return {
    x: round1(img.left ?? 0),
    y: round1(img.top ?? 0),
    width: finalWidth,
    height: finalHeight,
  };
};

/**
 * Update image-only Fabric props such as filters, clipPath and normalized width/height.
 */
export const updateImageLayerProps = async ({
  img,
  props,
  readStoreLayer,
}: UpdateImageLayerPropsParams): Promise<void> => {
  const directProps: Record<string, unknown> = {};
  const filterOverrides: Partial<
    Pick<ImageLayer, "brightness" | "contrast" | "saturation">
  > = {};

  let nextWidth: number | null = null;
  let nextHeight: number | null = null;
  let nextBorderRadius: number | null = null;

  for (const [key, value] of Object.entries(props)) {
    if (FILTER_KEYS.has(key)) {
      (filterOverrides as Record<string, unknown>)[key] = value;
      continue;
    }

    if (key === "width") {
      nextWidth = Math.max(Number(value ?? img.width ?? 1), 1);
      continue;
    }

    if (key === "height") {
      nextHeight = Math.max(Number(value ?? img.height ?? 1), 1);
      continue;
    }

    if (key === "borderRadius") {
      nextBorderRadius = Number(value ?? 0);
      continue;
    }

    directProps[key] = value;
  }

  const targetWidth = nextWidth ?? (img.width ?? 1);
  const targetHeight = nextHeight ?? (img.height ?? 1);

  if (nextWidth !== null || nextHeight !== null) {
    try {
      await normalizeImageObjectSize(img, targetWidth, targetHeight);
    } catch {
      img.set({
        width: targetWidth,
        height: targetHeight,
        scaleX: 1,
        scaleY: 1,
        dirty: true,
      });
      img.setCoords();
    }
  }

  if (Object.keys(directProps).length > 0) {
    img.set({ ...directProps, dirty: true });
    img.setCoords();
  }

  if (nextBorderRadius !== null) {
    updateImageClipPath(img, targetWidth, targetHeight, nextBorderRadius);
  }

  const hasFilterChange = Object.keys(props).some((key) => FILTER_KEYS.has(key));
  if (!hasFilterChange) return;

  const storeLayer = readStoreLayer();
  applyImageFilters(img, {
    brightness: (filterOverrides.brightness ?? storeLayer?.brightness) as
      | number
      | undefined,
    contrast: (filterOverrides.contrast ?? storeLayer?.contrast) as
      | number
      | undefined,
    saturation: (filterOverrides.saturation ?? storeLayer?.saturation) as
      | number
      | undefined,
  });
};

/** Normalize image scale back into width/height after interactive transforms. */
export const finalizeImageScale = async (
  img: FabricImageLayer,
): Promise<void> => {
  const finalWidth = Math.max(Math.round((img.width ?? 1) * (img.scaleX ?? 1)), 1);
  const finalHeight = Math.max(Math.round((img.height ?? 1) * (img.scaleY ?? 1)), 1);

  try {
    await normalizeImageObjectSize(img, finalWidth, finalHeight);
  } catch {
    img.set({ width: finalWidth, height: finalHeight, scaleX: 1, scaleY: 1 });
    img.setCoords();
  }

  const radius = img.clipPath instanceof Rect ? img.clipPath.rx ?? 0 : 0;
  updateImageClipPath(img, finalWidth, finalHeight, radius);
};
