import { Composer } from "telegraf";
import { message } from "telegraf/filters";

import { MEDIA_CHANNEL_TARGET } from "../config/env";
import { isGroup, safeDelete, scheduleMessageCleanup } from "../helpers";
import { BotContext } from "../interfaces/bot-context";

export const mediaHandlers = new Composer<BotContext>();

mediaHandlers.on([message("photo"), message("video")], async (ctx, next) => {
  if (!ctx.message.caption || !isGroup(ctx.chat.type)) {
    return next();
  }

  const caption = ctx.message.caption.trim();
  const [commandToken] = caption.split(/\s+/);
  const normalizedCommand = (commandToken ?? "").toLowerCase();

  if (normalizedCommand !== "/media") {
    return next();
  }

  if (!MEDIA_CHANNEL_TARGET) {
    return next();
  }

  const originalMessageId = ctx.message.message_id;
  const chatId = ctx.chat.id;

  const authorName = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name;

  const chatTitle = "title" in ctx.chat ? ctx.chat.title : "Community Group";

  const attributionCaption = ctx.t("media.attribution", {
    authorName,
    chatTitle,
  });

  try {
    const copiedMessage = await ctx.telegram.copyMessage(
      MEDIA_CHANNEL_TARGET,
      chatId,
      originalMessageId,
      {
        caption: attributionCaption,
      },
    );

    await safeDelete(ctx.telegram, chatId, originalMessageId);

    const formattedChannelUsername = MEDIA_CHANNEL_TARGET.startsWith("@")
      ? MEDIA_CHANNEL_TARGET.substring(1)
      : MEDIA_CHANNEL_TARGET;

    const postLink = `https://t.me/${formattedChannelUsername}/${copiedMessage.message_id}`;

    await ctx.reply(ctx.t("media.success_posted", { authorName, postLink }), {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
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
});
