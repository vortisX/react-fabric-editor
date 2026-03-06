import i18n from '../locales';

export interface FontOption {
  label: string;
  value: string;
  path?: string;
}

export function getSupportedFonts(): FontOption[] {
  return [
    { label: i18n.t('fonts.systemDefault'), value: "sans-serif" },
    { label: i18n.t('fonts.serif'), value: "serif" },
    { label: i18n.t('fonts.monospace'), value: "monospace" },
    {
      label: i18n.t('fonts.chillHuoFangSong'),
      value: "ChillHuoFangSong",
      path: "/fonts/ChillHuoFangSong.ttf",
    },
    {
      label: i18n.t('fonts.aaKuangPaiShouShu'),
      value: "AaKuangPaiShouShu-2",
      path: "/fonts/AaKuangPaiShouShu-2.ttf",
    },
  ];
}

/** @deprecated Use getSupportedFonts() for i18n support */
export const SUPPORTED_FONTS: FontOption[] = getSupportedFonts();
