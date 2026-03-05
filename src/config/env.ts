import { loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : "unknown error";

  console.error(`Failed to load .env file: ${errorMessage}`);
}

const {
  BOT_TOKEN: BOT_TOKEN_ENV,
  REQUIRED_VOTES: REQUIRED_VOTES_ENV,
  BAN_KEYWORD: BAN_KEYWORD_ENV,
  FAQ_TRIGGER_LENGTH: FAQ_TRIGGER_LENGTH_ENV,
  FAQ_ERROR_TTL_MS: FAQ_ERROR_TTL_MS_ENV,
  MEDIA_CHANNEL_TARGET: MEDIA_CHANNEL_TARGET_ENV,
  GITHUB_GIST_TOKEN: GITHUB_GIST_TOKEN_ENV,
  BOT_OWNER_ID: BOT_OWNER_ID_ENV,
  DB_PATH: DB_PATH_ENV,
} = process.env;

if (!BOT_TOKEN_ENV) {
  throw new Error("BOT_TOKEN is not defined in the .env file.");
}

export const BOT_TOKEN = BOT_TOKEN_ENV;
export const REQUIRED_VOTES = parseInt(REQUIRED_VOTES_ENV ?? "10", 10);
export const BAN_KEYWORD = (BAN_KEYWORD_ENV ?? "ban").trim().toLowerCase();
export const FAQ_TRIGGER_LENGTH = parseInt(FAQ_TRIGGER_LENGTH_ENV ?? "20", 10);
export const FAQ_ERROR_TTL_MS = parseInt(FAQ_ERROR_TTL_MS_ENV ?? "60000", 10);
export const MEDIA_CHANNEL_TARGET = MEDIA_CHANNEL_TARGET_ENV?.trim();
export const GITHUB_GIST_TOKEN = GITHUB_GIST_TOKEN_ENV?.trim();
export const BOT_OWNER_ID = BOT_OWNER_ID_ENV
  ? parseInt(BOT_OWNER_ID_ENV, 10)
  : undefined;
export const DB_PATH = DB_PATH_ENV ?? "./data/bot.sqlite";

if (Number.isNaN(REQUIRED_VOTES) || REQUIRED_VOTES <= 0) {
  throw new Error("REQUIRED_VOTES must be a positive integer.");
}

if (Number.isNaN(FAQ_TRIGGER_LENGTH) || FAQ_TRIGGER_LENGTH <= 0) {
  throw new Error("FAQ_TRIGGER_LENGTH must be a positive integer.");
}

if (Number.isNaN(FAQ_ERROR_TTL_MS) || FAQ_ERROR_TTL_MS <= 0) {
  throw new Error("FAQ_ERROR_TTL_MS must be a positive integer.");
}
