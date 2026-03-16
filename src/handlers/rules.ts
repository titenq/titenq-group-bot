import { Composer } from "telegraf";

import {
  getGroupRules,
  removeGroupRules,
  upsertGroupData,
  upsertGroupRules,
} from "../db";
import { GroupFeature } from "../enums";
import {
  isGroupFeatureEnabled,
  isAdmin,
  safeDelete,
  scheduleMessageCleanup,
  validateTelegramLink,
} from "../helpers";
import { BotContext } from "../interfaces";
import { groupRulesMarkup } from "../markups/group-rules";

export const rulesHandlers = new Composer<BotContext>();

const extractRulesArgument = (text: string): string => {
  const firstSpaceIndex = text.indexOf(" ");

  if (firstSpaceIndex === -1) {
    return "";
  }

  return text.slice(firstSpaceIndex + 1).trim();
};

rulesHandlers.command("rules", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private" || !ctx.message) {
    return;
  }

  const argument = extractRulesArgument(ctx.message.text);

  if (!argument) {
    if (!(await isGroupFeatureEnabled(ctx, GroupFeature.RULES))) {
      return;
    }

    const groupRules = await getGroupRules(ctx.db, ctx.chat.id);

    if (!groupRules) {
      const errorMessage = await ctx.reply(ctx.t("rules.not_configured"));

      scheduleMessageCleanup({
        botMessageId: errorMessage.message_id,
        chatId: ctx.chat.id,
        telegram: ctx.telegram,
        triggerMessageId: ctx.message.message_id,
      });

      return;
    }

    await safeDelete(ctx.telegram, ctx.chat.id, ctx.message.message_id);

    await ctx.reply(ctx.t("rules.reply_message"), {
      ...groupRulesMarkup(ctx.t, groupRules.messageLink),
    });

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

  if (argument === "rm") {
    const removed = await removeGroupRules(ctx.db, ctx.chat.id);
    const resultMessage = await ctx.reply(
      removed ? ctx.t("rules.removed") : ctx.t("rules.not_configured"),
    );

    scheduleMessageCleanup({
      botMessageId: resultMessage.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
      triggerMessageId: ctx.message.message_id,
    });

    return;
  }

  const isValidLink = await validateTelegramLink(argument);

  if (!isValidLink) {
    const errorMessage = await ctx.reply(ctx.t("rules.invalid_link"));

    scheduleMessageCleanup({
      botMessageId: errorMessage.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
      triggerMessageId: ctx.message.message_id,
    });

    return;
  }

  await upsertGroupRules(ctx.db, ctx.chat.id, argument, ctx.from.id);

  const successMessage = await ctx.reply(ctx.t("rules.saved"), {
    ...groupRulesMarkup(ctx.t, argument),
  });

  scheduleMessageCleanup({
    botMessageId: successMessage.message_id,
    chatId: ctx.chat.id,
    telegram: ctx.telegram,
    triggerMessageId: ctx.message.message_id,
  });
});
