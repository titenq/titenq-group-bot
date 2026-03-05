export const VoteCaseStatus = {
  VOTING: "voting",
  PENDING_ADMIN: "pending_admin",
  RESTORED: "restored",
  BANNED: "banned",
  IGNORED: "ignored",
} as const;

export type VoteCaseStatus =
  (typeof VoteCaseStatus)[keyof typeof VoteCaseStatus];
