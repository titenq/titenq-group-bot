import i18next from "i18next";

import { LANGUAGE } from "./config/env";
import { Language } from "./enums/language";

import en from "./locales/en.json" with { type: "json" };
import es from "./locales/es.json" with { type: "json" };
import pt from "./locales/pt.json" with { type: "json" };

export const initI18n = async (): Promise<void> => {
  await i18next.init({
    lng: LANGUAGE,
    fallbackLng: Language.PT,
    resources: {
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
    },
    interpolation: {
      escapeValue: false,
    },
    initImmediate: false,
    showSupportNotice: false,
  });
};

export const SUPPORTED_LANGUAGES: string[] = Object.values(Language);
