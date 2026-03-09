import i18next from "i18next";
import { Telegraf } from "telegraf";

import { MAX_ALERT_TEXT } from "./config/constants";
import {
  BAN_KEYWORD,
  BOT_TOKEN,
  BOT_USERNAME,
  DB_PATH,
  REQUIRED_VOTES,
} from "./config/env";
import { Language } from "./enums";
import { initDatabase, loadGroups, loadActiveRooms } from "./db";
import { rootHandler } from "./handlers";
import { createMediaSenders, loadCasesFromDb } from "./helpers";
import { initI18n } from "./i18n";
import { VoteCase } from "./interfaces/bot";
import { BotContext } from "./interfaces/bot-context";
import { createMessageQueueService } from "./services/message-queue.service";
import { createTempChatService } from "./services/temp-chat.service";

export const bootstrap = async (): Promise<void> => {
  const bot = new Telegraf<BotContext>(BOT_TOKEN);
  const voteCases = new Map<string, VoteCase>();
  const mediaSenders = createMediaSenders(bot.telegram);
  const messageQueue = createMessageQueueService(bot.telegram);
  const db = await initDatabase(DB_PATH);
  const tempChatService = createTempChatService(bot.telegram, messageQueue, db);

  await initI18n();
  await loadCasesFromDb(db, voteCases);

  const activeRooms = await loadActiveRooms(db);
  tempChatService.loadRooms(activeRooms);

  const groups = await loadGroups(db);
  const languageCache = new Map<number, string>();

  for (const group of groups) {
    languageCache.set(group.chatId, group.languageCode);
  }

  bot.use(async (ctx, next) => {
    ctx.db = db;
    ctx.voteCases = voteCases;
    ctx.mediaSenders = mediaSenders;
    ctx.maxAlertText = MAX_ALERT_TEXT;
    ctx.banKeyword = BAN_KEYWORD;
    ctx.requiredVotes = REQUIRED_VOTES;
    ctx.languageCache = languageCache;
    ctx.tempChatService = tempChatService;

    const lng = ctx.chat?.id
      ? languageCache.get(ctx.chat.id) || Language.PT
      : Language.PT;
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
    console.log(`@${BOT_USERNAME} initialized and ready to moderate.`);
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
