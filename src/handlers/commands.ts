import i18next from "i18next";
import { Composer } from "telegraf";
import { callbackQuery, message } from "telegraf/filters";

import {
  getGroupFeatures,
  getGroupWelcomeMessage,
  toggleGroupFeature,
  upsertGroupData,
  upsertGroupWelcomeMessage,
} from "../db";
import { GROUP_FEATURES, GroupFeature, Language } from "../enums";
import { isAdmin, safeDelete, scheduleMessageCleanup } from "../helpers";
import { SUPPORTED_LANGUAGES } from "../i18n";
import { BotContext } from "../interfaces";
import { groupFeaturesMarkup } from "../markups/group-features";
import { i18nOptionsMarkup } from "../markups/i18n-options";

export const commandHandlers = new Composer<BotContext>();

const isDefaultWelcomeTemplate = (
  template: string,
  currentLanguage: string,
): boolean => {
  const currentLanguageTemplate = i18next.getFixedT(currentLanguage)(
    "welcome.default_template",
  );
  const knownDefaultTemplates = SUPPORTED_LANGUAGES.map((languageCode) => {
    return i18next.getFixedT(languageCode)("welcome.default_template");
  });

  return (
    template === currentLanguageTemplate ||
    knownDefaultTemplates.includes(template)
  );
};

const buildFeaturesText = (ctx: BotContext) => {
  return [
    ctx.t("commands.features_title"),
    "",
    ctx.t("commands.features_description"),
  ].join("\n");
};

const showFeaturesPanel = async (ctx: BotContext) => {
  if (!ctx.chat || ctx.chat.type === "private" || !ctx.from || !ctx.message) {
    return;
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return;
  }

  await upsertGroupData(
    ctx.db,
    ctx.chat.id,
    "title" in ctx.chat ? ctx.chat.title : undefined,
    ctx.from.id,
  );

  const features = await getGroupFeatures(ctx.db, ctx.chat.id);

  await safeDelete(ctx.telegram, ctx.chat.id, ctx.message.message_id);
  await ctx.reply(buildFeaturesText(ctx), {
    parse_mode: "HTML",
    ...groupFeaturesMarkup(ctx.t, features),
  });
};

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

commandHandlers.on(message("text"), async (ctx, next) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return next();
  }

  const commandToken = ctx.message.text.trim().split(/\s+/)[0] ?? "";
  const normalizedCommand = commandToken.split("@")[0].toLowerCase();

  if (normalizedCommand !== "/i18n") {
    return next();
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

  const currentLanguage = ctx.languageCache.get(ctx.chat.id) ?? Language.PT;
  const welcomeMessage = await getGroupWelcomeMessage(ctx.db, ctx.chat.id);

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

  if (
    welcomeMessage &&
    isDefaultWelcomeTemplate(welcomeMessage.template, currentLanguage)
  ) {
    await upsertGroupWelcomeMessage(
      ctx.db,
      ctx.chat.id,
      i18nReplyT("welcome.default_template"),
      ctx.from.id,
    );
  }

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

commandHandlers.command(["features", "feats"], showFeaturesPanel);

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
    `⚙️ *${ctx.t("commands.menu_features_title")}*`,
    ctx.t("commands.menu_features_desc"),
    "",
    `🧩 *${ctx.t("commands.menu_captcha_title")}*`,
    ctx.t("commands.menu_captcha_desc"),
    "",
    `👋 *${ctx.t("commands.menu_welcome_title")}*`,
    ctx.t("commands.menu_welcome_desc"),
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
    ctx.t("commands.menu_trust_tag_note"),
    "",
    "",
    `*${ctx.t("commands.menu_auto_delete")}*`,
  ].join("\n");

  const menuReply = await ctx.reply(menuText, { parse_mode: "Markdown" });

  scheduleMessageCleanup({
    botMessageId: menuReply.message_id,
    chatId: ctx.chat.id,
    telegram: ctx.telegram,
    triggerMessageId: ctx.message.message_id,
  });
});

commandHandlers.on(callbackQuery("data"), async (ctx, next) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return next();
  }

  const callbackData = ctx.callbackQuery.data;

  if (callbackData === "features_delete_panel") {
    const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

    if (!isAdmin(actor)) {
      return ctx.answerCbQuery(ctx.t("admin.error_only_admins"), {
        show_alert: true,
      });
    }

    if (ctx.callbackQuery.message) {
      await safeDelete(
        ctx.telegram,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
      );
    }

    await ctx.answerCbQuery(ctx.t("commands.features_panel_deleted"));

    return;
  }

  if (!callbackData || !callbackData.startsWith("features_toggle_")) {
    return next();
  }

  const featureKey = callbackData.replace(
    "features_toggle_",
    "",
  ) as GroupFeature;

  if (!GROUP_FEATURES.includes(featureKey)) {
    await ctx.answerCbQuery(ctx.t("commands.features_invalid_feature"), {
      show_alert: true,
    });

    return;
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return ctx.answerCbQuery(ctx.t("admin.error_only_admins"), {
      show_alert: true,
    });
  }

  await upsertGroupData(
    ctx.db,
    ctx.chat.id,
    "title" in ctx.chat ? ctx.chat.title : undefined,
    ctx.from.id,
  );

  const updatedFeature = await toggleGroupFeature(
    ctx.db,
    ctx.chat.id,
    featureKey,
    ctx.from.id,
  );

  if (
    updatedFeature.featureKey === GroupFeature.WELCOME &&
    updatedFeature.isEnabled
  ) {
    const welcomeMessage = await getGroupWelcomeMessage(ctx.db, ctx.chat.id);

    if (!welcomeMessage) {
      await upsertGroupWelcomeMessage(
        ctx.db,
        ctx.chat.id,
        ctx.t("welcome.default_template"),
        ctx.from.id,
      );
    }
  }

  const features = await getGroupFeatures(ctx.db, ctx.chat.id);

  const featureLabel = ctx.t(
    `commands.features_feature_${updatedFeature.featureKey}`,
  );

  const featureStatus = updatedFeature.isEnabled
    ? ctx.t("commands.features_status_on")
    : ctx.t("commands.features_status_off");

  if (ctx.callbackQuery.message) {
    await ctx.editMessageText(buildFeaturesText(ctx), {
      parse_mode: "HTML",
      ...groupFeaturesMarkup(ctx.t, features),
    });
  }

  await ctx.answerCbQuery(
    ctx.t("commands.features_toggle_success", {
      feature: featureLabel,
      status: featureStatus,
    }),
  );
});
