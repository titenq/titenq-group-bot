import { RESTORABLE_MEDIA_TYPES } from "../config/constants";
import { SnapshotMediaType, SnapshotType } from "../enums";

export const isSnapshotMediaType = (
  type: SnapshotType,
): type is SnapshotMediaType => {
  return RESTORABLE_MEDIA_TYPES.has(type as SnapshotMediaType);
};
