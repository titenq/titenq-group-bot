import { Composer } from "telegraf";
import { message } from "telegraf/filters";

import {
  getGroupRules,
  getGroupWelcomeMessage,
  upsertGroupData,
  upsertGroupWelcomeMessage,
} from "../db";
import { GroupFeature } from "../enums";
import {
  buildWelcomeMessage,
  isAdmin,
  isGroupFeatureEnabled,
  safeDelete,
  scheduleMessageCleanup,
} from "../helpers";
import {
  BotContext,
  PendingWelcomeDraft,
  PendingWelcomeSetup,
} from "../interfaces";
import { groupRulesMarkup } from "../markups/group-rules";
import {
  welcomeDraftMarkup,
  welcomeGroupPreviewMarkup,
  welcomeSetupMarkup,
} from "../markups/welcome-preview";

export const welcomeHandlers = new Composer<BotContext>();

const pendingWelcomeSetups = new Map<string, PendingWelcomeSetup>();
const pendingWelcomeDrafts = new Map<string, PendingWelcomeDraft>();

const buildPendingWelcomeKey = (chatId: number, adminId: number): string => {
  return `${chatId}:${adminId}`;
};

const extractWelcomeTemplate = (text: string): string => {
  const firstSpaceIndex = text.indexOf(" ");

  if (firstSpaceIndex === -1) {
    return "";
  }

  return text.slice(firstSpaceIndex + 1).trim();
};

const buildWelcomeStatusText = async (ctx: BotContext): Promise<string> => {
  const isWelcomeEnabled = await isGroupFeatureEnabled(
    ctx,
    GroupFeature.WELCOME,
  );
  const featureStatus = isWelcomeEnabled
    ? ctx.t("commands.features_status_on")
    : ctx.t("commands.features_status_off");

  return ctx.t("welcome.saved", {
    status: featureStatus,
  });
};

const sendWelcomeDraftMessage = async (
  ctx: BotContext,
  adminId: number,
  template: string,
): Promise<void> => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const statusMessage = await ctx.reply(
    ctx.t("welcome.preview_ready", {
      statusText: await buildWelcomeStatusText(ctx),
      template,
    }),
    {
      parse_mode: "HTML",
      ...welcomeDraftMarkup(ctx.t, adminId),
    },
  );

  pendingWelcomeDrafts.set(buildPendingWelcomeKey(ctx.chat.id, adminId), {
    adminId,
    chatId: ctx.chat.id,
    panelMessageId: statusMessage.message_id,
    template,
  });

  scheduleMessageCleanup({
    botMessageId: statusMessage.message_id,
    chatId: ctx.chat.id,
    telegram: ctx.telegram,
  });
};

const sendWelcomeSetupPrompt = async (
  ctx: BotContext,
  adminId: number,
  triggerMessageId: number,
  currentTemplate?: string,
): Promise<void> => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const setupPrompt = await ctx.reply(
    currentTemplate
      ? ctx.t("welcome.setup_prompt_with_current", {
          template: currentTemplate,
        })
      : ctx.t("welcome.setup_prompt"),
    {
      parse_mode: "HTML",
      ...welcomeSetupMarkup(ctx.t, adminId),
    },
  );

  pendingWelcomeSetups.set(buildPendingWelcomeKey(ctx.chat.id, adminId), {
    adminId,
    chatId: ctx.chat.id,
    promptMessageId: setupPrompt.message_id,
    triggerMessageId,
  });
};

welcomeHandlers.command("welcome", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private" || !ctx.message) {
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

  const template = extractWelcomeTemplate(ctx.message.text);

  if (template) {
    await safeDelete(ctx.telegram, ctx.chat.id, ctx.message.message_id);

    pendingWelcomeSetups.delete(
      buildPendingWelcomeKey(ctx.chat.id, ctx.from.id),
    );

    await sendWelcomeDraftMessage(ctx, ctx.from.id, template);

    return;
  }

  const currentWelcomeMessage = await getGroupWelcomeMessage(
    ctx.db,
    ctx.chat.id,
  );

  await sendWelcomeSetupPrompt(
    ctx,
    ctx.from.id,
    ctx.message.message_id,
    currentWelcomeMessage?.template,
  );
});

