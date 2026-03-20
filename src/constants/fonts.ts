import { i18n } from '../locales';

export type FontLicense = 'free' | 'vip';

export interface FontOption {
  label: string;
  value: string;
  path?: string;
  license?: FontLicense;
}

/** 返回当前项目允许选择的字体列表。 */
export function getSupportedFonts(): FontOption[] {
  return [
    { label: i18n.t('fonts.systemDefault'), value: "sans-serif", license: 'free' },
    { label: i18n.t('fonts.serif'), value: "serif", license: 'free' },
    { label: i18n.t('fonts.monospace'), value: "monospace", license: 'free' },
    {
      label: i18n.t('fonts.chillHuoFangSong'),
      value: "ChillHuoFangSong",
      path: "/fonts/ChillHuoFangSong.ttf",
      license: 'free',
    },
    {
      label: i18n.t('fonts.aaKuangPaiShouShu'),
      value: "AaKuangPaiShouShu-2",
      path: "/fonts/AaKuangPaiShouShu-2.ttf",
      license: 'free',
    },
  ];
}

/** 字体常量快照，供字体选择器、SVG 导出和全局字体注册复用。 */
export const SUPPORTED_FONTS: FontOption[] = getSupportedFonts();
