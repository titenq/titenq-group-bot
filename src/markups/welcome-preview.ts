import { TFunction } from "i18next";
import { InlineKeyboardMarkup } from "telegraf/types";

export const welcomeDraftMarkup = (
  t: TFunction,
  adminId: number,
): {
  reply_markup: InlineKeyboardMarkup;
} => ({
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: t("welcome.preview_button"),
          callback_data: `welcome_preview_${adminId}`,
        },
      ],
      [
        {
          text: t("welcome.save_button"),
          callback_data: `welcome_save_${adminId}`,
        },
        {
          text: t("welcome.edit_button"),
          callback_data: `welcome_edit_${adminId}`,
        },
        {
          text: t("welcome.cancel_button"),
          callback_data: `welcome_cancel_${adminId}`,
        },
      ],
    ],
  },
});

export const welcomeSetupMarkup = (
  t: TFunction,
  adminId: number,
): {
  reply_markup: InlineKeyboardMarkup;
} => ({
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: t("welcome.cancel_button"),
          callback_data: `welcome_cancel_${adminId}`,
        },
      ],
    ],
  },
});

export const welcomeGroupPreviewMarkup = (
  t: TFunction,
  adminId: number,
  rulesMessageLink?: string,
): {
  reply_markup: InlineKeyboardMarkup;
} => ({
  reply_markup: {
    inline_keyboard: [
      ...(rulesMessageLink
        ? [
            [
              {
                text: t("rules.button_label"),
                url: rulesMessageLink,
              },
            ],
          ]
        : []),
      [
        {
          text: t("welcome.save_button"),
          callback_data: `welcome_save_${adminId}`,
        },
        {
          text: t("welcome.edit_button"),
          callback_data: `welcome_edit_${adminId}`,
        },
        {
          text: t("welcome.cancel_button"),
          callback_data: `welcome_cancel_preview_${adminId}`,
        },
      ],
    ],
  },
});
