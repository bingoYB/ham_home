import enCommon from '@/locales/en/common.json';
import enBookmark from '@/locales/en/bookmark.json';
import enSettings from '@/locales/en/settings.json';
import enAi from '@/locales/en/ai.json';
import zhCommon from '@/locales/zh/common.json';
import zhBookmark from '@/locales/zh/bookmark.json';
import zhSettings from '@/locales/zh/settings.json';
import zhAi from '@/locales/zh/ai.json';

export const i18nResources = {
  en: {
    common: enCommon,
    bookmark: enBookmark,
    settings: enSettings,
    ai: enAi,
  },
  zh: {
    common: zhCommon,
    bookmark: zhBookmark,
    settings: zhSettings,
    ai: zhAi,
  },
} as const;

export type SupportedI18nLanguage = keyof typeof i18nResources;
