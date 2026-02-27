import { useMemo, type ReactNode } from 'react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { i18nResources, type SupportedI18nLanguage } from './resources';

interface DemoI18nProviderProps {
  language: SupportedI18nLanguage;
  children: ReactNode;
}

function createDemoI18nInstance(language: SupportedI18nLanguage) {
  const instance = i18next.createInstance();

  instance.use(initReactI18next).init({
    resources: i18nResources,
    lng: language,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'bookmark', 'settings', 'ai'],
    interpolation: {
      escapeValue: false,
    },
    initImmediate: false,
  });

  return instance;
}

export function DemoI18nProvider({ language, children }: DemoI18nProviderProps) {
  const instance = useMemo(() => createDemoI18nInstance(language), [language]);
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
