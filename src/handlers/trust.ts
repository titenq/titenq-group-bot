import { Composer } from "telegraf";

import { addVip, listVips, removeVip } from "../db";
import { isAdmin } from "../helpers/is-admin";
import { BotContext } from "../interfaces/bot-context";

export const trustHandlers = new Composer<BotContext>();

const getTargetUser = async (ctx: BotContext) => {
  if (
    ctx.message &&
    "reply_to_message" in ctx.message &&
    ctx.message.reply_to_message
  ) {
    const repliedMsg = ctx.message.reply_to_message;

    return {
      id: repliedMsg.from?.id,
      name: repliedMsg.from?.first_name || ctx.t("trust.user_placeholder"),
    };
  }

  if (ctx.message && "text" in ctx.message) {
    const fullText = ctx.message.text;
    const firstSpaceIndex = fullText.indexOf(" ");

    if (firstSpaceIndex !== -1) {
      const arg = fullText.slice(firstSpaceIndex + 1).trim();
      const targetId = parseInt(arg, 10);

      if (!isNaN(targetId)) {
        try {
          const chatMember = await ctx.telegram.getChatMember(
            ctx.chat!.id,
            targetId,
          );

          return {
            id: chatMember.user.id,
            name: chatMember.user.first_name,
          };
        } catch {
          return {
            id: targetId,
            name: `${ctx.t("trust.user_placeholder")} ${targetId}`,
          };
        }
      }
    }
  }

  return null;
};

trustHandlers.command("trust", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return;
  }

  const target = await getTargetUser(ctx);

  if (!target || !target.id) {
    await ctx.reply(ctx.t("trust.error_no_reply_or_id"));

    return;
  }

  await addVip(ctx.db, ctx.chat.id, target.id);

  await ctx.reply(
    ctx.t("trust.trust_success", {
      name: target.name,
      userId: target.id,
    }),
    { parse_mode: "HTML" },
  );
});

trustHandlers.command("untrust", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return;
  }

  const target = await getTargetUser(ctx);

  if (!target || !target.id) {
    await ctx.reply(ctx.t("trust.error_no_reply_or_id"));

    return;
  }

  const removed = await removeVip(ctx.db, ctx.chat.id, target.id);

  if (!removed) {
    await ctx.reply(ctx.t("trust.untrust_not_found"));

    return;
  }

  await ctx.reply(
    ctx.t("trust.untrust_success", {
      name: target.name,
      userId: target.id,
    }),
    { parse_mode: "HTML" },
  );
});

trustHandlers.command("trustlist", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return;
  }

  const vips = await listVips(ctx.db, ctx.chat.id);

  if (vips.length === 0) {
    await ctx.reply(ctx.t("trust.trust_list_empty"));

    return;
  }

  const listItems = await Promise.all(
    vips.map(async (vip) => {
      try {
        const member = await ctx.telegram.getChatMember(
          ctx.chat!.id,
          vip.user_id,
        );

        return ctx.t("trust.trust_list_item", {
          name: member.user.first_name,
          userId: vip.user_id,
        });
      } catch {
        return ctx.t("trust.trust_list_item", {
          name: ctx.t("trust.unknown_user"),
          userId: vip.user_id,
        });
      }
    }),
  );

  const text = [ctx.t("trust.trust_list_title"), "", ...listItems].join("\n");

  await ctx.reply(text, { parse_mode: "HTML" });
});
