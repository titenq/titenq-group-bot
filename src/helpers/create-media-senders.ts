import { Telegram } from "telegraf";

import { MediaSendFn, SnapshotMediaHandlerMap } from "../interfaces/bot";

export const createMediaSenders = (
  telegram: Telegram,
): SnapshotMediaHandlerMap<MediaSendFn> => {
  return {
    photo: async (chatId, fileId, caption) => {
      const message = await telegram.sendPhoto(chatId, fileId, { caption });

      return message.message_id;
    },
    video: async (chatId, fileId, caption) => {
      const message = await telegram.sendVideo(chatId, fileId, { caption });

      return message.message_id;
    },
    document: async (chatId, fileId, caption) => {
      const message = await telegram.sendDocument(chatId, fileId, {
        caption,
      });

      return message.message_id;
    },
    voice: async (chatId, fileId, caption) => {
      const message = await telegram.sendVoice(chatId, fileId, { caption });

      return message.message_id;
    },
    sticker: async (chatId, fileId) => {
      const message = await telegram.sendSticker(chatId, fileId);

      return message.message_id;
    },
    animation: async (chatId, fileId, caption) => {
      const message = await telegram.sendAnimation(chatId, fileId, {
        caption,
      });

      return message.message_id;
    },
    audio: async (chatId, fileId, caption) => {
      const message = await telegram.sendAudio(chatId, fileId, { caption });

      return message.message_id;
    },
  };
};
