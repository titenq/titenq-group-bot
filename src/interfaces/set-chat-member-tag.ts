import { Telegram } from "telegraf";

export interface SetChatMemberTagCallApi {
  callApi(
    method: "setChatMemberTag",
    payload: {
      chat_id: number;
      tag?: string;
      user_id: number;
    },
  ): Promise<true>;
}

export interface SetChatMemberTagParams {
  chatId: number;
  tag?: string;
  telegram: Telegram;
  userId: number;
}
