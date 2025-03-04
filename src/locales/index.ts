import zh from './zh.json';
import en from './en.json';
import ko from './ko.json';
import ja from './ja.json';
import uk from './uk.json';
import es from './es.json';
import de from './de.json';
import ru from './ru.json';

export const locales = {
  zh,
  en,
  ko,
  ja,
  uk,
  es,
  de,
  ru
};

export type Locale = keyof typeof locales;
export type LocaleMessages = typeof locales.en;