import { TFunction } from "i18next";
import { Markup } from "telegraf";

import { Action } from "../enums";

export const adminDecisionMarkup = (
  t: TFunction,
  chatId: number,
  targetMessageId: number,
  targetUserId: number,
) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback(
        t("markups.view_content"),
        `${Action.ADMIN_VIEW}|${chatId}|${targetMessageId}|${targetUserId}`,
      ),
      Markup.button.callback(
        t("markups.view_voters"),
        `${Action.ADMIN_VOTERS}|${chatId}|${targetMessageId}|${targetUserId}`,
      ),
      Markup.button.callback(
        t("markups.restore_message"),
        `${Action.ADMIN_RESTORE}|${chatId}|${targetMessageId}|${targetUserId}`,
      ),
    ],
    [
      Markup.button.callback(
        t("markups.ban_user"),
        `${Action.ADMIN_BAN}|${chatId}|${targetMessageId}|${targetUserId}`,
      ),
      Markup.button.callback(
        t("markups.ignore_report"),
        `${Action.ADMIN_IGNORE}|${chatId}|${targetMessageId}|${targetUserId}`,
      ),
    ],
  ]);
