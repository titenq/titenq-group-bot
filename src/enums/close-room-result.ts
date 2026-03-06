export const CloseRoomResult = {
  CLOSED: "closed",
  NOT_FOUND: "not_found",
  NO_PERMISSION: "no_permission",
} as const;

export type CloseRoomResult =
  (typeof CloseRoomResult)[keyof typeof CloseRoomResult];
