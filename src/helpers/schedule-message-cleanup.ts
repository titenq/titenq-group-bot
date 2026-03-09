import { FAQ_ERROR_TTL_MS } from "../config/env";
import { ScheduleMessageCleanupParams } from "../interfaces";
import { safeDelete } from "./safe-delete";

export const scheduleMessageCleanup = ({
  botMessageId,
  chatId,
  delayMs = FAQ_ERROR_TTL_MS,
  telegram,
  triggerMessageId,
}: ScheduleMessageCleanupParams) => {
  setTimeout(async () => {
    await safeDelete(telegram, chatId, botMessageId);

    if (triggerMessageId) {
      await safeDelete(telegram, chatId, triggerMessageId);
    }
  }, delayMs);
};