welcomeHandlers.on(message("text"), async (ctx, next) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return next();
  }

  const messageText = ctx.message.text.trim();

  const pendingSetup = pendingWelcomeSetups.get(
    buildPendingWelcomeKey(ctx.chat.id, ctx.from.id),
  );

  const replyToMessage = ctx.message.reply_to_message;

  if (!pendingSetup) {
    return next();
  }

  if (!replyToMessage && messageText.startsWith("/")) {
    return next();
  }

  if (
    replyToMessage &&
    replyToMessage.message_id !== pendingSetup.promptMessageId
  ) {
    return next();
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    pendingWelcomeSetups.delete(
      buildPendingWelcomeKey(ctx.chat.id, ctx.from.id),
    );

    return;
  }

  const template = messageText;

  if (!template) {
    const errorMessage = await ctx.reply(ctx.t("welcome.invalid_template"));

    scheduleMessageCleanup({
      botMessageId: errorMessage.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
    });

    return;
  }

  pendingWelcomeSetups.delete(buildPendingWelcomeKey(ctx.chat.id, ctx.from.id));

  await safeDelete(ctx.telegram, ctx.chat.id, pendingSetup.promptMessageId);
  await safeDelete(ctx.telegram, ctx.chat.id, pendingSetup.triggerMessageId);
  await safeDelete(ctx.telegram, ctx.chat.id, ctx.message.message_id);
  await sendWelcomeDraftMessage(ctx, ctx.from.id, template);
});

welcomeHandlers.action(/^welcome_preview_(\d+)$/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const targetAdminId = Number(ctx.match[1]);

  if (ctx.from.id !== targetAdminId) {
    await ctx.answerCbQuery(ctx.t("welcome.preview_only_owner"), {
      show_alert: true,
    });

    return;
  }

  const draft = pendingWelcomeDrafts.get(
    buildPendingWelcomeKey(ctx.chat.id, ctx.from.id),
  );

  const welcomeMessage = await getGroupWelcomeMessage(ctx.db, ctx.chat.id);
  const template = draft?.template ?? welcomeMessage?.template;

  if (!template) {
    await ctx.answerCbQuery(ctx.t("welcome.not_configured"), {
      show_alert: true,
    });

    return;
  }

  const previewText = buildWelcomeMessage({
    groupTitle: "title" in ctx.chat ? ctx.chat.title : undefined,
    name: ctx.from.first_name,
    template,
    username: ctx.from.username,
  });

  const rulesEnabled = await isGroupFeatureEnabled(ctx, GroupFeature.RULES);

  const groupRules = rulesEnabled
    ? await getGroupRules(ctx.db, ctx.chat.id)
    : null;

  const previewMessage = await ctx.reply(previewText, {
    parse_mode: "HTML",
    ...welcomeGroupPreviewMarkup(ctx.t, ctx.from.id, groupRules?.messageLink),
  });

  if (draft) {
    pendingWelcomeDrafts.set(buildPendingWelcomeKey(ctx.chat.id, ctx.from.id), {
      ...draft,
      previewMessageId: previewMessage.message_id,
    });
  }

  scheduleMessageCleanup({
    botMessageId: previewMessage.message_id,
    chatId: ctx.chat.id,
    telegram: ctx.telegram,
  });

  await ctx.answerCbQuery(ctx.t("welcome.preview_sent"));
});

welcomeHandlers.action(/^welcome_save_(\d+)$/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const targetAdminId = Number(ctx.match[1]);

  if (ctx.from.id !== targetAdminId) {
    await ctx.answerCbQuery(ctx.t("welcome.preview_only_owner"), {
      show_alert: true,
    });

    return;
  }

  const draft = pendingWelcomeDrafts.get(
    buildPendingWelcomeKey(ctx.chat.id, ctx.from.id),
  );

  if (!draft) {
    await ctx.answerCbQuery(ctx.t("welcome.not_configured"), {
      show_alert: true,
    });

    return;
  }

  await upsertGroupWelcomeMessage(
    ctx.db,
    ctx.chat.id,
    draft.template,
    ctx.from.id,
  );

  const pendingSetup = pendingWelcomeSetups.get(
    buildPendingWelcomeKey(ctx.chat.id, ctx.from.id),
  );

  pendingWelcomeSetups.delete(buildPendingWelcomeKey(ctx.chat.id, ctx.from.id));
  pendingWelcomeDrafts.delete(buildPendingWelcomeKey(ctx.chat.id, ctx.from.id));

  if (draft.panelMessageId) {
    await safeDelete(ctx.telegram, ctx.chat.id, draft.panelMessageId);
  }

  if (draft.previewMessageId) {
    await safeDelete(ctx.telegram, ctx.chat.id, draft.previewMessageId);
  }

  if (pendingSetup) {
    await safeDelete(ctx.telegram, ctx.chat.id, pendingSetup.promptMessageId);
    await safeDelete(ctx.telegram, ctx.chat.id, pendingSetup.triggerMessageId);
  }

  await ctx.answerCbQuery(ctx.t("welcome.saved_success"), {
    show_alert: true,
  });
});

