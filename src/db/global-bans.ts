import { BotDb } from "./database";
import { GlobalBan, GlobalBanHistoryRow } from "../interfaces";

export const addGlobalBan = async (
  db: BotDb,
  ban: Omit<GlobalBan, "id" | "date">,
): Promise<void> => {
  await db.run(
    `INSERT INTO global_bans (
      user_id, username, group_id, group_name, message_text, reason, admin_id, date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())`,
    ban.user_id,
    ban.username,
    ban.group_id,
    ban.group_name,
    ban.message_text,
    ban.reason,
    ban.admin_id,
  );
};

export const getGlobalBanCount = async (
  db: BotDb,
  userId: number,
): Promise<number> => {
  const result = await db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM global_bans WHERE user_id = ?",
    userId,
  );

  return result?.count ?? 0;
};

export const getGlobalBanHistory = async (
  db: BotDb,
  userId: number,
  limit = 5,
): Promise<GlobalBanHistoryRow[]> => {
  return db.all<GlobalBanHistoryRow[]>(
    `SELECT
       COALESCE(groups.title, global_bans.group_name) AS group_name,
       global_bans.reason,
       global_bans.message_text,
       global_bans.date
     FROM global_bans
     LEFT JOIN groups ON groups.chat_id = global_bans.group_id
     WHERE global_bans.user_id = ?
     ORDER BY date DESC
     LIMIT ?`,
    userId,
    limit,
  );
};

export const getGlobalBanUserByUsername = async (
  db: BotDb,
  username: string,
): Promise<Pick<GlobalBan, "user_id" | "username"> | null> => {
  return (
    (await db.get<Pick<GlobalBan, "user_id" | "username">>(
      `SELECT user_id, username
       FROM global_bans
       WHERE username IS NOT NULL
         AND lower(username) = lower(?)
       ORDER BY date DESC
       LIMIT 1`,
      username,
    )) ?? null
  );
};

export const removeGlobalBansByUserId = async (
  db: BotDb,
  userId: number,
): Promise<number> => {
  const result = await db.run(
    "DELETE FROM global_bans WHERE user_id = ?",
    userId,
  );

  return result.changes ?? 0;
};
