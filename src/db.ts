import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";

import { LANGUAGE } from "./config/env";
import { VoteCaseStatus } from "./enums/vote-case-status";
import { DashboardStats } from "./interfaces/dashboard";
import { GlobalBan, GlobalBanHistoryRow } from "./interfaces/global-ban";
import {
  OpenCaseRow,
  PersistedFaq,
  PersistedGroup,
  PersistedRoom,
  PersistedRoomRow,
  PersistedVoteCase,
} from "./interfaces/db";

export type BotDb = Database;

export const initDatabase = async (dbPath: string): Promise<BotDb> => {
  const absolutePath = resolve(dbPath);

  await mkdir(dirname(absolutePath), { recursive: true });

  const db = await open({
    filename: absolutePath,
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA foreign_keys = ON;");
  await db.exec("PRAGMA journal_mode = WAL;");
  await db.exec("PRAGMA synchronous = NORMAL;");

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

  try {
    await db.exec(
      "ALTER TABLE group_trust_points ADD COLUMN trust_weight INTEGER NOT NULL DEFAULT 1;",
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("duplicate column name")
    ) {
      console.error(
        "[Database] Duplicate column name: trust_weight (Safe to ignore)",
      );
    } else {
      console.error(
        `[Database] Failed to add trust_weight column: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return db;
};

export const insertRoom = async (
  db: BotDb,
  roomId: string,
  ownerId: number,
  createdAt: number,
  expiresAt: number,
): Promise<void> => {
  await db.run(
    `INSERT OR IGNORE INTO chat_rooms (id, owner_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    roomId,
    ownerId,
    createdAt,
    expiresAt,
  );

  await db.run(
    `INSERT OR IGNORE INTO chat_room_participants (room_id, user_id) VALUES (?, ?)`,
    roomId,
    ownerId,
  );
};

export const addRoomParticipant = async (
  db: BotDb,
  roomId: string,
  userId: number,
): Promise<void> => {
  await db.run(
    `INSERT OR IGNORE INTO chat_room_participants (room_id, user_id) VALUES (?, ?)`,
    roomId,
    userId,
  );
};

export const removeRoomParticipant = async (
  db: BotDb,
  roomId: string,
  userId: number,
): Promise<void> => {
  await db.run(
    `DELETE FROM chat_room_participants WHERE room_id = ? AND user_id = ?`,
    roomId,
    userId,
  );
};

export const deleteRoom = async (db: BotDb, roomId: string): Promise<void> => {
  await db.run(`DELETE FROM chat_rooms WHERE id = ?`, roomId);
};

export const loadActiveRooms = async (db: BotDb): Promise<PersistedRoom[]> => {
  const now = Date.now();

  const rows = await db.all<PersistedRoomRow[]>(
    `
      SELECT r.id, r.owner_id, r.created_at, r.expires_at, p.user_id
      FROM chat_rooms r
      LEFT JOIN chat_room_participants p ON p.room_id = r.id
      WHERE r.expires_at > ?
      ORDER BY r.id
    `,
    now,
  );

  const grouped = new Map<string, PersistedRoom>();

  for (const row of rows) {
    let current = grouped.get(row.id);

    if (!current) {
      current = {
        id: row.id,
        ownerId: row.owner_id,
        participants: [],
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      };

      grouped.set(row.id, current);
    }

    if (row.user_id !== null) {
      current.participants.push(row.user_id);
    }
  }

  return [...grouped.values()];
};

export const loadGroups = async (db: BotDb): Promise<PersistedGroup[]> => {
  const rows = await db.all<{ chat_id: number; language_code: string }[]>(
    "SELECT chat_id, language_code FROM groups",
  );

  return rows.map((r) => ({
    chatId: r.chat_id,
    languageCode: r.language_code,
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
  const isActVal = isActive === false ? 0 : 1;
  const langVal = languageCode ?? LANGUAGE;

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
    langVal,
    isActVal,
    title ?? null,
    addedByUserId ?? null,
    languageCode ?? null,
    typeof isActive === "boolean" ? isActVal : null,
  );
};

export const upsertVoteCase = async (
  db: BotDb,
  chatId: number,
  chatTitle: string | undefined,
  targetMessageId: number,
  targetUserId: number,
  targetFirstName: string,
  targetUsername?: string,
  snapshotMessageType = "unknown",
  snapshotMessagePreview = "",
  snapshotMessageContent = "",
  snapshotMediaFileId?: string,
): Promise<void> => {
  await db.run(
    `
      INSERT INTO vote_cases (
        chat_id,
        chat_title,
        target_message_id,
        target_user_id,
        target_first_name,
        target_username,
        snapshot_message_type,
        snapshot_message_preview,
        snapshot_message_content,
        snapshot_media_file_id,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'voting')
      ON CONFLICT(chat_id, target_message_id) DO UPDATE SET
        chat_title = excluded.chat_title,
        target_user_id = excluded.target_user_id,
        target_first_name = excluded.target_first_name,
        target_username = excluded.target_username,
        snapshot_message_type = excluded.snapshot_message_type,
        snapshot_message_preview = excluded.snapshot_message_preview,
        snapshot_message_content = excluded.snapshot_message_content,
        snapshot_media_file_id = excluded.snapshot_media_file_id
    `,
    chatId,
    chatTitle ?? null,
    targetMessageId,
    targetUserId,
    targetFirstName,
    targetUsername ?? null,
    snapshotMessageType,
    snapshotMessagePreview,
    snapshotMessageContent,
    snapshotMediaFileId ?? null,
  );
};

export const addVote = async (
  db: BotDb,
  chatId: number,
  targetMessageId: number,
  voterId: number,
): Promise<boolean> => {
  const result = await db.run(
    `
      INSERT OR IGNORE INTO voters (chat_id, target_message_id, voter_id)
      VALUES (?, ?, ?)
    `,
    chatId,
    targetMessageId,
    voterId,
  );

  return (result.changes ?? 0) > 0;
};

export const updateVoteCaseStatus = async (
  db: BotDb,
  chatId: number,
  targetMessageId: number,
  status: VoteCaseStatus,
): Promise<void> => {
  await db.run(
    `
      UPDATE vote_cases
      SET status = ?,
          resolved_at = CURRENT_TIMESTAMP
      WHERE chat_id = ? AND target_message_id = ?
    `,
    status,
    chatId,
    targetMessageId,
  );
};

export const updateVoteStatusMessageId = async (
  db: BotDb,
  chatId: number,
  targetMessageId: number,
  statusMsgId: number,
): Promise<void> => {
  await db.run(
    `
      UPDATE vote_cases
      SET status_msg_id = ?
      WHERE chat_id = ? AND target_message_id = ?
    `,
    statusMsgId,
    chatId,
    targetMessageId,
  );
};

export const loadOpenCases = async (
  db: BotDb,
): Promise<PersistedVoteCase[]> => {
  const rows = await db.all<OpenCaseRow[]>(
    `
      SELECT
        vc.chat_id,
        vc.chat_title,
        vc.target_message_id,
        vc.target_user_id,
        vc.target_first_name,
        vc.target_username,
        vc.snapshot_message_type,
        vc.snapshot_message_preview,
        vc.snapshot_message_content,
        vc.snapshot_media_file_id,
        vc.status,
        vc.status_msg_id,
        v.voter_id
      FROM vote_cases vc
      LEFT JOIN voters v
        ON v.chat_id = vc.chat_id
       AND v.target_message_id = vc.target_message_id
      WHERE vc.status = 'voting' OR vc.status = 'pending_admin'
      ORDER BY vc.chat_id, vc.target_message_id
    `,
  );

  const grouped = new Map<string, PersistedVoteCase>();

  for (const row of rows) {
    const key = `${row.chat_id}:${row.target_message_id}`;
    let current = grouped.get(key);

    if (!current) {
      current = {
        chatId: row.chat_id,
        chatTitle: row.chat_title ?? undefined,
        targetMessageId: row.target_message_id,
        targetUserId: row.target_user_id,
        targetFirstName: row.target_first_name,
        targetUsername: row.target_username ?? undefined,
        snapshotMessageType: row.snapshot_message_type ?? "unknown",
        snapshotMessagePreview: row.snapshot_message_preview ?? "",
        snapshotMessageContent: row.snapshot_message_content ?? "",
        snapshotMediaFileId: row.snapshot_media_file_id ?? undefined,
        status: row.status,
        statusMsgId: row.status_msg_id ?? undefined,
        voters: [],
      };

      grouped.set(key, current);
    }

    if (row.voter_id !== null) {
      current.voters.push(row.voter_id);
    }
  }

  return [...grouped.values()];
};

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

  return rows.map((r) => ({
    id: r.id,
    chatId: r.chat_id,
    triggerKeyword: r.trigger_keyword,
    messageLink: r.message_link,
    createdByUserId: r.created_by_user_id ?? undefined,
    createdAt: r.created_at,
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

export const getDashboardStats = async (db: BotDb): Promise<DashboardStats> => {
  const [totalGroups] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM groups",
  );

  const [activeGroups] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM groups WHERE is_active = 1",
  );

  const [openCases] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM vote_cases WHERE status = 'voting'",
  );

  const [pendingAdmin] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM vote_cases WHERE status = 'pending_admin'",
  );

  const [resolved] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM vote_cases WHERE status NOT IN ('voting', 'pending_admin')",
  );

  const [totalVotes] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM voters",
  );

  const [totalFaqs] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM group_faqs",
  );

  const groupRows = await db.all<
    {
      chat_id: number;
      title: string | null;
      language_code: string;
      is_active: number;
      open_cases: number;
      total_faqs: number;
      added_at: string;
    }[]
  >(
    `
      SELECT
        g.chat_id,
        g.title,
        g.language_code,
        g.is_active,
        g.added_at,
        COUNT(DISTINCT vc.target_message_id) as open_cases,
        COUNT(DISTINCT f.id) as total_faqs
      FROM groups g
      LEFT JOIN vote_cases vc
        ON vc.chat_id = g.chat_id
       AND vc.status IN ('voting', 'pending_admin')
      LEFT JOIN group_faqs f
        ON f.chat_id = g.chat_id
      GROUP BY g.chat_id
      ORDER BY g.added_at DESC
    `,
  );

  return {
    totalGroups: totalGroups.count,
    activeGroups: activeGroups.count,
    openVoteCases: openCases.count,
    pendingAdminCases: pendingAdmin.count,
    resolvedCases: resolved.count,
    totalVotes: totalVotes.count,
    totalFaqs: totalFaqs.count,
    groups: groupRows.map((row) => ({
      chatId: row.chat_id,
      title: row.title,
      language: row.language_code,
      isActive: row.is_active === 1,
      openCases: row.open_cases,
      totalFaqs: row.total_faqs,
      addedAt: row.added_at,
    })),
  };
};

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
    `SELECT group_name, reason, message_text, date
     FROM global_bans
     WHERE user_id = ?
     ORDER BY date DESC
     LIMIT ?`,
    userId,
    limit,
  );
};

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

    await db.run("DELETE FROM groups WHERE chat_id = ?", oldChatId);

    await db.exec("COMMIT;");
  } catch (error) {
    await db.exec("ROLLBACK;");

    throw error;
  }
};
