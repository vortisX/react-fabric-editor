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

export const round1 = (value: number): number => Math.round(value * 10) / 10;
