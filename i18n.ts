import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

const isServer = typeof window === 'undefined';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'zh'],
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    debug: true,
    // Options for language detector
    detection: {
      order: ['path', 'cookie', 'htmlTag'],
      caches: ['cookie'],
    },
    // react-i18next options
    react: {
      useSuspense: false,
    },
    backend: {
      loadPath: isServer 
        ? 'http://127.0.0.1:3000/locales/{{lng}}/{{ns}}.json' 
        : '/locales/{{lng}}/{{ns}}.json',
    },
  });

export default i18n;