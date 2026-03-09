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

  const now = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

  const groupLines = stats.groups.map((group) => {
    const flag = LANG_FLAG[group.language] ?? "🌐";
    const status = group.isActive ? "✅" : "❌";
    const name = group.title ?? `ID ${group.chatId}`;

    return [
      `${status} *${name}*`,
      `  ${flag} Idioma: ${group.language.toUpperCase()}`,
      `  📨 Casos abertos: ${group.openCases}`,
      `  📚 FAQs: ${group.totalFaqs}`,
      `  🗓 Desde: ${group.addedAt.substring(0, 10)}`,
      "",
    ].join("\n");
  });

  const report = [
    `📊 *Dashboard — TitenQ Group Bot*`,
    `🕐 ${now}`,
    "",
    `*Grupos*`,
    `• Total: ${stats.totalGroups}`,
    `• Ativos: ${stats.activeGroups}`,
    "",
    `*Votações*`,
    `• Em andamento: ${stats.openVoteCases}`,
    `• Aguardando admin: ${stats.pendingAdminCases}`,
    `• Resolvidos: ${stats.resolvedCases}`,
    `• Total de votos registrados: ${stats.totalVotes}`,
    "",
    `*FAQs*`,
    `• Total geral: ${stats.totalFaqs}`,
    "",
    `*Detalhes por Grupo*`,
    ...groupLines,
  ].join("\n");

  await ctx.telegram.sendMessage(BOT_OWNER_ID, report, {
    parse_mode: "Markdown",
  });

  if (ctx.chat.id !== BOT_OWNER_ID) {
    await ctx.deleteMessage();
  }
});
