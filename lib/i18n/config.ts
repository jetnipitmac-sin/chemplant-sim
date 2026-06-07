import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { th } from "./th";

export const LANGUAGES = ["en", "th"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_LABELS: Record<Language, string> = { en: "EN", th: "ไทย" };

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      th: { translation: th },
    },
    lng: "en", // deterministic for SSR; the persisted choice is applied after mount
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
