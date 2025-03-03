import React, { createContext, useContext, useState, useEffect } from 'react';
import { locales, Locale, LocaleMessages } from '../locales';

interface LocaleContextType {
  locale: Locale;
  messages: LocaleMessages;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(() => {
    const savedLocale = localStorage.getItem('locale');
    return (savedLocale as Locale) || 'zh';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const value = {
    locale,
    messages: locales[locale],
    setLocale
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};