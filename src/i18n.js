import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import es from './locales/es.json';
import ht from './locales/ht.json';

// Missing key handler to display readable fallback instead of raw keys
const parseMissingKeyHandler = (key) => {
  if (!key) return '';
  // Returns the last segment of the key (e.g., 'auth.login.title' -> 'title')
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  // Convert camelCase to Title Case for better readability
  return lastPart.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

// Migration logic: Force 'fr' if 'en' was previously selected
let savedLanguage = localStorage.getItem('lang');
if (savedLanguage === 'en') {
  savedLanguage = 'fr';
  localStorage.setItem('lang', 'fr');
}
if (!savedLanguage) {
  savedLanguage = 'fr';
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      es: { translation: es },
      ht: { translation: ht }
    },
    lng: savedLanguage, // Set explicit initial language
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'es', 'ht'],
    debug: false,
    parseMissingKeyHandler: parseMissingKeyHandler,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage']
    },
    react: {
      useSuspense: false
    }
  });

// Listen for language changes and persist to localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng);
});

export default i18n;