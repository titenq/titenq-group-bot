import { SnapshotMediaType, SnapshotType } from "../enums";

export const MAX_SNAPSHOT_PREVIEW = 300;
export const MAX_SNAPSHOT_CONTENT = 3500;
export const MAX_ALERT_TEXT = 180;
export const MAX_MEDIA_CAPTION = 950;
export const VIP_MEMBER_TAG = "VIP";
export const CAPTCHA_GRID_SIZE = 9;
export const CAPTCHA_MAX_ATTEMPTS = 3;
export const CAPTCHA_KICK_BAN_SECONDS = 60;
export const CAPTCHA_SEQUENCE_LENGTH = 3;
export const CAPTCHA_TIMEOUT_MS = 60_000;
export const CAPTCHA_WRONG_SELECTION_PREVIEW_MS = 500;
export const CAPTCHA_ITEMS = [
  { key: "apple", emoji: "🍎" },
  { key: "banana", emoji: "🍌" },
  { key: "grape", emoji: "🍇" },
  { key: "lemon", emoji: "🍋" },
  { key: "strawberry", emoji: "🍓" },
  { key: "carrot", emoji: "🥕" },
  { key: "bread", emoji: "🍞" },
  { key: "cake", emoji: "🎂" },
  { key: "heart", emoji: "❤️" },
  { key: "car", emoji: "🚗" },
  { key: "clown", emoji: "🤡" },
  { key: "fire", emoji: "🔥" },
  { key: "airplane", emoji: "✈️" },
  { key: "lock", emoji: "🔒" },
  { key: "house", emoji: "🏠" },
  { key: "key", emoji: "🔑" },
  { key: "clock", emoji: "🕒" },
  { key: "lightbulb", emoji: "💡" },
  { key: "lips", emoji: "💋" },
  { key: "book", emoji: "📚" },
  { key: "guitar", emoji: "🎸" },
  { key: "ball", emoji: "⚽" },
  { key: "crown", emoji: "👑" },
  { key: "star", emoji: "⭐" },
  { key: "sun", emoji: "☀️" },
  { key: "moon", emoji: "🌙" },
  { key: "cloud", emoji: "☁️" },
  { key: "rocket", emoji: "🚀" },
  { key: "cat", emoji: "🐱" },
  { key: "dog", emoji: "🐶" },
] as const;
export const CAPTCHA_ITEMS_BY_KEY = new Map<
  string,
  { emoji: string; key: string }
>(
  CAPTCHA_ITEMS.map((item) => [item.key, { emoji: item.emoji, key: item.key }]),
);

export const RESTORABLE_MEDIA_TYPES = new Set<SnapshotMediaType>(
  Object.values(SnapshotMediaType),
);

export const SNAPSHOT_TYPES: SnapshotType[] = Object.values(SnapshotType);
