import { TFunction } from "i18next";
import { Markup } from "telegraf";

import { Action } from "../enums/action";

export const previewDecisionMarkup = (
  t: TFunction,
  chatId: number,
  targetMessageId: number,
  previewMessageId: number,
) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback(
        t("markups.delete_view"),
        `${Action.PREVIEW_DELETE}|${chatId}|${targetMessageId}|${previewMessageId}`,
      ),
      Markup.button.callback(
        t("markups.keep_view"),
        `${Action.PREVIEW_KEEP}|${chatId}|${targetMessageId}|${previewMessageId}`,
      ),
    ],
  ]);
