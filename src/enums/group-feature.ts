export const GroupFeature = {
  CAPTCHA: "captcha",
  FAQ: "faq",
  GIST: "gist",
  MEDIA: "media",
  MODERATION: "moderation",
  TRUST: "trust",
} as const;

export type GroupFeature = (typeof GroupFeature)[keyof typeof GroupFeature];

export const GROUP_FEATURES = Object.values(GroupFeature);

export const DEFAULT_DISABLED_GROUP_FEATURES = new Set<GroupFeature>([
  GroupFeature.CAPTCHA,
]);
