import { Composer, Markup } from "telegraf";

import { FAQ_TRIGGER_LENGTH } from "../config/env";
import {
  getGroupFaq,
  listGroupFaqs,
  removeGroupFaq,
  upsertGroupFaq,
} from "../db";
import { GroupFeature } from "../enums/group-feature";
import {
  isGroupFeatureEnabled,
  isAdmin,
  normalize,
  safeDelete,
  scheduleMessageCleanup,
  validateTelegramLink,
} from "../helpers";
import { BotContext } from "../interfaces/bot-context";

export const faqHandlers = new Composer<BotContext>();

faqHandlers.command("faq", async (ctx) => {
  if (!ctx.chat) {
    return;
  }

  if (!(await isGroupFeatureEnabled(ctx, GroupFeature.FAQ))) {
    return;
  }

  const fullText = ctx.message.text;
  const firstSpaceIndex = fullText.indexOf(" ");

  const argString =
    firstSpaceIndex === -1 ? "" : fullText.slice(firstSpaceIndex + 1);
  
  const parts = argString.trim().split(" ").filter(Boolean);

  if (parts.length === 0) {
    const errorMsg = await ctx.reply(ctx.t("commands.faq_invalid_format"));

    scheduleMessageCleanup({
      botMessageId: errorMsg.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
    });

    return;
  }

  if (parts.length === 1) {
    const triggerKeyword = normalize(parts[0]);

    if (triggerKeyword.length > FAQ_TRIGGER_LENGTH) {
      const errorMsg = await ctx.reply(
        ctx.t("commands.faq_trigger_too_long", {
          maxLength: FAQ_TRIGGER_LENGTH,
        }),
      );

      scheduleMessageCleanup({
        botMessageId: errorMsg.message_id,
        chatId: ctx.chat.id,
        telegram: ctx.telegram,
      });

      return;
    }

    if (!ctx.message.reply_to_message) {
      const errorMsg = await ctx.reply(
        ctx.t("commands.faq_trigger_reply_required"),
      );

      scheduleMessageCleanup({
        botMessageId: errorMsg.message_id,
        chatId: ctx.chat.id,
        telegram: ctx.telegram,
        triggerMessageId: ctx.message.message_id,
      });

      return;
    }

    const messageLink = await getGroupFaq(ctx.db, ctx.chat.id, triggerKeyword);

    if (!messageLink) {
      const errorMsg = await ctx.reply(
        ctx.t("commands.faq_not_found", { trigger: triggerKeyword }),
      );

      scheduleMessageCleanup({
        botMessageId: errorMsg.message_id,
        chatId: ctx.chat.id,
        telegram: ctx.telegram,
      });

      return;
    }

    await safeDelete(ctx.telegram, ctx.chat.id, ctx.message.message_id);
    await ctx.reply(
      ctx.t("commands.faq_reply_message", { link: messageLink }),
      {
        reply_parameters: {
          message_id: ctx.message.reply_to_message.message_id,
        },
      },
    );

    return;
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return;
  }

  const isRemoving = parts[0] === "rm";
  let triggerKeyword = isRemoving ? parts[1] : parts[0];
  const urlLink = isRemoving ? undefined : parts[1];

  if (triggerKeyword) {
    triggerKeyword = normalize(triggerKeyword);
  }

  if (
    !triggerKeyword ||
    (isRemoving && parts.length !== 2) ||
    (!isRemoving && parts.length !== 2)
  ) {
    const errorMsg = await ctx.reply(ctx.t("commands.faq_invalid_format"));

    scheduleMessageCleanup({
      botMessageId: errorMsg.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
    });

    return;
  }

  if (triggerKeyword.length > FAQ_TRIGGER_LENGTH) {
    const errorMsg = await ctx.reply(
      ctx.t("commands.faq_trigger_too_long", { maxLength: FAQ_TRIGGER_LENGTH }),
    );

    scheduleMessageCleanup({
      botMessageId: errorMsg.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
    });

    return;
  }

  if (!isRemoving && urlLink) {
    const isValid = await validateTelegramLink(urlLink);

    if (!isValid) {
      const errorMsg = await ctx.reply(ctx.t("commands.faq_invalid_format"));

      scheduleMessageCleanup({
        botMessageId: errorMsg.message_id,
        chatId: ctx.chat.id,
        telegram: ctx.telegram,
      });

      return;
    }
  }

  try {
    if (isRemoving) {
      await removeGroupFaq(ctx.db, ctx.chat.id, triggerKeyword);

      await ctx.reply(
        ctx.t("commands.faq_success_removed", { trigger: triggerKeyword }),
      );
    } else {
      await upsertGroupFaq(
        ctx.db,
        ctx.chat.id,
        triggerKeyword,
        urlLink as string,
        ctx.from.id,
      );

      await ctx.reply(
        ctx.t("commands.faq_success_added", { trigger: triggerKeyword }),
      );
    }
  } catch (error) {
    console.error(
      `Failed to handle FAQ cmd: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});

faqHandlers.command("faqs", async (ctx) => {
  if (!ctx.chat) {
    return;
  }

  if (!(await isGroupFeatureEnabled(ctx, GroupFeature.FAQ))) {
    return;
  }

  await safeDelete(ctx.telegram, ctx.chat.id, ctx.message.message_id);

  try {
    const list = await listGroupFaqs(ctx.db, ctx.chat.id);

    if (list.length === 0) {
      await ctx.reply(ctx.t("commands.faq_empty"));

      return;
    }

    const buttons = list.map((faq) => {
      return [Markup.button.url(faq.triggerKeyword, faq.messageLink)];
    });

    await ctx.reply(ctx.t("commands.faq_list_title"), {
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  } catch (error) {
    console.error(
      `Failed to execute /faqs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});
