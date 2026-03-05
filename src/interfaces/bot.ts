import { SnapshotType } from "../enums/snapshot";
import { VoteCaseStatus } from "../enums/vote-case-status";

export interface TargetUser {
  id: number;
  firstName: string;
  username?: string;
}

export interface SnapshotMediaHandlerMap<T> {
  photo: T;
  video: T;
  document: T;
  voice: T;
  sticker: T;
  animation: T;
  audio: T;
}

export interface MediaSendFn {
  (chatId: number, fileId: string, caption: string): Promise<number>;
}

export interface MessageSnapshot {
  type: SnapshotType;
  preview: string;
  content: string;
  mediaFileId?: string;
}

export interface VoteCase {
  chatId: number;
  chatTitle?: string;
  targetMessageId: number;
  targetUser: TargetUser;
  snapshotMessageType: SnapshotType;
  snapshotMessagePreview: string;
  snapshotMessageContent: string;
  snapshotMediaFileId?: string;
  voters: Set<number>;
  extraAdminVotes: number;
  status: VoteCaseStatus;
  voteCommandMessageIds: Set<number>;
  botMessageIds: Set<number>;
  statusMsgId?: number;
}
