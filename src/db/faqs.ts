import { BotDb } from "./database";
import { PersistedFaq } from "../interfaces";

export const upsertGroupFaq = async (
  db: BotDb,
  chatId: number,
  triggerKeyword: string,
  messageLink: string,
  createdByUserId?: number,
): Promise<void> => {
  await db.run(
    `
      INSERT INTO group_faqs (chat_id, trigger_keyword, message_link, created_by_user_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(chat_id, trigger_keyword) DO UPDATE SET
        message_link = excluded.message_link,
        created_by_user_id = excluded.created_by_user_id
    `,
    chatId,
    triggerKeyword,
    messageLink,
    createdByUserId ?? null,
  );
};

export const getGroupFaq = async (
  db: BotDb,
  chatId: number,
  triggerKeyword: string,
): Promise<string | null> => {
  const row = await db.get<{ message_link: string }>(
    `
      SELECT message_link
      FROM group_faqs
      WHERE chat_id = ? AND trigger_keyword = ?
    `,
    chatId,
    triggerKeyword,
  );

  return row ? row.message_link : null;
};

export const listGroupFaqs = async (
  db: BotDb,
  chatId: number,
): Promise<PersistedFaq[]> => {
  const rows = await db.all<
    {
      id: number;
      chat_id: number;
      trigger_keyword: string;
      message_link: string;
      created_by_user_id: number | null;
      created_at: string;
    }[]
  >(
    `
      SELECT id, chat_id, trigger_keyword, message_link, created_by_user_id, created_at
      FROM group_faqs
      WHERE chat_id = ?
      ORDER BY trigger_keyword ASC
    `,
    chatId,
  );

  return rows.map((row) => ({
    id: row.id,
    chatId: row.chat_id,
    triggerKeyword: row.trigger_keyword,
    messageLink: row.message_link,
    createdByUserId: row.created_by_user_id ?? undefined,
    createdAt: row.created_at,
  }));
};

export const removeGroupFaq = async (
  db: BotDb,
  chatId: number,
  triggerKeyword: string,
): Promise<boolean> => {
  const result = await db.run(
    `
      DELETE FROM group_faqs
      WHERE chat_id = ? AND trigger_keyword = ?
    `,
    chatId,
    triggerKeyword,
  );

  return (result.changes ?? 0) > 0;
};
