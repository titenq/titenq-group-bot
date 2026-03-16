import { BotDb } from "./database";
import { VoteCaseStatus } from "../enums";
import { OpenCaseRow, PersistedVoteCase } from "../interfaces";

export const upsertVoteCase = async (
  db: BotDb,
  chatId: number,
  chatTitle: string | undefined,
  targetMessageId: number,
  targetUserId: number,
  targetFirstName: string,
  targetUsername?: string,
  snapshotMessageType = "unknown",
  snapshotMessagePreview = "",
  snapshotMessageContent = "",
  snapshotMediaFileId?: string,
): Promise<void> => {
  await db.run(
    `
      INSERT INTO vote_cases (
        chat_id,
        chat_title,
        target_message_id,
        target_user_id,
        target_first_name,
        target_username,
        snapshot_message_type,
        snapshot_message_preview,
        snapshot_message_content,
        snapshot_media_file_id,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'voting')
      ON CONFLICT(chat_id, target_message_id) DO UPDATE SET
        chat_title = excluded.chat_title,
        target_user_id = excluded.target_user_id,
        target_first_name = excluded.target_first_name,
        target_username = excluded.target_username,
        snapshot_message_type = excluded.snapshot_message_type,
        snapshot_message_preview = excluded.snapshot_message_preview,
        snapshot_message_content = excluded.snapshot_message_content,
        snapshot_media_file_id = excluded.snapshot_media_file_id
    `,
    chatId,
    chatTitle ?? null,
    targetMessageId,
    targetUserId,
    targetFirstName,
    targetUsername ?? null,
    snapshotMessageType,
    snapshotMessagePreview,
    snapshotMessageContent,
    snapshotMediaFileId ?? null,
  );
};

export const addVote = async (
  db: BotDb,
  chatId: number,
  targetMessageId: number,
  voterId: number,
): Promise<boolean> => {
  const result = await db.run(
    `
      INSERT OR IGNORE INTO voters (chat_id, target_message_id, voter_id)
      VALUES (?, ?, ?)
    `,
    chatId,
    targetMessageId,
    voterId,
  );

  return (result.changes ?? 0) > 0;
};

export const updateVoteCaseStatus = async (
  db: BotDb,
  chatId: number,
  targetMessageId: number,
  status: VoteCaseStatus,
): Promise<void> => {
  await db.run(
    `
      UPDATE vote_cases
      SET status = ?,
          resolved_at = CURRENT_TIMESTAMP
      WHERE chat_id = ? AND target_message_id = ?
    `,
    status,
    chatId,
    targetMessageId,
  );
};

export const updateVoteStatusMessageId = async (
  db: BotDb,
  chatId: number,
  targetMessageId: number,
  statusMsgId: number,
): Promise<void> => {
  await db.run(
    `
      UPDATE vote_cases
      SET status_msg_id = ?
      WHERE chat_id = ? AND target_message_id = ?
    `,
    statusMsgId,
    chatId,
    targetMessageId,
  );
};

export const loadOpenCases = async (
  db: BotDb,
): Promise<PersistedVoteCase[]> => {
  const rows = await db.all<OpenCaseRow[]>(
    `
      SELECT
        vc.chat_id,
        vc.chat_title,
        vc.target_message_id,
        vc.target_user_id,
        vc.target_first_name,
        vc.target_username,
        vc.snapshot_message_type,
        vc.snapshot_message_preview,
        vc.snapshot_message_content,
        vc.snapshot_media_file_id,
        vc.status,
        vc.status_msg_id,
        v.voter_id
      FROM vote_cases vc
      LEFT JOIN voters v
        ON v.chat_id = vc.chat_id
       AND v.target_message_id = vc.target_message_id
      WHERE vc.status = 'voting' OR vc.status = 'pending_admin'
      ORDER BY vc.chat_id, vc.target_message_id
    `,
  );

  const grouped = new Map<string, PersistedVoteCase>();

  for (const row of rows) {
    const key = `${row.chat_id}:${row.target_message_id}`;
    let current = grouped.get(key);

    if (!current) {
      current = {
        chatId: row.chat_id,
        chatTitle: row.chat_title ?? undefined,
        targetMessageId: row.target_message_id,
        targetUserId: row.target_user_id,
        targetFirstName: row.target_first_name,
        targetUsername: row.target_username ?? undefined,
        snapshotMessageType: row.snapshot_message_type ?? "unknown",
        snapshotMessagePreview: row.snapshot_message_preview ?? "",
        snapshotMessageContent: row.snapshot_message_content ?? "",
        snapshotMediaFileId: row.snapshot_media_file_id ?? undefined,
        status: row.status,
        statusMsgId: row.status_msg_id ?? undefined,
        voters: [],
      };

      grouped.set(key, current);
    }

    if (row.voter_id !== null) {
      current.voters.push(row.voter_id);
    }
  }

  return [...grouped.values()];
};
