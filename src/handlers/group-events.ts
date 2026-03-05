import { Composer } from "telegraf";

import { upsertGroupData } from "../db";
import { GroupMemberStatus } from "../enums/group-member-status";
import { BotContext } from "../interfaces/bot-context";

export const groupEventHandlers = new Composer<BotContext>();

groupEventHandlers.on("my_chat_member", async (ctx) => {
  const newStatus = ctx.update.my_chat_member.new_chat_member.status;
  const isActive =
    newStatus === GroupMemberStatus.MEMBER ||
    newStatus === GroupMemberStatus.ADMINISTRATOR;
  const chatId = ctx.chat.id;
  const title = "title" in ctx.chat ? ctx.chat.title : undefined;
  const inviterId = ctx.from?.id;

  await upsertGroupData(ctx.db, chatId, title, inviterId, undefined, isActive);
});
