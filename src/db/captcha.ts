import { BotDb } from "./database";
import { CaptchaChallenge, CaptchaChallengeRow } from "../interfaces";

export const upsertCaptchaChallenge = async (
  db: BotDb,
  challenge: CaptchaChallenge,
): Promise<void> => {
  await db.run(
    `
      INSERT INTO captcha_challenges (
        chat_id,
        user_id,
        challenge_message_id,
        available_item_keys_json,
        is_test_mode,
        target_sequence_keys_json,
        selected_sequence_keys_json,
        attempts,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(chat_id, user_id) DO UPDATE SET
        challenge_message_id = excluded.challenge_message_id,
        available_item_keys_json = excluded.available_item_keys_json,
        is_test_mode = excluded.is_test_mode,
        target_sequence_keys_json = excluded.target_sequence_keys_json,
        selected_sequence_keys_json = excluded.selected_sequence_keys_json,
        attempts = excluded.attempts,
        expires_at = excluded.expires_at
    `,
    challenge.chatId,
    challenge.userId,
    challenge.challengeMessageId,
    JSON.stringify(challenge.availableItemKeys),
    challenge.isTestMode ? 1 : 0,
    JSON.stringify(challenge.targetSequenceKeys),
    JSON.stringify(challenge.selectedSequenceKeys),
    challenge.attempts,
    challenge.expiresAt,
  );
};

const mapCaptchaChallengeRow = (
  row?: CaptchaChallengeRow,
): CaptchaChallenge | null => {
  if (!row) {
    return null;
  }

  return {
    chatId: row.chat_id,
    userId: row.user_id,
    challengeMessageId: row.challenge_message_id,
    availableItemKeys: JSON.parse(row.available_item_keys_json) as string[],
    isTestMode: row.is_test_mode === 1,
    targetSequenceKeys: JSON.parse(row.target_sequence_keys_json) as string[],
    selectedSequenceKeys: JSON.parse(
      row.selected_sequence_keys_json,
    ) as string[],
    attempts: row.attempts,
    expiresAt: row.expires_at,
  };
};

export const getCaptchaChallenge = async (
  db: BotDb,
  chatId: number,
  userId: number,
): Promise<CaptchaChallenge | null> => {
  const row = await db.get<CaptchaChallengeRow>(
    `
      SELECT *
      FROM captcha_challenges
      WHERE chat_id = ? AND user_id = ?
    `,
    chatId,
    userId,
  );

  return mapCaptchaChallengeRow(row);
};

export const loadActiveCaptchaChallenges = async (
  db: BotDb,
): Promise<CaptchaChallenge[]> => {
  const rows = await db.all<CaptchaChallengeRow[]>(
    `
      SELECT *
      FROM captcha_challenges
    `,
  );

  return rows
    .map((row) => mapCaptchaChallengeRow(row))
    .filter((challenge): challenge is CaptchaChallenge => challenge !== null);
};

export const updateCaptchaChallengeProgress = async (
  db: BotDb,
  chatId: number,
  userId: number,
  selectedSequenceKeys: string[],
  attempts: number,
): Promise<CaptchaChallenge | null> => {
  await db.run(
    `
      UPDATE captcha_challenges
      SET selected_sequence_keys_json = ?, attempts = ?
      WHERE chat_id = ? AND user_id = ?
    `,
    JSON.stringify(selectedSequenceKeys),
    attempts,
    chatId,
    userId,
  );

  return getCaptchaChallenge(db, chatId, userId);
};

export const deleteCaptchaChallenge = async (
  db: BotDb,
  chatId: number,
  userId: number,
): Promise<void> => {
  await db.run(
    `
      DELETE FROM captcha_challenges
      WHERE chat_id = ? AND user_id = ?
    `,
    chatId,
    userId,
  );
};
