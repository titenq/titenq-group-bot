import { Composer } from "telegraf";

import { GITHUB_GIST_TOKEN } from "../config/env";
import { GroupFeature } from "../enums/group-feature";
import {
  createGist,
  isGroupFeatureEnabled,
  isGroup,
  LANGUAGE_EXTENSION_MAP,
  safeDelete,
  scheduleMessageCleanup,
} from "../helpers";
import { BotContext } from "../interfaces/bot-context";

export const gistHandlers = new Composer<BotContext>();

gistHandlers.command("gist", async (ctx, next) => {
  if (!isGroup(ctx.chat.type)) {
    return next();
  }

  if (!GITHUB_GIST_TOKEN) {
    return next();
  }

  if (!(await isGroupFeatureEnabled(ctx, GroupFeature.GIST))) {
    return;
  }

  const fullText = ctx.message.text;

  const firstSpaceIndex = fullText.indexOf(" ");

  if (firstSpaceIndex === -1) {
    const errorReply = await ctx.reply(ctx.t("gist.error_missing_language"));

    scheduleMessageCleanup({
      botMessageId: errorReply.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
    });

    return;
  }

  const afterCommand = fullText.slice(firstSpaceIndex + 1).trimStart();
  const secondSpaceIndex = afterCommand.indexOf(" ");

  if (secondSpaceIndex === -1) {
    const errorReply = await ctx.reply(ctx.t("gist.error_missing_code"));

    scheduleMessageCleanup({
      botMessageId: errorReply.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
    });

    return;
  }

  const language = afterCommand.slice(0, secondSpaceIndex).toLowerCase();
  const code = afterCommand.slice(secondSpaceIndex + 1).trim();

  if (!code) {
    const errorReply = await ctx.reply(ctx.t("gist.error_missing_code"));

    scheduleMessageCleanup({
      botMessageId: errorReply.message_id,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
    });

    return;
  }

  const extension = LANGUAGE_EXTENSION_MAP[language] ?? "txt";
  const filename = `code.${extension}`;

  const authorName = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name;

  const chatTitle = "title" in ctx.chat ? ctx.chat.title : "Community Group";
  const description = ctx.t("gist.description", { authorName, chatTitle });
  const originalMessageId = ctx.message.message_id;
  const chatId = ctx.chat.id;

  try {
    const gist = await createGist(
      GITHUB_GIST_TOKEN,
      filename,
      code,
      description,
    );

    await safeDelete(ctx.telegram, chatId, originalMessageId);

    await ctx.reply(
      ctx.t("gist.success_posted", { authorName, gistUrl: gist.htmlUrl }),
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown Error";
    console.error(`Failed to create Gist: ${errorMsg}`);

    const errorReply = await ctx.reply(ctx.t("gist.error_api_failed"));

    scheduleMessageCleanup({
      botMessageId: errorReply.message_id,
      chatId,
      telegram: ctx.telegram,
    });
  }
});
