import i18next from "i18next";

import { LANGUAGE } from "./config/env";
import { Language } from "./enums/language";

import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";

export const initI18n = async (): Promise<void> => {
  await i18next.init({
    lng: LANGUAGE,
    fallbackLng: Language.EN,
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
