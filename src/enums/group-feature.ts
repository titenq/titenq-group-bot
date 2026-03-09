export const GroupFeature = {
  FAQ: "faq",
  GIST: "gist",
  MEDIA: "media",
  MODERATION: "moderation",
  TRUST: "trust",
} as const;

export type GroupFeature = (typeof GroupFeature)[keyof typeof GroupFeature];

export const GROUP_FEATURES = Object.values(GroupFeature);
