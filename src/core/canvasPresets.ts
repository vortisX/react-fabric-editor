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
  labelKey: string;
  width: number;
  height: number;
  unit: CanvasUnit;
};

/** 内置画布尺寸预设列表，供右侧面板的预设选择器使用 */
export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'custom', labelKey: 'canvasPresets.custom', width: 0, height: 0, unit: 'px' },
  { id: 'square_1000', labelKey: 'canvasPresets.square1000', width: 1000, height: 1000, unit: 'px' },
  { id: 'xiaohongshu_3_4', labelKey: 'canvasPresets.xiaohongshu34', width: 1242, height: 1656, unit: 'px' },
  { id: 'wechat_head', labelKey: 'canvasPresets.wechatHead', width: 1800, height: 766, unit: 'px' },
  { id: 'wechat_sub_1_1', labelKey: 'canvasPresets.wechatSub11', width: 1000, height: 1000, unit: 'px' },
  { id: 'a4', labelKey: 'canvasPresets.a4', width: 210, height: 297, unit: 'px' },
  { id: 'a3', labelKey: 'canvasPresets.a3', width: 297, height: 420, unit: 'px' },
  { id: 'a5', labelKey: 'canvasPresets.a5', width: 148, height: 210, unit: 'px' },
  { id: 'photo_1_inch', labelKey: 'canvasPresets.photo1Inch', width: 25, height: 35, unit: 'mm' },
  { id: 'photo_2_inch', labelKey: 'canvasPresets.photo2Inch', width: 35, height: 49, unit: 'mm' },
];
