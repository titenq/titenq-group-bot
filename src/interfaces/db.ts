import { VoteCaseStatus } from "../enums";

export interface PersistedRoom {
  id: string;
  ownerId: number;
  participants: number[];
  createdAt: number;
  expiresAt: number;
}

export interface PersistedRoomRow {
  id: string;
  owner_id: number;
  created_at: number;
  expires_at: number;
  user_id: number | null;
}

export interface PersistedGroup {
  chatId: number;
  languageCode: string;
  title?: string;
  addedByUserId?: number;
  addedAt?: string;
  isActive?: boolean;
}

export interface PersistedVoteCase {
  chatId: number;
  chatTitle?: string;
  targetMessageId: number;
  targetUserId: number;
  targetFirstName: string;
  targetUsername?: string;
  snapshotMessageType: string;
  snapshotMessagePreview: string;
  snapshotMessageContent: string;
  snapshotMediaFileId?: string;
  status: VoteCaseStatus;
  statusMsgId?: number;
  voters: number[];
}

export interface PersistedFaq {
  id: number;
  chatId: number;
  triggerKeyword: string;
  messageLink: string;
  createdByUserId?: number;
  createdAt: string;
}

export interface OpenCaseRow {
  chat_id: number;
  chat_title: string | null;
  target_message_id: number;
  target_user_id: number;
  target_first_name: string;
  target_username: string | null;
  snapshot_message_type: string | null;
  snapshot_message_preview: string | null;
  snapshot_message_content: string | null;
  snapshot_media_file_id: string | null;
  status: VoteCaseStatus;
  status_msg_id: number | null;
  voter_id: number | null;
}

export interface GroupFeatureRow {
  chat_id: number;
  feature_key: string;
  is_enabled: number;
  updated_by_user_id: number | null;
  updated_at: string | null;
}

export interface GroupRulesRow {
  chat_id: number;
  message_link: string;
  updated_at: string | null;
  updated_by_user_id: number | null;
}

export interface CaptchaChallengeRow {
  attempts: number;
  available_item_keys_json: string;
  challenge_message_id: number;
  chat_id: number;
  created_at: string | null;
  expires_at: number;
  is_test_mode: number;
  selected_sequence_keys_json: string;
  target_sequence_keys_json: string;
  user_id: number;
}
