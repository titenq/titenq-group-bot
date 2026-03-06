import { loadEnvFile } from "node:process";

import { Language } from "../enums/language";

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
  LANGUAGE: LANGUAGE_ENV,
  FAQ_TRIGGER_LENGTH: FAQ_TRIGGER_LENGTH_ENV,
  FAQ_ERROR_TTL_MS: FAQ_ERROR_TTL_MS_ENV,
  MEDIA_CHANNEL_TARGET: MEDIA_CHANNEL_TARGET_ENV,
  GITHUB_GIST_TOKEN: GITHUB_GIST_TOKEN_ENV,
  BOT_OWNER_ID: BOT_OWNER_ID_ENV,
  DB_PATH: DB_PATH_ENV,
  BOT_USERNAME: BOT_USERNAME_ENV,
  CHAT_EXPIRATION_TIME: CHAT_EXPIRATION_TIME_ENV,
  MAX_USERS_PER_ROOM: MAX_USERS_PER_ROOM_ENV,
  MAX_MESSAGES_PER_10_SECONDS: MAX_MESSAGES_PER_10_SECONDS_ENV,
} = process.env;

if (!BOT_TOKEN_ENV || !BOT_USERNAME_ENV) {
  throw new Error("BOT_TOKEN and BOT_USERNAME are required in the .env file.");
}

export const BOT_TOKEN = BOT_TOKEN_ENV;
export const BOT_USERNAME = BOT_USERNAME_ENV;
export const REQUIRED_VOTES = parseInt(REQUIRED_VOTES_ENV ?? "10", 10);
export const BAN_KEYWORD = (BAN_KEYWORD_ENV ?? "ban").trim().toLowerCase();

const parsedLanguage = LANGUAGE_ENV?.trim().toLowerCase() as Language;

export const LANGUAGE = Object.values(Language).includes(parsedLanguage)
  ? parsedLanguage
  : Language.PT;

export const FAQ_TRIGGER_LENGTH = parseInt(FAQ_TRIGGER_LENGTH_ENV ?? "20", 10);
export const FAQ_ERROR_TTL_MS = parseInt(FAQ_ERROR_TTL_MS_ENV ?? "60000", 10);
export const MEDIA_CHANNEL_TARGET = MEDIA_CHANNEL_TARGET_ENV?.trim();
export const GITHUB_GIST_TOKEN = GITHUB_GIST_TOKEN_ENV?.trim();
export const BOT_OWNER_ID = BOT_OWNER_ID_ENV
  ? parseInt(BOT_OWNER_ID_ENV, 10)
  : undefined;
export const DB_PATH = DB_PATH_ENV ?? "./data/bot.sqlite";
export const CHAT_EXPIRATION_TIME = parseInt(
  CHAT_EXPIRATION_TIME_ENV ?? "60",
  10,
);
export const MAX_USERS_PER_ROOM = parseInt(MAX_USERS_PER_ROOM_ENV ?? "10", 10);
export const MAX_MESSAGES_PER_10_SECONDS = parseInt(
  MAX_MESSAGES_PER_10_SECONDS_ENV ?? "5",
  10,
);

if (Number.isNaN(REQUIRED_VOTES) || REQUIRED_VOTES <= 0) {
  throw new Error("REQUIRED_VOTES must be a positive integer.");
}

if (Number.isNaN(FAQ_TRIGGER_LENGTH) || FAQ_TRIGGER_LENGTH <= 0) {
  throw new Error("FAQ_TRIGGER_LENGTH must be a positive integer.");
}

if (Number.isNaN(FAQ_ERROR_TTL_MS) || FAQ_ERROR_TTL_MS <= 0) {
  throw new Error("FAQ_ERROR_TTL_MS must be a positive integer.");
}

if (Number.isNaN(CHAT_EXPIRATION_TIME) || CHAT_EXPIRATION_TIME <= 0) {
  throw new Error("CHAT_EXPIRATION_TIME must be a positive integer.");
}

if (Number.isNaN(MAX_USERS_PER_ROOM) || MAX_USERS_PER_ROOM <= 0) {
  throw new Error("MAX_USERS_PER_ROOM must be a positive integer.");
}

if (
  Number.isNaN(MAX_MESSAGES_PER_10_SECONDS) ||
  MAX_MESSAGES_PER_10_SECONDS <= 0
) {
  throw new Error("MAX_MESSAGES_PER_10_SECONDS must be a positive integer.");
}
