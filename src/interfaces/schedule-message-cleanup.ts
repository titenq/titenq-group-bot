import { Telegram } from "telegraf";

export interface ScheduleMessageCleanupParams {
  botMessageId: number;
  chatId: number;
  delayMs?: number;
  triggerMessageId?: number;
  telegram: Telegram;
}
