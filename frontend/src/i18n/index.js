import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
};

const MISSING_KEY_PREFIX = '[MISSING_TRANSLATION]';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['en', 'hi', 'mr'],
    fallbackLng: false,
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app_language',
    },
    react: {
      useSuspense: false,
    },
    missingKeyHandler: (lng, ns, key) => {
      console.error(`Missing translation: ${key}`);
      return `${MISSING_KEY_PREFIX}${key}`;
    },
  });

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

export const changeLanguage = (lang) => {
  if (!['en', 'hi', 'mr'].includes(lang)) {
    console.error(`Unsupported language: ${lang}`);
    return;
  }
  localStorage.setItem('app_language', lang);
  i18n.changeLanguage(lang);
};

export const getCurrentLanguage = () => i18n.language;

export default i18n;
