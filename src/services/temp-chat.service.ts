import { randomBytes } from "node:crypto";

import i18next from "i18next";
import { Telegram } from "telegraf";

import {
  BOT_USERNAME,
  CHAT_EXPIRATION_TIME,
  MAX_USERS_PER_ROOM,
} from "../config/env";
import {
  addRoomParticipant,
  BotDb,
  deleteRoom as dbDeleteRoom,
  insertRoom,
  removeRoomParticipant,
} from "../db";
import { CloseRoomResult } from "../enums/close-room-result";
import { JoinRoomResult } from "../enums/join-room-result";
import { LeaveRoomResult } from "../enums/leave-room-result";
import { PersistedRoom } from "../interfaces/db";
import { MessageQueueService } from "../interfaces/message-queue";
import { Room, UserRateLimit } from "../interfaces/room";

export const createTempChatService = (
  telegram: Telegram,
  messageQueue: MessageQueueService,
  db: BotDb,
) => {
  const rooms: Map<string, Room> = new Map();
  const userRooms: Map<number, string> = new Map();
  const rateLimits: Map<number, UserRateLimit> = new Map();
  const timeouts: Map<string, NodeJS.Timeout> = new Map();

  const notifyParticipants = async (
    room: Room,
    message: string,
  ): Promise<void> => {
    for (const participantId of room.participants) {
      try {
        await telegram.sendMessage(participantId, message);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "unknown error";

        console.error(
          `[TempChat] Failed to notify ${participantId}:`,
          errorMessage,
        );
      }
    }
  };

  const removeRoomFromMemory = (roomId: string): void => {
    const room = rooms.get(roomId);

    if (room) {
      for (const participantId of room.participants) {
        userRooms.delete(participantId);
      }
    }

    const timeout = timeouts.get(roomId);

    if (timeout) {
      clearTimeout(timeout);
    }

    rooms.delete(roomId);
    timeouts.delete(roomId);
  };

  const expireRoom = async (roomId: string): Promise<void> => {
    const room = rooms.get(roomId);

    if (!room) {
      return;
    }

    await notifyParticipants(
      room,
      i18next.t("commands.temp_chat_expired_notify"),
    );

    removeRoomFromMemory(roomId);
    await dbDeleteRoom(db, roomId);
  };

  const scheduleExpiration = (roomId: string): void => {
    const room = rooms.get(roomId);

    if (!room) {
      return;
    }

    const delay = room.expiresAt - Date.now();

    if (delay <= 0) {
      expireRoom(roomId).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : "unknown error";

        console.error(
          `[TempChat] Error expiring room ${roomId}:`,
          errorMessage,
        );
      });
      return;
    }

    const timeout = setTimeout(() => {
      expireRoom(roomId).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : "unknown error";

        console.error(
          `[TempChat] Error expiring room ${roomId}:`,
          errorMessage,
        );
      });
    }, delay);

    timeouts.set(roomId, timeout);
  };

  const loadRooms = (persistedRooms: PersistedRoom[]): void => {
    for (const persisted of persistedRooms) {
      const room: Room = {
        id: persisted.id,
        ownerId: persisted.ownerId,
        participants: persisted.participants,
        createdAt: persisted.createdAt,
        expiresAt: persisted.expiresAt,
      };

      rooms.set(room.id, room);

      for (const userId of room.participants) {
        userRooms.set(userId, room.id);
      }

      scheduleExpiration(room.id);
    }

    console.log(
      `[TempChat] ${persistedRooms.length} room(s) loaded from database.`,
    );
  };

  const createRoom = (ownerId: number): Room => {
    const roomId = randomBytes(2).toString("hex").toUpperCase();
    const now = Date.now();
    const expiresAt = now + CHAT_EXPIRATION_TIME * 60 * 1000;

    const room: Room = {
      id: roomId,
      ownerId,
      participants: [ownerId],
      createdAt: now,
      expiresAt,
    };

    rooms.set(roomId, room);
    userRooms.set(ownerId, roomId);
    scheduleExpiration(roomId);

    insertRoom(db, roomId, ownerId, now, expiresAt).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "unknown error";
      console.error(
        `[TempChat] Failed to persist room ${roomId}:`,
        errorMessage,
      );
    });

    return room;
  };

  const leaveRoom = (userId: number): LeaveRoomResult => {
    const roomId = userRooms.get(userId);

    if (!roomId) {
      return LeaveRoomResult.NOT_IN_ROOM;
    }

    const room = rooms.get(roomId);

    if (room) {
      room.participants = room.participants.filter(
        (participantId) => participantId !== userId,
      );

      if (room.participants.length === 0) {
        removeRoomFromMemory(roomId);
        dbDeleteRoom(db, roomId).catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : "unknown error";

          console.error(
            `[TempChat] Failed to delete empty room ${roomId}:`,
            errorMessage,
          );
        });
      } else {
        removeRoomParticipant(db, roomId, userId).catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : "unknown error";

          console.error(
            `[TempChat] Failed to remove participant ${userId} from room ${roomId}:`,
            errorMessage,
          );
        });
      }
    }

    userRooms.delete(userId);

    return LeaveRoomResult.LEFT;
  };

  const joinRoom = (roomId: string, userId: number): JoinRoomResult => {
    const room = rooms.get(roomId);

    if (!room) {
      return JoinRoomResult.NOT_FOUND;
    }

    if (room.participants.includes(userId)) {
      return JoinRoomResult.ALREADY_IN_SAME;
    }

    if (room.participants.length >= MAX_USERS_PER_ROOM) {
      return JoinRoomResult.FULL;
    }

    const previousRoomId = userRooms.get(userId);

    if (previousRoomId && previousRoomId !== roomId) {
      leaveRoom(userId);
    }

    room.participants.push(userId);
    userRooms.set(userId, roomId);

    addRoomParticipant(db, roomId, userId).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "unknown error";

      console.error(
        `[TempChat] Failed to persist participant ${userId}:`,
        errorMessage,
      );
    });

    return JoinRoomResult.JOINED;
  };

  const closeRoom = async (
    roomId: string,
    requesterId: number,
  ): Promise<CloseRoomResult> => {
    const room = rooms.get(roomId);

    if (!room) {
      return CloseRoomResult.NOT_FOUND;
    }

    if (room.ownerId !== requesterId) {
      return CloseRoomResult.NO_PERMISSION;
    }

    await notifyParticipants(
      room,
      i18next.t("commands.temp_chat_closed_by_owner"),
    );

    removeRoomFromMemory(roomId);

    await dbDeleteRoom(db, roomId);

    return CloseRoomResult.CLOSED;
  };

  const getRoomByUser = (userId: number): Room | undefined => {
    const roomId = userRooms.get(userId);

    if (!roomId) {
      return undefined;
    }

    return rooms.get(roomId);
  };

  const getRoom = (roomId: string): Room | undefined => rooms.get(roomId);

  const getAllRooms = (): Room[] => Array.from(rooms.values());

  const isRateLimited = (userId: number, maxMessages: number): boolean => {
    const now = Date.now();
    const limit = rateLimits.get(userId);

    if (!limit || now - limit.lastMessageAt > 10_000) {
      rateLimits.set(userId, { count: 1, lastMessageAt: now });

      return false;
    }

    if (limit.count >= maxMessages) {
      return true;
    }

    limit.count += 1;

    return false;
  };

  const getInviteLink = (roomId: string): string =>
    `https://t.me/${BOT_USERNAME}?start=${roomId}`;

  const relay = (
    room: Room,
    senderId: number,
    senderName: string,
    sourceChatId: number,
    messageId: number,
  ): void => {
    const targets = room.participants.filter(
      (participantId) => participantId !== senderId,
    );

    if (targets.length === 0) {
      return;
    }

    messageQueue.addJob({
      roomId: room.id,
      sourceChatId,
      messageId,
      targetChatIds: targets,
      authorName: senderName,
    });
  };

  return {
    loadRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    closeRoom,
    getRoomByUser,
    getRoom,
    getAllRooms,
    isRateLimited,
    getInviteLink,
    relay,
  };
};

export type TempChatService = ReturnType<typeof createTempChatService>;
