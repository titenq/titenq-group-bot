import i18next from "i18next";
import { Composer } from "telegraf";

import { FAQ_ERROR_TTL_MS } from "../config/env";
import { upsertGroupData } from "../db";
import { isAdmin } from "../helpers/is-admin";
import { safeDelete } from "../helpers/safe-delete";
import { SUPPORTED_LANGUAGES } from "../i18n";
import { BotContext } from "../interfaces/bot-context";
import { i18nOptionsMarkup } from "../markups/i18n-options";

export const commandHandlers = new Composer<BotContext>();

commandHandlers.start(async (ctx) => {
  await ctx.reply(
    ctx.t("commands.start_message", {
      banKeyword: ctx.banKeyword,
      requiredVotes: ctx.requiredVotes,
    }),
  );
});

commandHandlers.help(async (ctx) => {
  await ctx.reply(
    ctx.t("commands.help_message", {
      banKeyword: ctx.banKeyword,
      requiredVotes: ctx.requiredVotes,
    }),
  );
});

commandHandlers.hears(/^\/[iíìĩî]18n(?:@[\w]+)?$/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return;
  }

  await safeDelete(ctx.telegram, ctx.chat.id, ctx.message.message_id);

  await ctx.reply(ctx.t("commands.i18n_menu_prompt"), i18nOptionsMarkup());
});

commandHandlers.action(/^i18n_set_(.+)$/, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const desiredLanguage = ctx.match[1];
  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return ctx.answerCbQuery(ctx.t("admin.error_only_admins"), {
      show_alert: true,
    });
  }

  if (!SUPPORTED_LANGUAGES.includes(desiredLanguage)) {
    return ctx.answerCbQuery(
      ctx.t("commands.i18n_invalid_language", {
        supported: SUPPORTED_LANGUAGES.join(", "),
      }),
      { show_alert: true },
    );
  }

  await upsertGroupData(
    ctx.db,
    ctx.chat.id,
    "title" in ctx.chat ? ctx.chat.title : undefined,
    undefined,
    desiredLanguage,
    true,
  );

  ctx.languageCache.set(ctx.chat.id, desiredLanguage);

  const i18nReplyT = i18next.getFixedT(desiredLanguage);

  await ctx.answerCbQuery(i18nReplyT("commands.i18n_success_updated"), {
    show_alert: false,
  });

  if (ctx.callbackQuery.message) {
    await safeDelete(
      ctx.telegram,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
    );
  }
});

commandHandlers.command("menu", async (ctx) => {
  const { banKeyword, requiredVotes } = ctx;

  const menuText = [
    `🤖 *${ctx.t("commands.menu_title")}*`,
    "",
    `🚫 *${ctx.t("commands.menu_moderation_title")}*`,
    ctx.t("commands.menu_moderation_desc", { banKeyword, requiredVotes }),
    "",
    `📚 *${ctx.t("commands.menu_faq_title")}*`,
    ctx.t("commands.menu_faq_add"),
    ctx.t("commands.menu_faq_list"),
    ctx.t("commands.menu_faq_remove"),
    ctx.t("commands.menu_faq_trigger"),
    "",
    `🖼 *${ctx.t("commands.menu_media_title")}*`,
    ctx.t("commands.menu_media_desc"),
    "",
    `💻 *${ctx.t("commands.menu_gist_title")}*`,
    ctx.t("commands.menu_gist_desc"),
    "",
    `🌐 *${ctx.t("commands.menu_lang_title")}*`,
    ctx.t("commands.menu_lang_desc"),
    "",
    `💬 *${ctx.t("commands.menu_chat_title")}*`,
    ctx.t("commands.menu_chat_create"),
    ctx.t("commands.menu_chat_close"),
    ctx.t("commands.menu_chat_exit"),
    "",
    `🛡 *${ctx.t("commands.menu_trust_title")}*`,
    ctx.t("commands.menu_trust_add", { banKeyword, requiredVotes }),
    ctx.t("commands.menu_trust_list"),
    ctx.t("commands.menu_trust_remove"),
    "",
    "",
    `*${ctx.t("commands.menu_auto_delete")}*`,
  ].join("\n");

  const menuReply = await ctx.reply(menuText, { parse_mode: "Markdown" });

  setTimeout(async () => {
    await safeDelete(ctx.telegram, ctx.chat.id, menuReply.message_id);
    await safeDelete(ctx.telegram, ctx.chat.id, ctx.message.message_id);
  }, FAQ_ERROR_TTL_MS);
});
