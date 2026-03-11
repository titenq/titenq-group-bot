import { BotDb } from "./database";
import { PersistedRoom, PersistedRoomRow } from "../interfaces";

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
