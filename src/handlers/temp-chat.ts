import { Composer } from "telegraf";
import { Message } from "telegraf/types";

import { BOT_OWNER_ID, MAX_MESSAGES_PER_10_SECONDS } from "../config/env";
import { CloseRoomResult, JoinRoomResult, LeaveRoomResult } from "../enums";
import { BotContext } from "../interfaces";
import { tempChatInviteMarkup } from "../markups/temp-chat-invite";

export const tempChatHandlers = new Composer<BotContext>();

tempChatHandlers.command("start", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const roomId = args[0]?.trim().toUpperCase();

  if (!roomId) {
    return;
  }

  const result = ctx.tempChatService.joinRoom(
    roomId,
    ctx.from.id,
    ctx.from.first_name,
  );

  if (result === JoinRoomResult.NOT_FOUND) {
    await ctx.reply(ctx.t("commands.temp_chat_not_found"));

    return;
  }

  if (result === JoinRoomResult.FULL) {
    await ctx.reply(ctx.t("commands.temp_chat_full"));

    return;
  }

  if (result === JoinRoomResult.ALREADY_IN_SAME) {
    await ctx.reply(ctx.t("commands.temp_chat_already_in"));

    return;
  }

  const room = ctx.tempChatService.getRoom(roomId);

  await ctx.telegram.sendMessage(
    ctx.from.id,
    ctx.t("commands.temp_chat_joined", { roomId, name: ctx.from.first_name }),
    { parse_mode: "HTML" },
  );

  if (room) {
    const senderName = ctx.from.first_name;

    for (const participantId of room.participants) {
      if (participantId === ctx.from.id) {
        continue;
      }

      try {
        await ctx.telegram.sendMessage(
          participantId,
          ctx.t("commands.temp_chat_user_joined", { name: senderName, roomId }),
          { parse_mode: "HTML" },
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "unknown error";

        console.error(
          `[TempChat] Failed to notify participant ${participantId}:`,
          errorMessage,
        );
      }
    }
  }
});

tempChatHandlers.command("chat", async (ctx) => {
  console.log(`[TempChat] /chat received from user ${ctx.from.id}`);

  const parts = ctx.message.text.split(" ");
  const subcommand = parts[1]?.trim().toLowerCase();

  if (subcommand === "close") {
    const room = ctx.tempChatService.getRoomByUser(ctx.from.id);

    if (!room) {
      await ctx.reply(ctx.t("commands.temp_chat_not_in_room"));

      return;
    }

    const result = await ctx.tempChatService.closeRoom(room.id, ctx.from.id);

    if (result === CloseRoomResult.NO_PERMISSION) {
      await ctx.reply(ctx.t("commands.temp_chat_no_permission"));

      return;
    }

    await ctx.reply(ctx.t("commands.temp_chat_closed"));

    return;
  }

  if (subcommand === "exit" || subcommand === "leave") {
    const result = ctx.tempChatService.leaveRoom(
      ctx.from.id,
      ctx.from.first_name,
    );

    if (result === LeaveRoomResult.NOT_IN_ROOM) {
      await ctx.reply(ctx.t("commands.temp_chat_not_in_room"));

      return;
    }

    await ctx.reply(ctx.t("commands.temp_chat_left"));

    return;
  }

  if (subcommand && subcommand.length >= 2) {
    const roomId = subcommand.toUpperCase();
    const result = ctx.tempChatService.joinRoom(
      roomId,
      ctx.from.id,
      ctx.from.first_name,
    );

    if (result === JoinRoomResult.NOT_FOUND) {
      await ctx.reply(ctx.t("commands.temp_chat_not_found"));

      return;
    }

    if (result === JoinRoomResult.FULL) {
      await ctx.reply(ctx.t("commands.temp_chat_full"));

      return;
    }

    if (result === JoinRoomResult.ALREADY_IN_SAME) {
      await ctx.reply(ctx.t("commands.temp_chat_already_in"));

      return;
    }

    const room = ctx.tempChatService.getRoom(roomId);

    await ctx.telegram.sendMessage(
      ctx.from.id,
      ctx.t("commands.temp_chat_joined", {
        roomId,
        name: ctx.from.first_name,
      }),
      { parse_mode: "HTML" },
    );

    if (room) {
      const senderName = ctx.from.first_name;

      for (const participantId of room.participants) {
        if (participantId === ctx.from.id) {
          continue;
        }

        try {
          await ctx.telegram.sendMessage(
            participantId,
            ctx.t("commands.temp_chat_user_joined", {
              name: senderName,
              roomId,
            }),
            { parse_mode: "HTML" },
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "unknown error";

          console.error(
            `[TempChat] Falha ao notificar participante ${participantId}:`,
            errorMessage,
          );
        }
      }
    }

    return;
  }

  try {
    const room = ctx.tempChatService.createRoom(ctx.from.id);
    const inviteLink = ctx.tempChatService.getInviteLink(room.id);
    const minutesLeft = Math.round((room.expiresAt - Date.now()) / 60000);

    await ctx.reply(
      ctx.t("commands.temp_chat_created", {
        roomId: room.id,
        minutes: minutesLeft,
      }),
      {
        parse_mode: "HTML",
        ...tempChatInviteMarkup(ctx.t, inviteLink),
      },
    );

    await ctx.telegram.sendMessage(
      ctx.from.id,
      ctx.t("commands.temp_chat_joined", {
        roomId: room.id,
        name: ctx.from.first_name,
      }),
      { parse_mode: "HTML" },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "unknown error";

    console.error("[TempChat] Error creating room:", errorMessage);

    await ctx.reply(ctx.t("commands.temp_chat_error"));
  }
});

tempChatHandlers.command("chats", async (ctx) => {
  if (ctx.from.id !== BOT_OWNER_ID) {
    return;
  }

  const rooms = ctx.tempChatService.getAllRooms();

  if (rooms.length === 0) {
    await ctx.reply(ctx.t("commands.temp_chats_empty"));

    return;
  }

  const lines = rooms.map((room) => {
    const remainingMs = room.expiresAt - Date.now();
    const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));

    return ctx.t("commands.temp_chat_room_line", {
      id: room.id,
      participants: room.participants.length,
      minutes: remainingMin,
    });
  });

  await ctx.reply(
    `${ctx.t("commands.temp_chats_list", { count: rooms.length })}\n\n${lines.join("\n")}`,
    { parse_mode: "HTML" },
  );
});

tempChatHandlers.on("message", async (ctx, next) => {
  if (ctx.chat.type !== "private") {
    return next();
  }

  const room = ctx.tempChatService.getRoomByUser(ctx.from.id);

  if (!room) {
    return next();
  }

  if (
    ctx.tempChatService.isRateLimited(ctx.from.id, MAX_MESSAGES_PER_10_SECONDS)
  ) {
    console.warn(`[TempChat] Rate limit reached for user ${ctx.from.id}`);
    return;
  }

  const message = ctx.message as Message;
  const senderName = ctx.from.first_name;

  ctx.tempChatService.relay(
    room,
    ctx.from.id,
    senderName,
    ctx.chat.id,
    message.message_id,
  );
});
