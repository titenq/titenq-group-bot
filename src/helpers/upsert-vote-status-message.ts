import { TFunction } from "i18next";
import { Telegram } from "telegraf";

import { BotDb, updateVoteStatusMessageId } from "../db";
import { VoteCase } from "../interfaces";
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
  if (voteCase.statusMsgId) {
    await safeDelete(telegram, voteCase.chatId, voteCase.statusMsgId);

    voteCase.botMessageIds.delete(voteCase.statusMsgId);
  }

  const voteProgressReply = await telegram.sendMessage(
    voteCase.chatId,
    t("vote.progress", {
      banKeyword,
      votes,
      requiredVotes,
    }),
    {
      reply_parameters: { message_id: targetMessageId },
    },
  );

  voteCase.statusMsgId = voteProgressReply.message_id;
  voteCase.botMessageIds.add(voteProgressReply.message_id);

  await updateVoteStatusMessageId(
    db,
    voteCase.chatId,
    targetMessageId,
    voteProgressReply.message_id,
  );
};
