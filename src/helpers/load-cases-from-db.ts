import { caseKey } from "./case-key";
import { BotDb, loadOpenCases } from "../db";
import { VoteCase } from "../interfaces";
import { normalizeSnapshotType } from "./normalize-snapshot-type";

export const loadCasesFromDb = async (
  db: BotDb,
  voteCases: Map<string, VoteCase>,
): Promise<void> => {
  const openCases = await loadOpenCases(db);

  for (const row of openCases) {
    voteCases.set(caseKey(row.chatId, row.targetMessageId), {
      chatId: row.chatId,
      chatTitle: row.chatTitle,
      targetMessageId: row.targetMessageId,
      targetUser: {
        id: row.targetUserId,
        firstName: row.targetFirstName,
        username: row.targetUsername,
      },
      snapshotMessageType: normalizeSnapshotType(row.snapshotMessageType),
      snapshotMessagePreview: row.snapshotMessagePreview,
      snapshotMessageContent: row.snapshotMessageContent,
      snapshotMediaFileId: row.snapshotMediaFileId,
      voters: new Set<number>(row.voters),
      extraAdminVotes: 0,
      status: row.status,
      voteCommandMessageIds: new Set<number>(),
      botMessageIds: new Set<number>(),
      statusMsgId: row.statusMsgId,
    });
  }

  if (openCases.length === 0) {
    console.log("No pending cases found in SQLite.");
  } else {
    console.log(`Pending cases loaded from SQLite: ${openCases.length}`);
  }
};