welcomeHandlers.action(/^welcome_edit_(\d+)$/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const targetAdminId = Number(ctx.match[1]);

  if (ctx.from.id !== targetAdminId) {
    await ctx.answerCbQuery(ctx.t("welcome.preview_only_owner"), {
      show_alert: true,
    });

    return;
  }

  const pendingDraft = pendingWelcomeDrafts.get(
    buildPendingWelcomeKey(ctx.chat.id, ctx.from.id),
  );

  const currentWelcomeMessage = await getGroupWelcomeMessage(
    ctx.db,
    ctx.chat.id,
  );

  const currentTemplate =
    pendingDraft?.template ?? currentWelcomeMessage?.template;

  if (ctx.callbackQuery.message) {
    await safeDelete(
      ctx.telegram,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
    );
  }

  await sendWelcomeSetupPrompt(
    ctx,
    ctx.from.id,
    ctx.callbackQuery.message?.message_id ?? 0,
    currentTemplate,
  );
  await ctx.answerCbQuery(ctx.t("welcome.edit_started"));
});

welcomeHandlers.action(/^welcome_cancel_(\d+)$/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const targetAdminId = Number(ctx.match[1]);

  if (ctx.from.id !== targetAdminId) {
    await ctx.answerCbQuery(ctx.t("welcome.preview_only_owner"), {
      show_alert: true,
    });

    return;
  }

  const pendingSetup = pendingWelcomeSetups.get(
    buildPendingWelcomeKey(ctx.chat.id, ctx.from.id),
  );

  pendingWelcomeSetups.delete(buildPendingWelcomeKey(ctx.chat.id, ctx.from.id));
  pendingWelcomeDrafts.delete(buildPendingWelcomeKey(ctx.chat.id, ctx.from.id));

  if (ctx.callbackQuery.message) {
    await safeDelete(
      ctx.telegram,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
    );
  }

  if (pendingSetup) {
    await safeDelete(ctx.telegram, ctx.chat.id, pendingSetup.triggerMessageId);
  }

  await ctx.answerCbQuery(ctx.t("welcome.cancelled"));
});

welcomeHandlers.action(/^welcome_cancel_preview_(\d+)$/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const targetAdminId = Number(ctx.match[1]);

  if (ctx.from.id !== targetAdminId) {
    await ctx.answerCbQuery(ctx.t("welcome.preview_only_owner"), {
      show_alert: true,
    });

    return;
  }

  if (ctx.callbackQuery.message) {
    await safeDelete(
      ctx.telegram,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
    );
  }

  await ctx.answerCbQuery(ctx.t("welcome.preview_cancelled"));
});

welcomeHandlers.on(message("new_chat_members"), async (ctx, next) => {
  if (ctx.chat.type === "private") {
    return next();
  }

  if (!(await isGroupFeatureEnabled(ctx, GroupFeature.WELCOME))) {
    return next();
  }

  if (await isGroupFeatureEnabled(ctx, GroupFeature.CAPTCHA)) {
    return next();
  }

  const welcomeMessage = await getGroupWelcomeMessage(ctx.db, ctx.chat.id);
  const rulesEnabled = await isGroupFeatureEnabled(ctx, GroupFeature.RULES);
  
  const groupRules = rulesEnabled
    ? await getGroupRules(ctx.db, ctx.chat.id)
    : null;

  if (!welcomeMessage) {
    return next();
  }

  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) {
      continue;
    }

    const text = buildWelcomeMessage({
      groupTitle: "title" in ctx.chat ? ctx.chat.title : undefined,
      name: member.first_name,
      template: welcomeMessage.template,
      username: member.username,
    });

    await ctx.reply(text, {
      parse_mode: "HTML",
      ...(groupRules
        ? groupRulesMarkup(ctx.t, groupRules.messageLink)
        : undefined),
    });
  }

  return next();
});
