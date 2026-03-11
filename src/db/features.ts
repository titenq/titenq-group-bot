import { BotDb } from "./database";
import {
  DEFAULT_DISABLED_GROUP_FEATURES,
  GROUP_FEATURES,
  GroupFeature,
} from "../enums";
import { GroupFeatureRow, GroupFeatureState } from "../interfaces";

export const isUserVip = async (
  db: BotDb,
  chatId: number,
  userId: number,
): Promise<boolean> => {
  const row = await db.get<{ is_vip: number }>(
    "SELECT is_vip FROM group_trust_points WHERE chat_id = ? AND user_id = ?",
    chatId,
    userId,
  );

  return row?.is_vip === 1;
};

export const getUserTrustWeight = async (
  db: BotDb,
  chatId: number,
  userId: number,
): Promise<number> => {
  const row = await db.get<{ trust_weight: number }>(
    "SELECT trust_weight FROM group_trust_points WHERE chat_id = ? AND user_id = ? AND is_vip = 1",
    chatId,
    userId,
  );

  return row?.trust_weight ?? 1;
};

export const getGroupFeatures = async (
  db: BotDb,
  chatId: number,
): Promise<GroupFeatureState[]> => {
  const rows = await db.all<GroupFeatureRow[]>(
    `
      SELECT chat_id, feature_key, is_enabled, updated_by_user_id, updated_at
      FROM group_features
      WHERE chat_id = ?
    `,
    chatId,
  );

  const rowsByKey = new Map(rows.map((row) => [row.feature_key, row]));

  return GROUP_FEATURES.map((featureKey) => {
    const row = rowsByKey.get(featureKey);
    const isEnabledByDefault = !DEFAULT_DISABLED_GROUP_FEATURES.has(featureKey);

    return {
      featureKey,
      isEnabled: row ? row.is_enabled === 1 : isEnabledByDefault,
      updatedAt: row?.updated_at ?? undefined,
      updatedByUserId: row?.updated_by_user_id ?? undefined,
    };
  });
};

export const isGroupFeatureEnabled = async (
  db: BotDb,
  chatId: number,
  featureKey: GroupFeature,
): Promise<boolean> => {
  const row = await db.get<{ is_enabled: number }>(
    `
      SELECT is_enabled
      FROM group_features
      WHERE chat_id = ? AND feature_key = ?
    `,
    chatId,
    featureKey,
  );

  return row
    ? row.is_enabled === 1
    : !DEFAULT_DISABLED_GROUP_FEATURES.has(featureKey);
};

export const toggleGroupFeature = async (
  db: BotDb,
  chatId: number,
  featureKey: GroupFeature,
  adminId: number,
): Promise<GroupFeatureState> => {
  const currentState = await isGroupFeatureEnabled(db, chatId, featureKey);
  const nextState = !currentState;

  await db.run(
    `
      INSERT INTO group_features (
        chat_id,
        feature_key,
        is_enabled,
        updated_by_user_id,
        updated_at
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(chat_id, feature_key) DO UPDATE SET
        is_enabled = excluded.is_enabled,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = CURRENT_TIMESTAMP
    `,
    chatId,
    featureKey,
    nextState ? 1 : 0,
    adminId,
  );

  const row = await db.get<GroupFeatureRow>(
    `
      SELECT chat_id, feature_key, is_enabled, updated_by_user_id, updated_at
      FROM group_features
      WHERE chat_id = ? AND feature_key = ?
    `,
    chatId,
    featureKey,
  );

  return {
    featureKey,
    isEnabled: row ? row.is_enabled === 1 : nextState,
    updatedAt: row?.updated_at ?? undefined,
    updatedByUserId: row?.updated_by_user_id ?? undefined,
  };
};
