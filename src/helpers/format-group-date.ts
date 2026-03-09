import { Language } from "../enums/language";

const LANGUAGE_LOCALE_MAP: Record<Language, string> = {
  [Language.PT]: "pt-BR",
  [Language.EN]: "en-US",
  [Language.ES]: "es-ES",
};

export const formatGroupDate = (
  unixTimestamp: number,
  languageCode: string | undefined,
): string => {
  const language =
    languageCode && Object.values(Language).includes(languageCode as Language)
      ? (languageCode as Language)
      : Language.PT;

  const locale = LANGUAGE_LOCALE_MAP[language];

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(unixTimestamp * 1000));
};
