import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCN from './zh-CN.json';
import zhTW from './zh-TW.json';
import enUS from './en-US.json';
import jaJP from './ja-JP.json';
import koKR from './ko-KR.json';

export const LANGUAGES = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en-US', label: 'English' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'ko-KR', label: '한국어' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

const SUPPORTED_CODES = LANGUAGES.map((l) => l.code) as unknown as string[];

function detectLanguage(): string {
  // 1. 用户手动选择过的语言优先
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('designx-lang');
    if (saved && SUPPORTED_CODES.includes(saved)) return saved;
  }

  // 2. 根据浏览器语言自动匹配
  if (typeof navigator !== 'undefined') {
    for (const lang of navigator.languages ?? [navigator.language]) {
      // 精确匹配 zh-CN / zh-TW / en-US …
      if (SUPPORTED_CODES.includes(lang)) return lang;
      // zh-Hans → zh-CN, zh-Hant → zh-TW
      if (/^zh[_-](Hans|CN|SG)/i.test(lang)) return 'zh-CN';
      if (/^zh[_-](Hant|TW|HK|MO)/i.test(lang)) return 'zh-TW';
      // 前缀匹配 en → en-US, ja → ja-JP, ko → ko-KR
      const prefix = lang.split('-')[0].toLowerCase();
      const match = SUPPORTED_CODES.find((c) => c.toLowerCase().startsWith(prefix));
      if (match) return match;
    }
  }

  return 'zh-CN';
}

const savedLang = detectLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
      'en-US': { translation: enUS },
      'ja-JP': { translation: jaJP },
      'ko-KR': { translation: koKR },
    },
    lng: savedLang,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  });

export { i18n };
