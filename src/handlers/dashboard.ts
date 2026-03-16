import { Composer } from "telegraf";

import { BOT_OWNER_ID } from "../config/env";
import { getDashboardStats } from "../db";
import { BotContext } from "../interfaces";

const LANG_FLAG: Record<string, string> = {
  pt: "🇧🇷",
  en: "🇺🇸",
  es: "🇪🇸",
};

export const dashboardHandlers = new Composer<BotContext>();

dashboardHandlers.command("dashboard", async (ctx) => {
  if (!BOT_OWNER_ID) {
    return;
  }

  if (ctx.from.id !== BOT_OWNER_ID) {
    return;
  }

  const stats = await getDashboardStats(ctx.db);

  const now = new Date().toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "short",
    timeStyle: "short",
  });

  const groupLines = stats.groups.map((group) => {
    const flag = LANG_FLAG[group.language] ?? "🌐";
    const status = group.isActive ? "✅" : "❌";
    const name =
      group.title ??
      ctx.t("dashboard.group_id_fallback", {
        chatId: group.chatId,
      });

    return [
      `${status} *${name}*`,
      `  ${flag} ${ctx.t("dashboard.group_language", {
        language: group.language.toUpperCase(),
      })}`,
      `  📨 ${ctx.t("dashboard.group_open_cases", {
        count: group.openCases,
      })}`,
      `  📚 ${ctx.t("dashboard.group_total_faqs", {
        count: group.totalFaqs,
      })}`,
      `  🗓 ${ctx.t("dashboard.group_added_since", {
        date: group.addedAt.substring(0, 10),
      })}`,
      "",
    ].join("\n");
  });

  const report = [
    `📊 *${ctx.t("dashboard.title")}*`,
    `🕐 ${now}`,
    "",
    `*${ctx.t("dashboard.groups_section")}*`,
    `• ${ctx.t("dashboard.groups_total", { count: stats.totalGroups })}`,
    `• ${ctx.t("dashboard.groups_active", { count: stats.activeGroups })}`,
    "",
    `*${ctx.t("dashboard.votes_section")}*`,
    `• ${ctx.t("dashboard.votes_open", { count: stats.openVoteCases })}`,
    `• ${ctx.t("dashboard.votes_pending_admin", {
      count: stats.pendingAdminCases,
    })}`,
    `• ${ctx.t("dashboard.votes_resolved", { count: stats.resolvedCases })}`,
    `• ${ctx.t("dashboard.votes_total", { count: stats.totalVotes })}`,
    "",
    `*${ctx.t("dashboard.faqs_section")}*`,
    `• ${ctx.t("dashboard.faqs_total", { count: stats.totalFaqs })}`,
    "",
    `*${ctx.t("dashboard.group_details_section")}*`,
    ...groupLines,
  ].join("\n");

  await ctx.telegram.sendMessage(BOT_OWNER_ID, report, {
    parse_mode: "Markdown",
  });

  if (ctx.chat.id !== BOT_OWNER_ID) {
    await ctx.deleteMessage();
  }
});
