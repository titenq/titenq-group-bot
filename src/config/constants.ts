import { SnapshotMediaType, SnapshotType } from "../enums/snapshot";

export const MAX_SNAPSHOT_PREVIEW = 300;
export const MAX_SNAPSHOT_CONTENT = 3500;
export const MAX_ALERT_TEXT = 180;
export const MAX_MEDIA_CAPTION = 950;

export const RESTORABLE_MEDIA_TYPES = new Set<SnapshotMediaType>(
  Object.values(SnapshotMediaType),
);

export const SNAPSHOT_TYPES: SnapshotType[] = Object.values(SnapshotType);
