export const GroupFeature = {
  CAPTCHA: "captcha",
  FAQ: "faq",
  GIST: "gist",
  GLOBAL_BANS: "global_bans",
  MEDIA: "media",
  MODERATION: "moderation",
  RULES: "rules",
  TRUST: "trust",
  WELCOME: "welcome",
} as const;

export type GroupFeature = (typeof GroupFeature)[keyof typeof GroupFeature];

export const GROUP_FEATURES = Object.values(GroupFeature);

export const DEFAULT_DISABLED_GROUP_FEATURES = new Set<GroupFeature>([
  GroupFeature.CAPTCHA,
  GroupFeature.WELCOME,
]);
