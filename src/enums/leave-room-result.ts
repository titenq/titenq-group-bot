export const LeaveRoomResult = {
  LEFT: "left",
  NOT_IN_ROOM: "not_in_room",
} as const;

export type LeaveRoomResult =
  (typeof LeaveRoomResult)[keyof typeof LeaveRoomResult];
