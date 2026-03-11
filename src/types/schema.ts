// 基础图层属性接口
export interface BaseLayer {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  lockMovement?: boolean;
}

// 纯色背景
export interface ColorBackground {
  type: "color";
  value: string; // 十六进制颜色
}

// 渐变背景
export interface GradientBackground {
  type: "gradient";
  value: GradientFill;
}

// 图片背景
export interface ImageBackground {
  type: "image";
  url: string;
  fit?: "none" | "tile" | "stretch" | "cover";
}

export type PageBackground = ColorBackground | GradientBackground | ImageBackground;

// 渐变色标
export interface GradientColorStop {
  offset: number;   // 0–1
  color: string;     // 十六进制颜色
}

// 线性渐变填充
export interface GradientFill {
  type: 'linear';
  direction: 'horizontal' | 'vertical'; // 水平 / 垂直
  colorStops: GradientColorStop[];
}

// 纯色填充
export interface SolidFill {
  type: 'solid';
  color: string;
}

export type FillStyle = SolidFill | GradientFill;

// 文本图层属性接口
export interface TextLayer extends BaseLayer {
  type: "text";
  content: string; // 文本内容
  fontFamily: string; // 字体
  fontSize: number; // 字号
  fontWeight: string | number; // 字重 (normal, bold)
  fill: string | FillStyle; // 字体颜色（纯色字符串 或 填充对象）
  textAlign: "left" | "center" | "right" | "justify"; // justify 两端对齐
  lineHeight?: number; // 行高
  letterSpacing?: number; // 字间距
  fontStyle?: "normal" | "italic"; // 斜体
  underline?: boolean; // 下划线
  linethrough?: boolean; // 删除线
  textBackgroundColor?: string; // 文字背景色(作为外框背景色)
  stroke?: string; // 描边颜色
  strokeWidth?: number; // 描边粗细
  strokeDashArray?: number[]; // 虚线数组
  borderRadius?: number; // 弧度 (边框圆角)
}

// 图层联合类型 (未来扩展图片图层等)
export type Layer = TextLayer;

// 页面结构
export interface Page {
  pageId: string;
  name: string;
  background: PageBackground;
  layers: Layer[];
}

// 全局配置
export interface GlobalConfig {
  width: number;
  height: number;
  unit: string; // 画布单位，如 "px"
  dpi: number;  // 分辨率/像素密度，如 72
}

// 完整的 JSON Schema
export interface DesignDocument {
  workId: string; // 核心修复：只保留 workId 作为文档标识，干掉原本多余的 id
  title: string;
  version: string;
  global: GlobalConfig;
  pages: Page[];
}
