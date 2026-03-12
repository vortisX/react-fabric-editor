import type { CanvasUnit } from './constants';

export type CanvasPresetId =
  | 'custom'
  | 'square_1000'
  | 'xiaohongshu_3_4'
  | 'wechat_head'
  | 'wechat_sub_1_1'
  | 'a4'
  | 'a3'
  | 'a5'
  | 'photo_1_inch'
  | 'photo_2_inch';

export type CanvasPreset = {
  id: CanvasPresetId;
  label: string;
  width: number;
  height: number;
  unit: CanvasUnit;
};

/** 内置画布尺寸预设列表，供右侧面板的预设选择器使用 */
export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'custom', label: '自定义', width: 0, height: 0, unit: 'px' },
  { id: 'square_1000', label: '正方形 1000×1000 px', width: 1000, height: 1000, unit: 'px' },
  { id: 'xiaohongshu_3_4', label: '小红书配图（3:4）1242×1656 px', width: 1242, height: 1656, unit: 'px' },
  { id: 'wechat_head', label: '公众号首图 1800×766 px', width: 1800, height: 766, unit: 'px' },
  { id: 'wechat_sub_1_1', label: '公众号次图（1:1）1000×1000 px', width: 1000, height: 1000, unit: 'px' },
  { id: 'a4', label: 'A4 纸 210×297 px', width: 210, height: 297, unit: 'px' },
  { id: 'a3', label: 'A3 纸 297×420 px', width: 297, height: 420, unit: 'px' },
  { id: 'a5', label: 'A5 纸 148×210 px', width: 148, height: 210, unit: 'px' },
  { id: 'photo_1_inch', label: '证件照 1 寸 25×35 mm', width: 25, height: 35, unit: 'mm' },
  { id: 'photo_2_inch', label: '证件照 2 寸 35×49 mm', width: 35, height: 49, unit: 'mm' },
];
