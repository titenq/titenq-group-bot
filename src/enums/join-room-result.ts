export const JoinRoomResult = {
  JOINED: "joined",
  ALREADY_IN_SAME: "already_in_same",
  FULL: "full",
  NOT_FOUND: "not_found",
} as const;

export type JoinRoomResult =
  (typeof JoinRoomResult)[keyof typeof JoinRoomResult];
