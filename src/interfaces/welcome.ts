export interface GroupWelcomeRow {
  chat_id: number;
  template: string;
  updated_at: string | null;
  updated_by_user_id: number | null;
}

export interface GroupWelcomeMessage {
  chatId: number;
  template: string;
  updatedAt?: string;
  updatedByUserId?: number;
}

export interface PendingWelcomeSetup {
  adminId: number;
  chatId: number;
  promptMessageId: number;
  triggerMessageId: number;
}

export interface PendingWelcomeDraft {
  adminId: number;
  chatId: number;
  panelMessageId?: number;
  previewMessageId?: number;
  template: string;
}
