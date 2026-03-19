import {
  FabricImage,
  Rect,
  Textbox,
  filters,
  type Canvas,
  type FabricObject,
} from "fabric";

import { useEditorStore } from "../../store/useEditorStore";
import type { FillStyle, ImageLayer, TextLayer } from "../../types/schema";
import { EDITOR_GLOBAL_STYLE } from "../constants";
import { CustomTextbox } from "../CustomTextbox";
import { applyLayerControls } from "../layerControls";
import { fillStyleToFabric } from "./fill";
import { LAYOUT_KEYS, round1 } from "./helpers";
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

/**
 * 添加图片图层到画布，并返回居中后的实际坐标和尺寸。
 * 图片缩放到画布 80% 以内（保持宽高比），scaleX/scaleY 归一化为 1。
 */
export const addImageLayerToCanvas = async ({
  canvas,
  layer,
  docWidth,
  docHeight,
  displayZoom,
}: AddImageLayerParams): Promise<LayerMeasurement | undefined> => {
  let img: FabricImage;
  try {
    img = await FabricImage.fromURL(layer.url);
  } catch {
    return undefined;
  }

  const naturalWidth = img.width ?? 1;
  const naturalHeight = img.height ?? 1;

  // 确保 docWidth/docHeight 有效，如果未初始化则尝试从 canvas 获取（需除以 zoom）
  const resolvedDocWidth = docWidth || canvas.width / displayZoom || 800;
  const resolvedDocHeight = docHeight || canvas.height / displayZoom || 600;

  // 按比例缩放：确保宽高均不超过画布的 80%
  const maxWidth = resolvedDocWidth * 0.8;
  const maxHeight = resolvedDocHeight * 0.8;
  const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);
  const finalWidth = Math.round(naturalWidth * scale);
  const finalHeight = Math.round(naturalHeight * scale);

  // 图片图层：使用 scaleX/scaleY 进行缩放，width/height 保持自然尺寸
  // 这样避免了 FabricImage 在 width 变化时发生裁剪
  const imgWithId = img as FabricImageLayer;
  imgWithId.id = layer.id;

  img.set({
    // Fabric v7 构造时 ownDefaults 会以实例属性覆盖原型，
    // 必须在此处显式重新应用全局控件皮肤，确保与文字图层外观一致
    ...EDITOR_GLOBAL_STYLE,
    width: naturalWidth,
    height: naturalHeight,
    scaleX: scale,
    scaleY: scale,
    angle: layer.rotation ?? 0,
    opacity: layer.opacity ?? 1,
    flipX: layer.flipX ?? false,
    flipY: layer.flipY ?? false,
    stroke: layer.stroke ?? null,
    strokeWidth: layer.strokeWidth ?? 0,
    strokeDashArray: layer.strokeDashArray ?? null,
    originX: "left",
    originY: "top",
  });

  // 圆角遮罩：通过 Rect clipPath 实现
  const radius = layer.borderRadius ?? 0;
  if (radius > 0) {
    img.clipPath = new Rect({
      width: finalWidth,
      height: finalHeight,
      rx: radius,
      ry: radius,
      originX: "center",
      originY: "center",
    });
  }

  applyImageFilters(img, layer);
  applyLayerControls(img);

  canvas.add(img);
  // 必须用 viewportCenterObject：当 displayZoom != 1 时，centerObject 坐标会偏移
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
 * 图片图层属性更新：处理滤镜、圆角 clipPath、翻转等图片专属逻辑。
 */
export const updateImageLayerProps = ({
  img,
  props,
  readStoreLayer,
}: UpdateImageLayerPropsParams): void => {
  const filterKeys = new Set(["brightness", "contrast", "saturation"]);
  const hasFilterChange = Object.keys(props).some((key) => filterKeys.has(key));

  // 提取滤镜相关属性，其余属性直接 set
  const directProps: Record<string, unknown> = {};
  const filterOverrides: Partial<
    Pick<ImageLayer, "brightness" | "contrast" | "saturation">
  > = {};

  for (const [key, value] of Object.entries(props)) {
    if (filterKeys.has(key)) {
      (filterOverrides as Record<string, unknown>)[key] = value;
      continue;
    }

    if (key === "borderRadius") {
      // 更新或新建 clipPath
      const radius = (value as number) ?? 0;
      if (radius > 0) {
        if (img.clipPath instanceof Rect) {
          img.clipPath.set({ rx: radius, ry: radius });
        } else {
          img.clipPath = new Rect({
            width: img.width ?? 100,
            height: img.height ?? 100,
            rx: radius,
            ry: radius,
            originX: "center",
            originY: "center",
          });
        }
      } else {
        img.clipPath = undefined;
      }
      continue;
    }

    directProps[key] = value;
  }

  if (Object.keys(directProps).length > 0) {
    img.set({ ...directProps, dirty: true });
    img.setCoords();
  }

  // 滤镜需要从 Store 读取最新完整状态后重新全量应用
  if (!hasFilterChange) return;

  const storeLayer = readStoreLayer();
  const merged = {
    brightness: (filterOverrides.brightness ?? storeLayer?.brightness) as
      | number
      | undefined,
    contrast: (filterOverrides.contrast ?? storeLayer?.contrast) as
      | number
      | undefined,
    saturation: (filterOverrides.saturation ?? storeLayer?.saturation) as
      | number
      | undefined,
  };

  applyImageFilters(img, merged);
};

export const buildTextLayerProps = (
  target: FabricObject,
  props: Record<string, unknown>,
): Record<string, unknown> => {
  const finalProps: Record<string, unknown> = { ...props, dirty: true };

  // fill 属性需要将 FillStyle 转换为 Fabric Gradient
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

export const shouldHandleTextLayoutUpdate = (
  target: FabricObject,
  props: Record<string, unknown>,
): target is Textbox => {
  return LAYOUT_KEYS.some((key) => props[key] !== undefined) && target instanceof Textbox;
};

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

    useEditorStore.getState().updateLayer(id, {
      width: target.width ?? 0,
      height: target.height ?? 0,
    });
  });
};

export const addTextLayerToCanvas = (
  canvas: Canvas,
  layer: TextLayer,
  docWidth: number,
): LayerMeasurement | undefined => {
  // 必须使用文档原始宽度（不含 displayZoom），因为 Fabric 对象坐标始终在文档空间，
  // canvas.getWidth() 返回的是 docWidth * displayZoom，会污染文本宽度计算
  const maxTextWidth = docWidth * 0.9;

  // 先用足够大的宽度创建，让文字排成一行以便测量
  const node = CustomTextbox.fromLayer({ ...layer, width: maxTextWidth });
  node.initDimensions();

  // 测量文字自然宽度（一行所需的宽度）
  const naturalWidth = node.calcTextWidth();
  // 宽度：优先一行显示，超出画布 90% 则限制换行
  const finalWidth = Math.min(naturalWidth + 2, maxTextWidth);

  node.set({ width: finalWidth });
  node._manualHeight = undefined;
  node.initDimensions();

  const fontSize = node.fontSize ?? 12;
  const lineHeight = node.lineHeight ?? 1.2;
  const finalHeight = Math.max(node.calcTextHeight(), fontSize * lineHeight);
  node.set({ height: finalHeight });
  node._manualHeight = finalHeight;

  // 必须用 viewportCenterObject 而非 centerObject：
  // centerObject 使用 CSS 像素坐标（docWidth * zoom / 2），zoom != 1 时会偏移；
  // viewportCenterObject 会通过逆视口变换还原为文档坐标（docWidth / 2），始终居中
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
