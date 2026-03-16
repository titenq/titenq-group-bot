import { LANGUAGE } from "../config/env";
import { BotDb } from "./database";
import { PersistedGroup } from "../interfaces";

export const loadGroups = async (db: BotDb): Promise<PersistedGroup[]> => {
  const rows = await db.all<{ chat_id: number; language_code: string }[]>(
    "SELECT chat_id, language_code FROM groups",
  );

  return rows.map((row) => ({
    chatId: row.chat_id,
    languageCode: row.language_code,
  }));
};

export const upsertGroupData = async (
  db: BotDb,
  chatId: number,
  title?: string,
  addedByUserId?: number,
  languageCode?: string,
  isActive?: boolean,
): Promise<void> => {
  const isActiveValue = isActive === false ? 0 : 1;
  const languageValue = languageCode ?? LANGUAGE;

  await db.run(
    `
      INSERT INTO groups (chat_id, title, added_by_user_id, language_code, is_active) 
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(chat_id) DO UPDATE SET 
        title = COALESCE(?, groups.title),
        added_by_user_id = COALESCE(?, groups.added_by_user_id),
        language_code = COALESCE(?, groups.language_code),
        is_active = COALESCE(?, groups.is_active)
    `,
    chatId,
    title ?? null,
    addedByUserId ?? null,
    languageValue,
    isActiveValue,
    title ?? null,
    addedByUserId ?? null,
    languageCode ?? null,
    typeof isActive === "boolean" ? isActiveValue : null,
  );
};
