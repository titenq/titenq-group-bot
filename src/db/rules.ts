import { BotDb } from "./database";
import { GroupRules, GroupRulesRow } from "../interfaces";

export const getGroupRules = async (
  db: BotDb,
  chatId: number,
): Promise<GroupRules | null> => {
  const row = await db.get<GroupRulesRow>(
    `
      SELECT chat_id, message_link, updated_by_user_id, updated_at
      FROM group_rules
      WHERE chat_id = ?
    `,
    chatId,
  );

  if (!row) {
    return null;
  }

  return {
    chatId: row.chat_id,
    messageLink: row.message_link,
    updatedAt: row.updated_at ?? undefined,
    updatedByUserId: row.updated_by_user_id ?? undefined,
  };
};

export const upsertGroupRules = async (
  db: BotDb,
  chatId: number,
  messageLink: string,
  adminId: number,
): Promise<GroupRules> => {
  await db.run(
    `
      INSERT INTO group_rules (
        chat_id,
        message_link,
        updated_by_user_id,
        updated_at
      )
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(chat_id) DO UPDATE SET
        message_link = excluded.message_link,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = CURRENT_TIMESTAMP
    `,
    chatId,
    messageLink,
    adminId,
  );

  const groupRules = await getGroupRules(db, chatId);

  if (!groupRules) {
    throw new Error(
      `[Database] Failed to load rules after upsert for chat ${chatId}`,
    );
  }

  return groupRules;
};

export const removeGroupRules = async (
  db: BotDb,
  chatId: number,
): Promise<boolean> => {
  const result = await db.run(
    `
      DELETE FROM group_rules
      WHERE chat_id = ?
    `,
    chatId,
  );

  return (result.changes ?? 0) > 0;
};
