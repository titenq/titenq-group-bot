import { BotDb } from "./database";

export const migrateChatData = async (
  db: BotDb,
  oldChatId: number,
  newChatId: number,
): Promise<void> => {
  await db.exec("BEGIN TRANSACTION;");

  try {
    await db.run(
      `
        INSERT OR IGNORE INTO groups (chat_id, title, language_code, added_by_user_id, added_at, is_active)
        SELECT ?, title, language_code, added_by_user_id, added_at, is_active
        FROM groups WHERE chat_id = ?
      `,
      newChatId,
      oldChatId,
    );

    await db.run(
      "UPDATE vote_cases SET chat_id = ? WHERE chat_id = ?",
      newChatId,
      oldChatId,
    );

    await db.run(
      "UPDATE voters SET chat_id = ? WHERE chat_id = ?",
      newChatId,
      oldChatId,
    );

    await db.run(
      "UPDATE group_faqs SET chat_id = ? WHERE chat_id = ?",
      newChatId,
      oldChatId,
    );

    await db.run(
      "UPDATE group_trust_points SET chat_id = ? WHERE chat_id = ?",
      newChatId,
      oldChatId,
    );

    await db.run(
      "UPDATE group_features SET chat_id = ? WHERE chat_id = ?",
      newChatId,
      oldChatId,
    );

    await db.run(
      "UPDATE captcha_challenges SET chat_id = ? WHERE chat_id = ?",
      newChatId,
      oldChatId,
    );

    await db.run(
      "UPDATE group_welcome_messages SET chat_id = ? WHERE chat_id = ?",
      newChatId,
      oldChatId,
    );

    await db.run(
      "UPDATE group_rules SET chat_id = ? WHERE chat_id = ?",
      newChatId,
      oldChatId,
    );

    await db.run("DELETE FROM groups WHERE chat_id = ?", oldChatId);
    await db.exec("COMMIT;");
  } catch (error) {
    await db.exec("ROLLBACK;");

    throw error;
  }
};
