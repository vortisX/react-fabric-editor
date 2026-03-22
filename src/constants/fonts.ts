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



/** 返回编辑器当前支持的字体列表。 */
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



/** 统一的受支持字体清单，供 UI、引擎与导出模块共用。 */
export const SUPPORTED_FONTS: FontOption[] = getSupportedFonts();


/** 根据 `fontFamily` 查找对应的字体配置。 */
export const getSupportedFontByValue = (
  fontFamily: string,

): FontOption | undefined =>

  SUPPORTED_FONTS.find((font) => font.value === fontFamily);



/** 返回带有静态文件路径的自定义字体列表。 */
export const getCustomSupportedFonts = (): Array<FontOption & { path: string }> =>
  SUPPORTED_FONTS.filter(

    (font): font is FontOption & { path: string } =>

      typeof font.path === 'string' && font.path.length > 0,

  );



/** 构建供 Fabric / 引擎侧使用的字体路径映射表。 */
export const buildSupportedFontPathMap = (): Record<string, string> =>
  Object.fromEntries(

    getCustomSupportedFonts().map((font) => [font.value, font.path]),

  );



/** 注入统一的 `@font-face` 声明，并使用 `font-display: swap`。 */
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



/** 确保指定字体已经加载完成，避免首次渲染文本时回退到默认字体。 */
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

