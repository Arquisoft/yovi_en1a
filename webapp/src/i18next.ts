import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';


import translationEN from './translation/english.json';
import translationTR from './translation/Turkish.json';
import translationDE from './translation/german.json';
import translationFR from './translation/french.json';
import translationES from './translation/spanish.json';


const resources = {
  en: { translation: translationEN },
  tr: { translation: translationTR },
  de: { translation: translationDE },
  fr: { translation: translationFR },
  es: { translation: translationES }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;