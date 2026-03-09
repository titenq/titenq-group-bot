import { buildSnapshotMediaCaption } from "./build-snapshot-media-caption";
import { MediaSendFn, SnapshotMediaHandlerMap, VoteCase } from "../interfaces";
import { isSnapshotMediaType } from "./is-snapshot-media-type";

export const sendSnapshotMedia = async (
  chatId: number,
  voteCase: VoteCase,
  actionPrefix: string,
  actor: string,
  mediaSenders: SnapshotMediaHandlerMap<MediaSendFn>,
): Promise<number> => {
  if (!voteCase.snapshotMediaFileId) {
    throw new Error("snapshot_media_file_id ausente");
  }

  const originalUsername = voteCase.targetUser.username
    ? `@${voteCase.targetUser.username}`
    : "sem @username";

  const caption = buildSnapshotMediaCaption(
    actionPrefix,
    actor,
    voteCase.targetUser.firstName,
    originalUsername,
    voteCase.snapshotMessageContent,
  );

  const mediaType = voteCase.snapshotMessageType;

  if (!isSnapshotMediaType(mediaType)) {
    throw new Error(`tipo de mídia não suportado: ${mediaType}`);
  }

  return mediaSenders[mediaType](chatId, voteCase.snapshotMediaFileId, caption);
};
