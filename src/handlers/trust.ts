import { Composer } from "telegraf";

import { VIP_MEMBER_TAG } from "../config/constants";
import { addVip, listVips, removeVip } from "../db";
import { GroupFeature } from "../enums";
import {
  isAdmin,
  isGroupFeatureEnabled,
  scheduleMessageCleanup,
  setChatMemberTag,
} from "../helpers";
import { BotContext } from "../interfaces/bot-context";

export const trustHandlers = new Composer<BotContext>();

const getTargetUser = async (ctx: BotContext) => {
  if (
    ctx.message &&
    "reply_to_message" in ctx.message &&
    ctx.message.reply_to_message
  ) {
    const repliedMsg = ctx.message.reply_to_message;
    const text = "text" in ctx.message ? ctx.message.text : "";

    return {
      id: repliedMsg.from?.id,
      name: repliedMsg.from?.first_name || ctx.t("trust.user_placeholder"),
      weight: text.split(/\s+/)[1]
        ? parseInt(text.split(/\s+/)[1], 10)
        : undefined,
    };
  }

  if (ctx.message && "text" in ctx.message) {
    const fullText = ctx.message.text;
    const parts = fullText.split(/\s+/);

    if (parts.length >= 2) {
      const targetId = parseInt(parts[1], 10);

      if (!isNaN(targetId)) {
        try {
          const chatMember = await ctx.telegram.getChatMember(
            ctx.chat!.id,
            targetId,
          );

          return {
            id: chatMember.user.id,
            name: chatMember.user.first_name,
            weight: parts[2] ? parseInt(parts[2], 10) : undefined,
          };
        } catch {
          return {
            id: targetId,
            name: `${ctx.t("trust.user_placeholder")} ${targetId}`,
            weight: parts[2] ? parseInt(parts[2], 10) : undefined,
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

  if (!(await isGroupFeatureEnabled(ctx, GroupFeature.TRUST))) {
    return;
  }

  const target = await getTargetUser(ctx);

  if (!target || !target.id) {
    const errorMsg = await ctx.reply(ctx.t("trust.error_no_reply_or_id"));

    scheduleMessageCleanup({
      botMessageId: errorMsg.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
      triggerMessageId: ctx.message.message_id,
    });

    return;
  }

  const weight = target.weight || ctx.requiredVotes;

  if (weight < 1 || weight > ctx.requiredVotes) {
    const errorMsg = await ctx.reply(
      ctx.t("trust.error_invalid_weight", { requiredVotes: ctx.requiredVotes }),
    );

    scheduleMessageCleanup({
      botMessageId: errorMsg.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
      triggerMessageId: ctx.message.message_id,
    });

    return;
  }

  await addVip(ctx.db, ctx.chat.id, target.id, weight);

  const vipTagApplied = await setChatMemberTag({
    chatId: ctx.chat.id,
    tag: VIP_MEMBER_TAG,
    telegram: ctx.telegram,
    userId: target.id,
  });

  const successMsg = await ctx.reply(
    vipTagApplied
      ? ctx.t("trust.trust_success", {
          name: target.name,
          tag: VIP_MEMBER_TAG,
          userId: target.id,
          weight,
        })
      : ctx.t("trust.trust_success_tag_pending", {
          name: target.name,
          tag: VIP_MEMBER_TAG,
          userId: target.id,
          weight,
        }),
    { parse_mode: "HTML" },
  );

  scheduleMessageCleanup({
    botMessageId: successMsg.message_id,
    chatId: ctx.chat.id,
    telegram: ctx.telegram,
    triggerMessageId: ctx.message.message_id,
  });
});

trustHandlers.command("untrust", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return;
  }

  if (!(await isGroupFeatureEnabled(ctx, GroupFeature.TRUST))) {
    return;
  }

  const target = await getTargetUser(ctx);

  if (!target || !target.id) {
    const errorMsg = await ctx.reply(ctx.t("trust.error_no_reply_or_id"));

    scheduleMessageCleanup({
      botMessageId: errorMsg.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
      triggerMessageId: ctx.message.message_id,
    });

    return;
  }

  const removed = await removeVip(ctx.db, ctx.chat.id, target.id);

  if (!removed) {
    const errorMsg = await ctx.reply(ctx.t("trust.untrust_not_found"));

    scheduleMessageCleanup({
      botMessageId: errorMsg.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
      triggerMessageId: ctx.message.message_id,
    });

    return;
  }

  const vipTagRemoved = await setChatMemberTag({
    chatId: ctx.chat.id,
    tag: "",
    telegram: ctx.telegram,
    userId: target.id,
  });

  const successMsg = await ctx.reply(
    vipTagRemoved
      ? ctx.t("trust.untrust_success", {
          name: target.name,
          tag: VIP_MEMBER_TAG,
          userId: target.id,
        })
      : ctx.t("trust.untrust_success_tag_pending", {
          name: target.name,
          tag: VIP_MEMBER_TAG,
          userId: target.id,
        }),
    { parse_mode: "HTML" },
  );

  scheduleMessageCleanup({
    botMessageId: successMsg.message_id,
    chatId: ctx.chat.id,
    telegram: ctx.telegram,
    triggerMessageId: ctx.message.message_id,
  });
});

trustHandlers.command("trustlist", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return;
  }

  if (!(await isGroupFeatureEnabled(ctx, GroupFeature.TRUST))) {
    return;
  }

  const vips = await listVips(ctx.db, ctx.chat.id);

  if (vips.length === 0) {
    const emptyMsg = await ctx.reply(ctx.t("trust.trust_list_empty"));

    scheduleMessageCleanup({
      botMessageId: emptyMsg.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
      triggerMessageId: ctx.message.message_id,
    });

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
          weight: vip.trust_weight,
        });
      } catch {
        return ctx.t("trust.trust_list_item", {
          name: ctx.t("trust.unknown_user"),
          userId: vip.user_id,
          weight: vip.trust_weight,
        });
      }
    }),
  );

  const text = [ctx.t("trust.trust_list_title"), "", ...listItems].join("\n");

  const listMsg = await ctx.reply(text, { parse_mode: "HTML" });

  scheduleMessageCleanup({
    botMessageId: listMsg.message_id,
    chatId: ctx.chat.id,
    telegram: ctx.telegram,
    triggerMessageId: ctx.message.message_id,
  });
});
