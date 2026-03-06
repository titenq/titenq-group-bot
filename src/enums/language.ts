export const Language = {
  PT: "pt",
  EN: "en",
  ES: "es",
} as const;

export type Language = (typeof Language)[keyof typeof Language];
