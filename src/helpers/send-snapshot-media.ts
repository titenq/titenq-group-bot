import { TFunction } from "i18next";

import { buildSnapshotMediaCaption } from "./build-snapshot-media-caption";
import { MediaSendFn, SnapshotMediaHandlerMap, VoteCase } from "../interfaces";
import { isSnapshotMediaType } from "./is-snapshot-media-type";

export const sendSnapshotMedia = async (
  t: TFunction,
  chatId: number,
  voteCase: VoteCase,
  actionPrefix: string,
  actor: string,
  mediaSenders: SnapshotMediaHandlerMap<MediaSendFn>,
): Promise<number> => {
  if (!voteCase.snapshotMediaFileId) {
    throw new Error("Missing snapshot_media_file_id");
  }

  const originalUsername = voteCase.targetUser.username
    ? `@${voteCase.targetUser.username}`
    : t("admin.suspect_no_username");

  const caption = buildSnapshotMediaCaption(
    t,
    actionPrefix,
    actor,
    voteCase.targetUser.firstName,
    originalUsername,
    voteCase.snapshotMessageContent,
  );

  const mediaType = voteCase.snapshotMessageType;

  if (!isSnapshotMediaType(mediaType)) {
    throw new Error(`Unsupported media type: ${mediaType}`);
  }

  return mediaSenders[mediaType](chatId, voteCase.snapshotMediaFileId, caption);
};
