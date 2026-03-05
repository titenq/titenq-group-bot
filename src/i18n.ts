import i18next from "i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";

export const initI18n = async (): Promise<void> => {
  await i18next.init({
    lng: "en",
    fallbackLng: "en",
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

export const SUPPORTED_LANGUAGES = ["pt", "en", "es"];
