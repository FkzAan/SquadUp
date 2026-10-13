import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translate, type Language, type TranslationKey } from '../localization/translations';

const STORAGE_KEY = '@squadup/language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ms');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && (stored === 'ms' || stored === 'en')) setLanguageState(stored);
      })
      .catch(() => {}) // Keep the Malay default if local storage is unavailable.
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  function setLanguage(next: Language) {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }

  // Wait for the saved preference so the initial screen does not briefly flash Malay.
  if (!ready) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: (key, vars) => translate(language, key, vars) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
