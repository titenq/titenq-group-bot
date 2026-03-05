export const AdminMemberStatus = {
  ADMINISTRATOR: "administrator",
  CREATOR: "creator",
} as const;

export type AdminMemberStatus =
  (typeof AdminMemberStatus)[keyof typeof AdminMemberStatus];
