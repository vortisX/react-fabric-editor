import type { GroupLayer, Layer } from "../../types/schema";

/** 标准化后的轴对齐边界盒。 */
export interface LayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 统一把几何结果收敛到 0.1px，减少嵌套组合多次运算带来的小数漂移。 */
const roundGeometry = (value: number): number => Math.round(value * 10) / 10;

/** 把任意数值裁剪为合法尺寸，避免负宽高污染后续计算。 */
const normalizeSize = (value: number): number => roundGeometry(Math.max(value, 0));

/** 读取单个图层当前的绝对边界。组合图层会递归以子节点结果为准。 */
export const measureLayerBounds = (layer: Layer): LayerBounds => {
  if (layer.type !== "group") {
    return {
      x: roundGeometry(layer.x),
      y: roundGeometry(layer.y),
      width: normalizeSize(layer.width),
      height: normalizeSize(layer.height),
    };
  }

  return measureGroupBounds(layer.children, layer);
};

/**
 * 根据一组子图层推导组合边界。
 * 组合本身不再维护独立几何真相，边界始终由子节点的绝对包围盒反推。
 */
export const measureGroupBounds = (
  children: Layer[],
  fallback?: Pick<GroupLayer, "x" | "y" | "width" | "height">,
): LayerBounds => {
  if (children.length === 0) {
    return {
      x: roundGeometry(fallback?.x ?? 0),
      y: roundGeometry(fallback?.y ?? 0),
      width: normalizeSize(fallback?.width ?? 0),
      height: normalizeSize(fallback?.height ?? 0),
    };
  }

  const childBounds = children.map((child) => measureLayerBounds(child));
  const minX = Math.min(...childBounds.map((item) => item.x));
  const minY = Math.min(...childBounds.map((item) => item.y));
  const maxX = Math.max(
    ...childBounds.map((item) => item.x + normalizeSize(item.width)),
  );
  const maxY = Math.max(
    ...childBounds.map((item) => item.y + normalizeSize(item.height)),
  );

  return {
    x: roundGeometry(minX),
    y: roundGeometry(minY),
    width: normalizeSize(maxX - minX),
    height: normalizeSize(maxY - minY),
  };
};

/**
 * 递归标准化组合图层数据。
 * 这里把组合的旋转强制归零，并统一改为“由 children 反推边界”的稳定表示。
 */
export const normalizeGroupLayer = (layer: GroupLayer): GroupLayer => {
  const children = layer.children.map((child) =>
    child.type === "group" ? normalizeGroupLayer(child) : child,
  );
  const bounds = measureGroupBounds(children, layer);

  return {
    ...layer,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    children,
  };
};
