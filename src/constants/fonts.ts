import i18n from '../locales';

export type FontLicense = 'free' | 'vip';

export interface FontOption {
  label: string;
  value: string;
  path?: string;
  license?: FontLicense;
}

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

export const SUPPORTED_FONTS: FontOption[] = getSupportedFonts();
