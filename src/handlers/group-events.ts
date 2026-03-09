import { Composer } from "telegraf";

import { upsertGroupData } from "../db";
import { GroupMemberStatus } from "../enums/group-member-status";
import { BotContext } from "../interfaces/bot-context";

export const groupEventHandlers = new Composer<BotContext>();

groupEventHandlers.on("my_chat_member", async (ctx) => {
  if (ctx.chat.type === "private") {
    return;
  }

  const newStatus = ctx.update.my_chat_member.new_chat_member.status;
  const isActive =
    newStatus === GroupMemberStatus.MEMBER ||
    newStatus === GroupMemberStatus.ADMINISTRATOR;
  const chatId = ctx.chat.id;
  const title = "title" in ctx.chat ? ctx.chat.title : undefined;
  const inviterId = ctx.from?.id;

  await upsertGroupData(ctx.db, chatId, title, inviterId, undefined, isActive);
});

groupEventHandlers.on("message", async (ctx, next) => {
  if (
    ctx.message &&
    ("migrate_to_chat_id" in ctx.message ||
      "migrate_from_chat_id" in ctx.message)
  ) {
    const oldChatId =
      "migrate_from_chat_id" in ctx.message
        ? ctx.message.migrate_from_chat_id
        : ctx.chat.id;

    const newChatId =
      "migrate_to_chat_id" in ctx.message
        ? ctx.message.migrate_to_chat_id
        : ctx.chat.id;

    if (oldChatId && newChatId && oldChatId !== newChatId) {
      console.log(
        `[GroupEvents] Migrating chat data from ${oldChatId} to ${newChatId}`,
      );

      try {
        const { migrateChatData } = await import("../db");

        await migrateChatData(ctx.db, oldChatId, newChatId);

        if (ctx.languageCache) {
          const oldLang = ctx.languageCache.get(oldChatId);

          if (oldLang) {
            ctx.languageCache.set(newChatId, oldLang);
            ctx.languageCache.delete(oldChatId);
          }
        }

        if (ctx.voteCases) {
          for (const [key, voteCase] of ctx.voteCases.entries()) {
            if (voteCase.chatId === oldChatId) {
              const newKey = `${newChatId}:${voteCase.targetMessageId}`;

              voteCase.chatId = newChatId;
              ctx.voteCases.set(newKey, voteCase);
              ctx.voteCases.delete(key);
            }
          }
        }
      } catch (error) {
        console.error(
          `[GroupEvents] Failed to migrate chat data: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }
  }

  return next();
});
