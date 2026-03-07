import { TFunction } from "i18next";
import { Markup } from "telegraf";

export const tempChatInviteMarkup = (t: TFunction, inviteLink: string) =>
  Markup.inlineKeyboard([
    [
      Markup.button.url(t("commands.temp_chat_btn_join"), inviteLink),
      {
        text: t("commands.temp_chat_btn_copy"),
        copy_text: { text: inviteLink },
      } as any,
    ],
  ]);
