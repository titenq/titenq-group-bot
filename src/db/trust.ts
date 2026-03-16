import { BotDb } from "./database";

export const addVip = async (
  db: BotDb,
  chatId: number,
  userId: number,
  weight = 1,
): Promise<void> => {
  await db.run(
    `
      INSERT INTO group_trust_points (chat_id, user_id, is_vip, trust_weight)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(chat_id, user_id) DO UPDATE SET is_vip = 1, trust_weight = ?
    `,
    chatId,
    userId,
    weight,
    weight,
  );
};

export const removeVip = async (
  db: BotDb,
  chatId: number,
  userId: number,
): Promise<boolean> => {
  const result = await db.run(
    "UPDATE group_trust_points SET is_vip = 0, trust_weight = 1 WHERE chat_id = ? AND user_id = ?",
    chatId,
    userId,
  );

  return (result.changes ?? 0) > 0;
};

export const listVips = async (
  db: BotDb,
  chatId: number,
): Promise<{ user_id: number; trust_weight: number; added_at: string }[]> => {
  return db.all<{ user_id: number; trust_weight: number; added_at: string }[]>(
    "SELECT user_id, trust_weight, added_at FROM group_trust_points WHERE chat_id = ? AND is_vip = 1 ORDER BY added_at DESC",
    chatId,
  );
};
