import { TFunction } from "i18next";
import { Telegram } from "telegraf";

import { BotDb, updateVoteStatusMessageId } from "../db";
import { VoteCase } from "../interfaces";
import { voteStatusMarkup } from "../markups/vote-status";
import { safeDelete } from "./safe-delete";

export const upsertVoteStatusMessage = async (
  telegram: Telegram,
  db: BotDb,
  t: TFunction,
  voteCase: VoteCase,
  targetMessageId: number,
  votes: number,
  banKeyword: string,
  requiredVotes: number,
): Promise<void> => {
  const text = t("vote.progress", {
    banKeyword,
    votes,
    requiredVotes,
  });

  const replyMarkup = voteStatusMarkup(
    t,
    voteCase.chatId,
    targetMessageId,
    banKeyword,
    votes,
    requiredVotes,
  ).reply_markup;

  if (voteCase.statusMsgId) {
    try {
      await telegram.editMessageText(
        voteCase.chatId,
        voteCase.statusMsgId,
        undefined,
        text,
        {
          reply_markup: replyMarkup,
        },
      );

      await updateVoteStatusMessageId(
        db,
        voteCase.chatId,
        targetMessageId,
        voteCase.statusMsgId,
      );

      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "unknown error";

      console.warn(
        `[Vote] Failed to update vote status message ${voteCase.statusMsgId}: ${errorMessage}`,
      );

      await safeDelete(telegram, voteCase.chatId, voteCase.statusMsgId);

      voteCase.botMessageIds.delete(voteCase.statusMsgId);
      voteCase.statusMsgId = undefined;
    }
  }

  const voteProgressReply = await telegram.sendMessage(voteCase.chatId, text, {
    reply_parameters: { message_id: targetMessageId },
    reply_markup: replyMarkup,
  });

  voteCase.statusMsgId = voteProgressReply.message_id;
  voteCase.botMessageIds.add(voteProgressReply.message_id);

  await updateVoteStatusMessageId(
    db,
    voteCase.chatId,
    targetMessageId,
    voteProgressReply.message_id,
  );
};
