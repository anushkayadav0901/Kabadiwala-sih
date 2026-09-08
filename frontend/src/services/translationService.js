// UI language support — English, Hindi, Marathi.
//
// Two layers work together:
//   1. t(key, lang)   — the original key-based lookup, still used by the
//                       screens that already call it.
//   2. getDictionary  — the full source-text dictionary used by AutoTranslate
//                       to cover every remaining string on every screen.
//
// Both dictionaries are bundled into the app. Nothing here calls a network
// translation service: PS 26229 requires the app to work offline, and a
// collector must be able to switch language with no connectivity.
//
// To regenerate after adding new screens:
//   node scripts/extract-strings.mjs
//   node scripts/translate-strings.mjs
import { translations } from "../data/mockData";
import { DEFAULT_LANGUAGE } from "../utils/constants";
import hi from "../locales/hi.json";
import mr from "../locales/mr.json";

const DICTIONARIES = { hi, mr };

export const t = (key, language = DEFAULT_LANGUAGE) => {
  const currentLang = translations[language] || translations.en;
  return currentLang[key] || translations.en[key] || key;
};

// English is the source language, so it has no dictionary — returning null
// tells AutoTranslate to restore each node's original text.
export const getDictionary = (language) => DICTIONARIES[language] || null;

export const SUPPORTED_LANGUAGES = ["en", "hi", "mr"];

export const getCoverage = (language) => {
  const dict = DICTIONARIES[language];
  return dict ? Object.keys(dict).length : 0;
};
