import { BotDb } from "./database";
import { GroupWelcomeMessage, GroupWelcomeRow } from "../interfaces";

export const getGroupWelcomeMessage = async (
  db: BotDb,
  chatId: number,
): Promise<GroupWelcomeMessage | null> => {
  const row = await db.get<GroupWelcomeRow>(
    `
      SELECT chat_id, template, updated_by_user_id, updated_at
      FROM group_welcome_messages
      WHERE chat_id = ?
    `,
    chatId,
  );

  if (!row) {
    return null;
  }

  return {
    chatId: row.chat_id,
    template: row.template,
    updatedAt: row.updated_at ?? undefined,
    updatedByUserId: row.updated_by_user_id ?? undefined,
  };
};

export const upsertGroupWelcomeMessage = async (
  db: BotDb,
  chatId: number,
  template: string,
  adminId: number,
): Promise<GroupWelcomeMessage> => {
  await db.run(
    `
      INSERT INTO group_welcome_messages (
        chat_id,
        template,
        updated_by_user_id,
        updated_at
      )
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(chat_id) DO UPDATE SET
        template = excluded.template,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = CURRENT_TIMESTAMP
    `,
    chatId,
    template,
    adminId,
  );

  const welcomeMessage = await getGroupWelcomeMessage(db, chatId);

  if (!welcomeMessage) {
    throw new Error(
      `[Database] Failed to load welcome message after upsert for chat ${chatId}`,
    );
  }

  return welcomeMessage;
};
