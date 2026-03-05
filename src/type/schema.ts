/**
 * 基础图层属性 (所有图层共用)
 */
export interface BaseLayer {
  id: string; // 图层唯一 ID (例如: layer_img_001)
  name: string; // 图层名称 (例如: "新人婚纱照")
  type: "image" | "text" | "svg" | "shape"; // 图层类型
  x: number; // X 坐标
  y: number; // Y 坐标
  width: number; // 宽度
  height: number; // 高度
  rotation: number; // 旋转角度 (0-360)
  opacity: number; // 透明度 (0-1)

  // 锁定与交互控制
  locked: boolean; // 完全锁定 (不可选中，不可移动，比如背景花纹)
  lockMovement: boolean; // 仅锁定位置 (可修改内容，比如请柬文字)

  // 模板与商业化扩展
  isTemplateSlot?: boolean; // 是否为模板的可替换插槽 (MVP 阶段 C 端用户只能操作插槽)
  slotId?: string; // 插槽标识 (例如: "wedding_main_photo")
}

/**
 * 文本图层特有属性
 */
export interface TextLayer extends BaseLayer {
  type: "text";
  content: string; // 文本内容
  fontFamily: string; // 字体
  fontSize: number; // 字号
  fontWeight: string | number; // 字重 (normal, bold, 400, 700)
  fill: string; // 字体颜色 (十六进制)
  textAlign: "left" | "center" | "right"; // 对齐方式
  lineHeight?: number; // 行高
  letterSpacing?: number; // 字间距
}
/**
 * 图片裁剪数据 (预留扩展)
 */
export interface CropData {
  x: number; // 裁剪框左上角相对于原图的 X 坐标
  y: number; // 裁剪框左上角相对于原图的 Y 坐标
  width: number; // 裁剪出的实际宽度
  height: number; // 裁剪出的实际高度
}
/**
 * 图片图层特有属性
 */
export interface ImageLayer extends BaseLayer {
  type: "image";
  src: string; // 图片 OSS 地址 或 Base64
  crop?: CropData; // 预留：裁剪数据
}

/**
 * 图层联合类型 (未来增加 SvgLayer, ShapeLayer 直接在这里扩展)
 */
export type Layer = TextLayer | ImageLayer;

/**
 * 单个页面结构 (支持多页请柬/长图)
 */
export interface Page {
  pageId: string;
  name: string;
  background: {
    type: "color" | "image";
    value: string; // 颜色值 或 图片 URL
  };
  layers: Layer[]; // 页面内的图层数组 (数组顺序即渲染层级 z-index)
}

/**
 * 顶级文档 Schema (存入 MySQL 的最终 JSON 结构)
 */
export interface DesignDocument {
  version: string; // 数据版本号 (防崩溃机制，当前 "1.0.0")
  workId: string; // 作品全局唯一 ID
  title: string; // 作品标题
  global: {
    width: number; // 全局画布宽度
    height: number; // 全局画布高度
    unit: "px" | "mm"; // 尺寸单位 (默认 px)
    dpi: number; // 导出精度 (默认 72)
  };
  pages: Page[]; // 页面集合
}
