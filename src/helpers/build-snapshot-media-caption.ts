import { MAX_MEDIA_CAPTION } from "../config/constants";
import { truncateText } from "./truncate-text";

export const buildSnapshotMediaCaption = (
  actionPrefix: string,
  actor: string,
  authorName: string,
  authorUsername: string,
  snapshotContent: string,
): string => {
  const header = `${actionPrefix} ${actor}
Mensagem originalmente enviada por ${authorName} (${authorUsername})`;

  const fullText = snapshotContent
    ? `${header}\n\nLegenda original:\n${snapshotContent}`
    : header;

  return truncateText(fullText, MAX_MEDIA_CAPTION);
};
