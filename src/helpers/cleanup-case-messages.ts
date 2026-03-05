import { Telegram } from "telegraf";

import { VoteCase } from "../interfaces/bot";
import { safeDelete } from "./safe-delete";

export const cleanupCaseMessages = async (
  telegram: Telegram,
  voteCase: VoteCase,
  extraMessageIds: number[] = [],
): Promise<void> => {
  const messageIdsToDelete = new Set<number>([
    ...voteCase.voteCommandMessageIds,
    ...voteCase.botMessageIds,
    ...extraMessageIds,
  ]);

  for (const messageId of messageIdsToDelete) {
    await safeDelete(telegram, voteCase.chatId, messageId);
  }
};
