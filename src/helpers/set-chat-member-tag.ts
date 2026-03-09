import { Telegram } from "telegraf";

import {
  SetChatMemberTagCallApi,
  SetChatMemberTagParams,
} from "../interfaces/set-chat-member-tag";

export const setChatMemberTag = async ({
  chatId,
  tag,
  telegram,
  userId,
}: SetChatMemberTagParams): Promise<boolean> => {
  try {
    const telegramWithSetChatMemberTag = telegram as Telegram &
      SetChatMemberTagCallApi;

    await telegramWithSetChatMemberTag.callApi("setChatMemberTag", {
      chat_id: chatId,
      tag,
      user_id: userId,
    });

    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.warn(
        `[TrustHandler] Failed to update chat member tag for user ${userId} in chat ${chatId}: ${error.message}`,
      );
    } else {
      console.warn(
        `[TrustHandler] Failed to update chat member tag for user ${userId} in chat ${chatId}: Unknown error`,
      );
    }

    return false;
  }
};
