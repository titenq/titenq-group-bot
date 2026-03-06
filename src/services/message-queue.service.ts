import i18next from "i18next";
import { Telegram } from "telegraf";

import { QueueJob } from "../interfaces/queue-job";

const BATCH_SIZE = 20;
const INTERVAL_MS = 1000;

const processBatch = async (
  telegram: Telegram,
  job: QueueJob,
  targets: number[],
): Promise<void> => {
  const promises = targets.map(async (targetId) => {
    try {
      await telegram.sendMessage(
        targetId,
        i18next.t("commands.temp_chat_relay_header", {
          roomId: job.roomId,
          name: job.authorName,
        }),
        { parse_mode: "HTML" },
      );

      await telegram.copyMessage(targetId, job.sourceChatId, job.messageId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "unknown error";

      console.error(
        `[MessageQueue] Failed to relay message to ${targetId}:`,
        errorMessage,
      );
    }
  });

  await Promise.all(promises);
};

export const createMessageQueueService = (telegram: Telegram) => {
  const queue: QueueJob[] = [];
  let isProcessing = false;

  const startProcessing = (): void => {
    if (queue.length === 0) {
      isProcessing = false;

      return;
    }

    isProcessing = true;

    const job = queue[0];
    const targetsToProcess = job.targetChatIds.splice(0, BATCH_SIZE);

    if (job.targetChatIds.length === 0) {
      queue.shift();
    }

    processBatch(telegram, job, targetsToProcess)
      .catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : "unknown error";

        console.error("[MessageQueue] Error processing batch:", errorMessage);
      })
      .finally(() => {
        setTimeout(() => startProcessing(), INTERVAL_MS);
      });
  };

  const addJob = (job: QueueJob): void => {
    queue.push(job);

    if (!isProcessing) {
      startProcessing();
    }
  };

  return { addJob };
};
