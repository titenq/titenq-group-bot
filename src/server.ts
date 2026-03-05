import i18next from "i18next";
import { Telegraf } from "telegraf";

import { MAX_ALERT_TEXT } from "./config/constants";
import { BAN_KEYWORD, BOT_TOKEN, DB_PATH, REQUIRED_VOTES } from "./config/env";
import { initDatabase, loadGroups } from "./db";
import { rootHandler } from "./handlers";
import { createMediaSenders, loadCasesFromDb } from "./helpers";
import { initI18n } from "./i18n";
import { VoteCase } from "./interfaces/bot";
import { BotContext } from "./interfaces/bot-context";

export const bootstrap = async (): Promise<void> => {
  const bot = new Telegraf<BotContext>(BOT_TOKEN);
  const voteCases = new Map<string, VoteCase>();
  const mediaSenders = createMediaSenders(bot.telegram);
  const db = await initDatabase(DB_PATH);

  await initI18n();
  await loadCasesFromDb(db, voteCases);

  const groups = await loadGroups(db);
  const languageCache = new Map<number, string>();

  for (const g of groups) {
    languageCache.set(g.chatId, g.languageCode);
  }

  bot.use(async (ctx, next) => {
    ctx.db = db;
    ctx.voteCases = voteCases;
    ctx.mediaSenders = mediaSenders;
    ctx.maxAlertText = MAX_ALERT_TEXT;
    ctx.banKeyword = BAN_KEYWORD;
    ctx.requiredVotes = REQUIRED_VOTES;
    ctx.languageCache = languageCache;

    const lng = ctx.chat?.id ? languageCache.get(ctx.chat.id) || "en" : "en";
    ctx.t = i18next.getFixedT(lng);

    return next();
  });

  bot.use(rootHandler);

  bot.catch((error, ctx) => {
    const errorMessage =
      error instanceof Error ? error.message : "unknown error";

    console.error(
      `[ERROR] update=${ctx.update.update_id} chat=${ctx.chat?.id ?? "n/a"}: ${errorMessage}`,
    );
  });

  try {
    console.log("TitenQGroupBot initialized and ready to moderate.");
    console.log(`Using SQLite DB: ${DB_PATH}`);

    await bot.launch();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "unknown error";

    console.error(`Failed to start the bot: ${errorMessage}`);

    return;
  }

  ["SIGINT", "SIGTERM"].forEach((signal) => {
    process.once(signal, () => bot.stop(signal));
  });
};
