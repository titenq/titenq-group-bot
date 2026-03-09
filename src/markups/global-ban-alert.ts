import { Markup } from "telegraf";
import { InlineKeyboardMarkup } from "telegraf/types";

import { Action } from "../enums/action";

export const globalBanAlertMarkup = (
  t: (key: string) => string,
  userId: number,
): Markup.Markup<InlineKeyboardMarkup> => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        t("global_ban.view_reasons"),
        `${Action.VIEW_BAN_REASONS}:${userId}`,
      ),
    ],
    [
      Markup.button.callback(
        t("global_ban.ban_user"),
        `${Action.BAN_USER}:${userId}`,
      ),
      Markup.button.callback(
        t("global_ban.ignore"),
        `${Action.IGNORE_BAN_ALERT}`,
      ),
    ],
  ]);
};
