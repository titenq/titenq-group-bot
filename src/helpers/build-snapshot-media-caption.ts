import { TFunction } from "i18next";

import { MAX_MEDIA_CAPTION } from "../config/constants";
import { truncateText } from "./truncate-text";

export const buildSnapshotMediaCaption = (
  t: TFunction,
  actionPrefix: string,
  actor: string,
  authorName: string,
  authorUsername: string,
  snapshotContent: string,
): string => {
  const header = [
    `${actionPrefix} ${actor}`,
    t("snapshots.original_message_author", {
      authorName,
      authorUsername,
    }),
  ].join("\n");

  const fullText = snapshotContent
    ? `${header}\n\n${t("snapshots.original_caption_label")}\n${snapshotContent}`
    : header;

  return truncateText(fullText, MAX_MEDIA_CAPTION);
};
