import { Message, PhotoSize } from "telegraf/types";

import {
  MAX_SNAPSHOT_CONTENT,
  MAX_SNAPSHOT_PREVIEW,
} from "../config/constants";
import { SnapshotType, SnapshotCaptionMediaType } from "../enums/snapshot";
import { MessageSnapshot } from "../interfaces/bot";
import { truncateText } from "./truncate-text";

export const getMessageSnapshot = (message: Message): MessageSnapshot => {
  const getFileId = (field: string): string | undefined => {
    if (!(field in message)) {
      return undefined;
    }

    const media = message[field as keyof Message];

    if (!media || typeof media !== "object") {
      return undefined;
    }

    return "file_id" in media && typeof media.file_id === "string"
      ? media.file_id
      : undefined;
  };

  const getPhotoFileId = (): string | undefined => {
    if (!(SnapshotType.PHOTO in message)) {
      return undefined;
    }

    const msg = message as Extract<Message, { photo: PhotoSize[] }>;
    const photos = msg.photo;

    if (!Array.isArray(photos) || photos.length === 0) {
      return undefined;
    }

    const biggestPhoto = photos[photos.length - 1];

    return typeof biggestPhoto?.file_id === "string"
      ? biggestPhoto.file_id
      : undefined;
  };

  if (SnapshotType.TEXT in message && typeof message.text === "string") {
    const normalizedText = message.text.trim();

    return {
      type: SnapshotType.TEXT,
      preview: truncateText(normalizedText, MAX_SNAPSHOT_PREVIEW),
      content: truncateText(normalizedText, MAX_SNAPSHOT_CONTENT),
    };
  }

  if (SnapshotType.CAPTION in message && typeof message.caption === "string") {
    const normalizedCaption = message.caption.trim();

    const mediaTypes = Object.values(SnapshotCaptionMediaType);

    const type =
      mediaTypes.find((mediaType) => mediaType in message) ??
      SnapshotType.MEDIA;

    return {
      type,
      preview: truncateText(normalizedCaption, MAX_SNAPSHOT_PREVIEW),
      content: truncateText(normalizedCaption, MAX_SNAPSHOT_CONTENT),
      mediaFileId:
        type === SnapshotType.PHOTO
          ? getPhotoFileId()
          : [
                SnapshotType.VIDEO,
                SnapshotType.DOCUMENT,
                SnapshotType.ANIMATION,
                SnapshotType.AUDIO,
              ].some((snapshotType) => snapshotType === type)
            ? getFileId(type)
            : undefined,
    };
  }

  if (SnapshotType.STICKER in message) {
    return {
      type: SnapshotType.STICKER,
      preview: "[sticker]",
      content: "",
      mediaFileId: getFileId(SnapshotType.STICKER),
    };
  }

  if (SnapshotType.PHOTO in message) {
    return {
      type: SnapshotType.PHOTO,
      preview: "[foto sem legenda]",
      content: "",
      mediaFileId: getPhotoFileId(),
    };
  }

  if (SnapshotType.VIDEO in message) {
    return {
      type: SnapshotType.VIDEO,
      preview: "[vídeo sem legenda]",
      content: "",
      mediaFileId: getFileId(SnapshotType.VIDEO),
    };
  }

  if (SnapshotType.VOICE in message) {
    return {
      type: SnapshotType.VOICE,
      preview: "[áudio de voz]",
      content: "",
      mediaFileId: getFileId(SnapshotType.VOICE),
    };
  }

  if (SnapshotType.DOCUMENT in message) {
    return {
      type: SnapshotType.DOCUMENT,
      preview: "[documento sem legenda]",
      content: "",
      mediaFileId: getFileId(SnapshotType.DOCUMENT),
    };
  }

  if (SnapshotType.ANIMATION in message) {
    return {
      type: SnapshotType.ANIMATION,
      preview: "[animação sem legenda]",
      content: "",
      mediaFileId: getFileId(SnapshotType.ANIMATION),
    };
  }

  if (SnapshotType.AUDIO in message) {
    return {
      type: SnapshotType.AUDIO,
      preview: "[áudio sem legenda]",
      content: "",
      mediaFileId: getFileId(SnapshotType.AUDIO),
    };
  }

  return {
    type: SnapshotType.UNKNOWN,
    preview: "[conteúdo sem texto]",
    content: "",
  };
};
