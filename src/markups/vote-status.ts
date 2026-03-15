import { TFunction } from "i18next";
import { Markup } from "telegraf";

import { Action } from "../enums";

export const voteStatusMarkup = (
  t: TFunction,
  chatId: number,
  targetMessageId: number,
  banKeyword: string,
  votes: number,
  requiredVotes: number,
) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback(
        t("vote.button", {
          banKeyword,
          votes,
          requiredVotes,
        }),
        `${Action.VOTE_CAST}|${chatId}|${targetMessageId}`,
      ),
    ],
  ]);
