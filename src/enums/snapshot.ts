export const SnapshotCaptionMediaType = {
  PHOTO: "photo",
  VIDEO: "video",
  DOCUMENT: "document",
  ANIMATION: "animation",
  AUDIO: "audio",
} as const;

export type SnapshotCaptionMediaType =
  (typeof SnapshotCaptionMediaType)[keyof typeof SnapshotCaptionMediaType];

export const SnapshotMediaType = {
  ...SnapshotCaptionMediaType,
  VOICE: "voice",
  STICKER: "sticker",
} as const;

export type SnapshotMediaType =
  (typeof SnapshotMediaType)[keyof typeof SnapshotMediaType];

export const SnapshotType = {
  ...SnapshotMediaType,
  TEXT: "text",
  CAPTION: "caption",
  MEDIA: "media",
  UNKNOWN: "unknown",
} as const;

export type SnapshotType = (typeof SnapshotType)[keyof typeof SnapshotType];
