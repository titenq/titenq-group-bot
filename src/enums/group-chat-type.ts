export const GroupChatType = {
  GROUP: "group",
  SUPERGROUP: "supergroup",
} as const;

export type GroupChatType = (typeof GroupChatType)[keyof typeof GroupChatType];
