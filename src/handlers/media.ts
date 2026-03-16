import { Composer } from "telegraf";
import { message } from "telegraf/filters";

import { MEDIA_CHANNEL_TARGET } from "../config/env";
import { GroupFeature } from "../enums";
import {
  isGroup,
  isGroupFeatureEnabled,
  safeDelete,
  scheduleMessageCleanup,
} from "../helpers";
import { BotContext } from "../interfaces";

export const mediaHandlers = new Composer<BotContext>();

const isMediaCommand = (text: string): boolean => {
  const [commandToken] = text.trim().split(/\s+/);
  const normalizedCommand = (commandToken ?? "").split("@")[0].toLowerCase();

  return normalizedCommand === "/media";
};

const buildGroupMessageLink = (
  chat: {
    id: number;
    username?: string;
  },
  messageId: number,
): string | null => {
  if ("username" in chat && chat.username) {
    return `https://t.me/${chat.username}/${messageId}`;
  }

  if (String(chat.id).startsWith("-100")) {
    return `https://t.me/c/${String(chat.id).slice(4)}/${messageId}`;
  }

  return null;
};

const postMediaToGallery = async (
  ctx: BotContext,
  sourceMessage: {
    from?: { first_name: string; username?: string };
    message_id: number;
  },
) => {
  if (!ctx.chat || !ctx.from || !ctx.message) {
    return;
  }

  if (!(await isGroupFeatureEnabled(ctx, GroupFeature.MEDIA))) {
    return;
  }

  if (!MEDIA_CHANNEL_TARGET) {
    return;
  }

  const originalMessageId = sourceMessage.message_id;
  const chatId = ctx.chat.id;

  const authorName = sourceMessage.from?.username
    ? `@${sourceMessage.from.username}`
    : sourceMessage.from?.first_name || ctx.from.first_name;

  const chatTitle = "title" in ctx.chat ? ctx.chat.title : "Community Group";
  const formattedChannelUsername = MEDIA_CHANNEL_TARGET.startsWith("@")
    ? MEDIA_CHANNEL_TARGET.substring(1)
    : null;

  try {
    const copiedMessage = await ctx.telegram.copyMessage(
      MEDIA_CHANNEL_TARGET,
      chatId,
      originalMessageId,
      {
        caption: ctx.t("media.attribution", {
          authorName,
          chatTitle,
        }),
      },
    );

    const postLink = formattedChannelUsername
      ? `https://t.me/${formattedChannelUsername}/${copiedMessage.message_id}`
      : null;
    const successMessage = await ctx.reply(
      ctx.t("media.success_posted", {
        authorName,
        postLink: postLink ?? "#",
      }),
      {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      },
    );

    const groupMessageLink = buildGroupMessageLink(
      ctx.chat,
      successMessage.message_id,
    );

    if (groupMessageLink) {
      try {
        await ctx.telegram.editMessageCaption(
          MEDIA_CHANNEL_TARGET,
          copiedMessage.message_id,
          undefined,
          ctx.t("media.attribution_linked", {
            authorName,
            chatTitle,
            postLink: groupMessageLink,
          }),
          {
            parse_mode: "HTML",
          },
        );
      } catch (error) {
        console.warn(
          `[Media] Failed to update channel caption link: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
    }

    await safeDelete(ctx.telegram, chatId, originalMessageId);

    if (ctx.message.message_id !== originalMessageId) {
      await safeDelete(ctx.telegram, chatId, ctx.message.message_id);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown Error";

    console.error(`Failed to forward media to channel: ${errorMsg}`);

    const errorReply = await ctx.reply(ctx.t("media.error_forwarding"));

    scheduleMessageCleanup({
      botMessageId: errorReply.message_id,
      chatId,
      telegram: ctx.telegram,
    });
  }
};

mediaHandlers.on([message("photo"), message("video")], async (ctx, next) => {
  if (!ctx.chat || !ctx.message.caption || !isGroup(ctx.chat.type)) {
    return next();
  }

  if (!isMediaCommand(ctx.message.caption)) {
    return next();
  }

  await postMediaToGallery(ctx, ctx.message);
});
