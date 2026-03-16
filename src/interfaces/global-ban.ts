export interface GlobalBan {
  id: number;
  user_id: number;
  username: string | null;
  group_id: number;
  group_name: string;
  message_text: string | null;
  reason: string | null;
  admin_id: number;
  date?: number;
}

export interface GlobalBanHistoryRow {
  group_name: string;
  reason: string | null;
  message_text: string | null;
  date: number;
}
