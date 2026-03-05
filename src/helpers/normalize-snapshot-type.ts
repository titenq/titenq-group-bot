import { SNAPSHOT_TYPES } from "../config/constants";
import { SnapshotType } from "../enums/snapshot";

export const normalizeSnapshotType = (value: string): SnapshotType => {
  return SNAPSHOT_TYPES.includes(value as SnapshotType)
    ? (value as SnapshotType)
    : SnapshotType.UNKNOWN;
};
