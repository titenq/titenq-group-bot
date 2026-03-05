import { InlineKeyboardMarkup } from "telegraf/types";

export const i18nOptionsMarkup = (): {
  reply_markup: InlineKeyboardMarkup;
} => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🇺🇸 English", callback_data: `i18n_set_en` },
        { text: "🇧🇷 Português", callback_data: `i18n_set_pt` },
        { text: "🇪🇸 Español", callback_data: `i18n_set_es` },
      ],
    ],
  },
});
