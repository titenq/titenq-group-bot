import { Composer, Markup } from "telegraf";

import { FAQ_ERROR_TTL_MS, FAQ_TRIGGER_LENGTH } from "../config/env";
import {
  getGroupFaq,
  listGroupFaqs,
  removeGroupFaq,
  upsertGroupFaq,
} from "../db";
import { isAdmin } from "../helpers/is-admin";
import { normalize } from "../helpers/normalize";
import { safeDelete } from "../helpers/safe-delete";
import { validateTelegramLink } from "../helpers/validate-telegram-link";
import { BotContext } from "../interfaces/bot-context";

export const faqHandlers = new Composer<BotContext>();

faqHandlers.hears(/^\/f[aáàâãä]q(?:@[\w]+)?(?:\s+(.+))?$/i, async (ctx) => {
  if (!ctx.chat) {
    return;
  }

  const argString = ctx.match[1] || "";
  const parts = argString.trim().split(" ").filter(Boolean);

  if (parts.length === 0) {
    const errorMsg = await ctx.reply(ctx.t("commands.faq_invalid_format"));

    setTimeout(() => {
      safeDelete(ctx.telegram, ctx.chat!.id, errorMsg.message_id);
    }, FAQ_ERROR_TTL_MS);

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

      setTimeout(() => {
        safeDelete(ctx.telegram, ctx.chat!.id, errorMsg.message_id);
      }, FAQ_ERROR_TTL_MS);

      return;
    }

    if (!ctx.message.reply_to_message) {
      const errorMsg = await ctx.reply(
        ctx.t("commands.faq_trigger_reply_required"),
      );

      setTimeout(() => {
        safeDelete(ctx.telegram, ctx.chat!.id, errorMsg.message_id);
        safeDelete(ctx.telegram, ctx.chat!.id, ctx.message.message_id);
      }, FAQ_ERROR_TTL_MS);

      return;
    }

    const messageLink = await getGroupFaq(ctx.db, ctx.chat.id, triggerKeyword);

    if (!messageLink) {
      const errorMsg = await ctx.reply(
        ctx.t("commands.faq_not_found", { trigger: triggerKeyword }),
      );

      setTimeout(() => {
        safeDelete(ctx.telegram, ctx.chat!.id, errorMsg.message_id);
      }, FAQ_ERROR_TTL_MS);

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

    setTimeout(() => {
      safeDelete(ctx.telegram, ctx.chat!.id, errorMsg.message_id);
    }, FAQ_ERROR_TTL_MS);

    return;
  }

  if (triggerKeyword.length > FAQ_TRIGGER_LENGTH) {
    const errorMsg = await ctx.reply(
      ctx.t("commands.faq_trigger_too_long", { maxLength: FAQ_TRIGGER_LENGTH }),
    );

    setTimeout(() => {
      safeDelete(ctx.telegram, ctx.chat!.id, errorMsg.message_id);
    }, FAQ_ERROR_TTL_MS);

    return;
  }

  if (!isRemoving && urlLink) {
    const isValid = await validateTelegramLink(urlLink);

    if (!isValid) {
      const errorMsg = await ctx.reply(ctx.t("commands.faq_invalid_format"));

      setTimeout(() => {
        safeDelete(ctx.telegram, ctx.chat!.id, errorMsg.message_id);
      }, FAQ_ERROR_TTL_MS);

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

faqHandlers.hears(/^\/f[aáàâãä]qs(?:@[\w]+)?$/i, async (ctx) => {
  if (!ctx.chat) {
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
