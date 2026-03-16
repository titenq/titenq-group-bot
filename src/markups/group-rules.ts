import { TFunction } from "i18next";
import { InlineKeyboardMarkup } from "telegraf/types";

export const groupRulesMarkup = (
  t: TFunction,
  messageLink: string,
): {
  reply_markup: InlineKeyboardMarkup;
} => ({
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: t("rules.button_label"),
          url: messageLink,
        },
      ],
    ],
  },
});
