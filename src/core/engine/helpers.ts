export const LAYOUT_KEYS = [
  "text",
  "width",
  "height",
  "textAlign",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "charSpacing",
  "fontStyle",
] as const;

/** 把数值四舍五入到 1 位小数，减少高频同步时的浮点噪声。 */
export const round1 = (value: number): number => Math.round(value * 10) / 10;
