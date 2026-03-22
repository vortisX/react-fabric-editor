import { i18n } from '../locales';

export type FontLicense = 'free' | 'vip';

export interface FontOption {
  label: string;
  value: string;
  path?: string;
  license?: FontLicense;
}

const FONT_FACE_STYLE_ID = 'designx-supported-font-faces';
const fontLoadTasks = new Map<string, Promise<void>>();

/** ???????????????? */
export function getSupportedFonts(): FontOption[] {
  return [
    { label: i18n.t('fonts.systemDefault'), value: 'sans-serif', license: 'free' },
    { label: i18n.t('fonts.serif'), value: 'serif', license: 'free' },
    { label: i18n.t('fonts.monospace'), value: 'monospace', license: 'free' },
    {
      label: i18n.t('fonts.chillHuoFangSong'),
      value: 'ChillHuoFangSong',
      path: '/fonts/ChillHuoFangSong.ttf',
      license: 'free',
    },
    {
      label: i18n.t('fonts.aaKuangPaiShouShu'),
      value: 'AaKuangPaiShouShu-2',
      path: '/fonts/AaKuangPaiShouShu-2.ttf',
      license: 'free',
    },
  ];
}

/** ??????????????SVG ???????????? */
export const SUPPORTED_FONTS: FontOption[] = getSupportedFonts();

/** ?? fontFamily ??????????? */
export const getSupportedFontByValue = (
  fontFamily: string,
): FontOption | undefined =>
  SUPPORTED_FONTS.find((font) => font.value === fontFamily);

/** ??????????????????? */
export const getCustomSupportedFonts = (): Array<FontOption & { path: string }> =>
  SUPPORTED_FONTS.filter(
    (font): font is FontOption & { path: string } =>
      typeof font.path === 'string' && font.path.length > 0,
  );

/** ?? Fabric ?????????????? */
export const buildSupportedFontPathMap = (): Record<string, string> =>
  Object.fromEntries(
    getCustomSupportedFonts().map((font) => [font.value, font.path]),
  );

/** ? `@font-face` ?????????? `font-display: swap`? */
export const injectSupportedFontFaces = (): void => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FONT_FACE_STYLE_ID)) return;

  const styleElement = document.createElement('style');
  styleElement.id = FONT_FACE_STYLE_ID;
  styleElement.textContent = getCustomSupportedFonts()
    .map(
      (font) => `
@font-face {
  font-family: '${font.value}';
  src: url('${font.path}');
  font-display: swap;
}`,
    )
    .join('\n');

  document.head.appendChild(styleElement);
};

/** ??????????????????????????????? */
export const ensureFontLoaded = async (fontFamily: string): Promise<void> => {
  if (typeof document === 'undefined') return;

  const font = getSupportedFontByValue(fontFamily);
  if (!font?.path) return;

  injectSupportedFontFaces();

  if (document.fonts.check(`16px "${font.value}"`)) {
    return;
  }

  const cachedTask = fontLoadTasks.get(font.value);
  if (cachedTask) {
    await cachedTask;
    return;
  }

  const task = document.fonts
    .load(`16px "${font.value}"`)
    .then(() => undefined)
    .catch(() => undefined);

  fontLoadTasks.set(font.value, task);
  await task;
};
