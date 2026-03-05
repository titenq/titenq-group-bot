export const GroupMemberStatus = {
  MEMBER: "member",
  ADMINISTRATOR: "administrator",
  CREATOR: "creator",
  RESTRICTED: "restricted",
  LEFT: "left",
  KICKED: "kicked",
} as const;

export type GroupMemberStatus =
  (typeof GroupMemberStatus)[keyof typeof GroupMemberStatus];
