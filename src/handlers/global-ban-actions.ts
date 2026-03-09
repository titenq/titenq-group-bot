import { Composer } from "telegraf";

import { addGlobalBan, getGlobalBanHistory } from "../db";
import { Action } from "../enums/action";
import { formatGroupDate, isAdmin, safeDelete, truncateText } from "../helpers";
import { BotContext } from "../interfaces/bot-context";

export const globalBanActions = new Composer<BotContext>();

const ensureAdmin = async (ctx: BotContext): Promise<boolean> => {
  if (!ctx.chat) {
    return false;
  }

  const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from!.id);
  const isUserAdmin = isAdmin(member);

  if (!isUserAdmin) {
    await ctx.answerCbQuery(ctx.t("global_ban.admin_only_button"), {
      show_alert: true,
    });

    return false;
  }

  return true;
};

globalBanActions.action(
  new RegExp(`^${Action.VIEW_BAN_REASONS}:(\\d+)$`),
  async (ctx) => {
    if (!(await ensureAdmin(ctx))) {
      return;
    }

    const userId = parseInt(ctx.match[1], 10);
    const history = await getGlobalBanHistory(ctx.db, userId);

    if (history.length === 0) {
      await ctx.answerCbQuery(ctx.t("admin.error_case_not_found"), {
        show_alert: true,
      });

      return;
    }

    let historyText = ctx.t("global_ban.history_title", { userId });
    const languageCode = ctx.chat?.id
      ? ctx.languageCache.get(ctx.chat.id)
      : undefined;

    for (const item of history) {
      const dateStr = formatGroupDate(item.date, languageCode);

      historyText += ctx.t("global_ban.history_item", {
        groupName: item.group_name,
        reason: item.reason || ctx.t("admin.no_reason_provided"),
        messageText: item.message_text || "---",
        date: dateStr,
      });
    }

    await ctx.answerCbQuery(truncateText(historyText, ctx.maxAlertText), {
      show_alert: true,
    });
  },
);

globalBanActions.action(
  new RegExp(`^${Action.BAN_USER}:(\\d+)$`),
  async (ctx) => {
    if (!(await ensureAdmin(ctx))) {
      return;
    }

    const userId = parseInt(ctx.match[1], 10);
    const chatId = ctx.chat!.id;
    const groupName =
      ctx.chat && "title" in ctx.chat ? ctx.chat.title : "Unknown";

    try {
      await ctx.telegram.banChatMember(chatId, userId);
    } catch (error) {
      console.error(
        `[GlobalBan] Failed to ban user from button: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );

      if (error instanceof Error) {
        await ctx.answerCbQuery(
          ctx.t("admin.error_ban_failed", { message: error.message }),
          {
            show_alert: true,
          },
        );

        return;
      }

      await ctx.answerCbQuery(ctx.t("admin.error_ban_failed_permissions"), {
        show_alert: true,
      });

      return;
    }

    let name = String(userId);

    try {
      const member = await ctx.telegram.getChatMember(chatId, userId);

      name = member.user.first_name;
    } catch (error) {
      console.warn(
        `[GlobalBan] Failed to resolve banned user name: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }

    try {
      await addGlobalBan(ctx.db, {
        user_id: userId,
        username: null,
        group_id: chatId,
        group_name: groupName,
        message_text: null,
        reason: null,
        admin_id: ctx.from.id,
      });
    } catch (error) {
      console.error(
        `[GlobalBan] Failed to persist global ban: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }

    await ctx.answerCbQuery(ctx.t("global_ban.confirmed_ban", { name }), {
      show_alert: true,
    });

    if (ctx.callbackQuery.message) {
      await safeDelete(
        ctx.telegram,
        chatId,
        ctx.callbackQuery.message.message_id,
      );
    }
  },
);

globalBanActions.action(Action.IGNORE_BAN_ALERT, async (ctx) => {
  if (!(await ensureAdmin(ctx))) {
    return;
  }

  if (ctx.callbackQuery.message) {
    await safeDelete(
      ctx.telegram,
      ctx.chat!.id,
      ctx.callbackQuery.message.message_id,
    );
  }

  await ctx.answerCbQuery(ctx.t("admin.word_ignored"));
});
