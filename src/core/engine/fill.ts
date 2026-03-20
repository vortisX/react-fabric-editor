import { Gradient } from "fabric";

import type { FillStyle } from "../../types/schema";

/**
 * 将 Schema 的 FillStyle 转换为 Fabric.js 可用的 fill 值。
 * - SolidFill / 纯色字符串 -> 返回颜色字符串
 * - GradientFill -> 返回 Fabric Gradient 实例
 */
export const fillStyleToFabric = (
  fill: string | FillStyle,
  width: number,
  height: number,
): string | InstanceType<typeof Gradient<"linear">> => {
  if (typeof fill === "string") return fill;
  if (fill.type === "solid") return fill.color;

  const isHorizontal = fill.direction === "horizontal";
  // 渐变方向在 Schema 里只有横向/纵向两种，这里直接映射成 Fabric 线性渐变坐标。
  return new Gradient({
    type: "linear",
    coords: {
      x1: 0,
      y1: 0,
      x2: isHorizontal ? width : 0,
      y2: isHorizontal ? 0 : height,
    },
    colorStops: fill.colorStops.map((stop) => ({
      offset: stop.offset,
      color: stop.color,
    })),
  });
};
