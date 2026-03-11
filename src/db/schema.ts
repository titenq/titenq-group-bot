import { BotDb } from "./database";

export const createSchema = async (db: BotDb): Promise<void> => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      chat_id INTEGER PRIMARY KEY,
      title TEXT,
      language_code TEXT NOT NULL,
      added_by_user_id INTEGER,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS vote_cases (
      chat_id INTEGER NOT NULL,
      chat_title TEXT,
      target_message_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      target_first_name TEXT NOT NULL,
      target_username TEXT,
      snapshot_message_type TEXT NOT NULL DEFAULT 'unknown',
      snapshot_message_preview TEXT NOT NULL DEFAULT '',
      snapshot_message_content TEXT NOT NULL DEFAULT '',
      snapshot_media_file_id TEXT,
      status TEXT NOT NULL DEFAULT 'voting',
      status_msg_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      PRIMARY KEY (chat_id, target_message_id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS voters (
      chat_id INTEGER NOT NULL,
      target_message_id INTEGER NOT NULL,
      voter_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chat_id, target_message_id, voter_id),
      FOREIGN KEY (chat_id, target_message_id)
        REFERENCES vote_cases(chat_id, target_message_id)
        ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS group_faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      trigger_keyword TEXT NOT NULL,
      message_link TEXT NOT NULL,
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(chat_id, trigger_keyword),
      FOREIGN KEY(chat_id) REFERENCES groups(chat_id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id TEXT PRIMARY KEY,
      owner_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_room_participants (
      room_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS global_bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT,
      group_id INTEGER NOT NULL,
      group_name TEXT NOT NULL,
      message_text TEXT,
      reason TEXT,
      admin_id INTEGER NOT NULL,
      date INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_global_bans_user_id ON global_bans(user_id);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS group_trust_points (
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      is_vip BOOLEAN NOT NULL DEFAULT 0,
      trust_weight INTEGER NOT NULL DEFAULT 1,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chat_id, user_id),
      FOREIGN KEY (chat_id) REFERENCES groups(chat_id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS group_features (
      chat_id INTEGER NOT NULL,
      feature_key TEXT NOT NULL,
      is_enabled BOOLEAN NOT NULL DEFAULT 1,
      updated_by_user_id INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chat_id, feature_key),
      FOREIGN KEY (chat_id) REFERENCES groups(chat_id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS captcha_challenges (
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      challenge_message_id INTEGER NOT NULL,
      available_item_keys_json TEXT NOT NULL,
      is_test_mode BOOLEAN NOT NULL DEFAULT 0,
      target_sequence_keys_json TEXT NOT NULL,
      selected_sequence_keys_json TEXT NOT NULL DEFAULT '[]',
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chat_id, user_id),
      FOREIGN KEY (chat_id) REFERENCES groups(chat_id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS group_welcome_messages (
      chat_id INTEGER PRIMARY KEY,
      template TEXT NOT NULL,
      updated_by_user_id INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES groups(chat_id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS group_rules (
      chat_id INTEGER PRIMARY KEY,
      message_link TEXT NOT NULL,
      updated_by_user_id INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES groups(chat_id) ON DELETE CASCADE
    );
  `);
};
