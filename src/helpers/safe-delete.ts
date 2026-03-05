import { Telegram } from "telegraf";

export const safeDelete = async (
  telegram: Telegram,
  chatId: number,
  messageId: number,
): Promise<void> => {
  try {
    await telegram.deleteMessage(chatId, messageId);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "unknown error";

    console.debug(`Failed to remove message ${messageId}: ${errorMessage}`);
  }
};
