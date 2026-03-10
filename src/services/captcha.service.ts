import i18next from "i18next";
import { Telegram } from "telegraf";

import {
  CAPTCHA_KICK_BAN_SECONDS,
  CAPTCHA_TIMEOUT_MS,
} from "../config/constants";
import {
  BotDb,
  deleteCaptchaChallenge,
  getCaptchaChallenge,
  upsertCaptchaChallenge,
} from "../db";
import {
  buildCaptchaChallengeText,
  createCaptchaChallenge,
  safeDelete,
} from "../helpers";
import { CaptchaChallenge, StartCaptchaChallengeParams } from "../interfaces";
import { captchaChallengeMarkup } from "../markups/captcha-challenge";

const buildChallengeKey = (chatId: number, userId: number): string =>
  `${chatId}:${userId}`;

const getRestrictedPermissions = () => ({
  can_add_web_page_previews: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_messages: false,
  can_send_other_messages: false,
  can_send_photos: false,
  can_send_polls: false,
  can_send_video_notes: false,
  can_send_videos: false,
  can_send_voice_notes: false,
});

export const createCaptchaService = (telegram: Telegram, db: BotDb) => {
  const timeouts = new Map<string, NodeJS.Timeout>();

  const clearExpiration = (chatId: number, userId: number): void => {
    const timeoutKey = buildChallengeKey(chatId, userId);
    const timeout = timeouts.get(timeoutKey);

    if (timeout) {
      clearTimeout(timeout);
      timeouts.delete(timeoutKey);
    }
  };

  const getDefaultChatPermissions = async (chatId: number) => {
    const chat = await telegram.getChat(chatId);

    if ("permissions" in chat && chat.permissions) {
      return chat.permissions;
    }

    return {
      can_add_web_page_previews: true,
      can_send_audios: true,
      can_send_documents: true,
      can_send_messages: true,
      can_send_other_messages: true,
      can_send_photos: true,
      can_send_polls: true,
      can_send_video_notes: true,
      can_send_videos: true,
      can_send_voice_notes: true,
    };
  };

  const cleanupChallenge = async (
    challenge: CaptchaChallenge,
    deleteMessage = true,
  ): Promise<void> => {
    clearExpiration(challenge.chatId, challenge.userId);

    if (deleteMessage) {
      await safeDelete(
        telegram,
        challenge.chatId,
        challenge.challengeMessageId,
      );
    }

    await deleteCaptchaChallenge(db, challenge.chatId, challenge.userId);
  };

  const expireChallenge = async (
    chatId: number,
    userId: number,
    deleteMessage = true,
  ): Promise<CaptchaChallenge | null> => {
    const challenge = await getCaptchaChallenge(db, chatId, userId);

    if (!challenge) {
      clearExpiration(chatId, userId);

      return null;
    }

    if (challenge.isTestMode) {
      await cleanupChallenge(challenge, deleteMessage);

      return challenge;
    }

    try {
      await telegram.banChatMember(
        chatId,
        userId,
        Math.floor(Date.now() / 1000) + CAPTCHA_KICK_BAN_SECONDS,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "unknown error";

      console.error(
        `[Captcha] Failed to remove user ${userId} from chat ${chatId}: ${errorMessage}`,
      );
    }

    await cleanupChallenge(challenge, deleteMessage);

    return challenge;
  };

  const scheduleExpiration = (challenge: CaptchaChallenge): void => {
    clearExpiration(challenge.chatId, challenge.userId);

    const delay = challenge.expiresAt - Date.now();

    if (delay <= 0) {
      expireChallenge(challenge.chatId, challenge.userId).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : "unknown error";

        console.error(
          `[Captcha] Failed to expire challenge for ${challenge.userId} in ${challenge.chatId}: ${errorMessage}`,
        );
      });

      return;
    }

    const timeout = setTimeout(
      () => {
        expireChallenge(challenge.chatId, challenge.userId).catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : "unknown error";

          console.error(
            `[Captcha] Failed to expire challenge for ${challenge.userId} in ${challenge.chatId}: ${errorMessage}`,
          );
        });
      },
      Math.min(delay, CAPTCHA_TIMEOUT_MS),
    );

    timeouts.set(
      buildChallengeKey(challenge.chatId, challenge.userId),
      timeout,
    );
  };

  const loadChallenges = (challenges: CaptchaChallenge[]): void => {
    for (const challenge of challenges) {
      scheduleExpiration(challenge);
    }

    console.log(
      `[Captcha] ${challenges.length} challenge(s) loaded from database.`,
    );
  };

  const startChallenge = async (
    params: StartCaptchaChallengeParams,
  ): Promise<CaptchaChallenge | null> => {
    const currentChallenge = await getCaptchaChallenge(
      db,
      params.chatId,
      params.userId,
    );

    if (currentChallenge) {
      await cleanupChallenge(currentChallenge);
    }

    if (!params.isTestMode) {
      try {
        await telegram.restrictChatMember(params.chatId, params.userId, {
          permissions: getRestrictedPermissions(),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "unknown error";

        console.error(
          `[Captcha] Failed to restrict user ${params.userId} in chat ${params.chatId}: ${errorMessage}`,
        );

        return null;
      }
    }

    const challenge = createCaptchaChallenge(
      params.chatId,
      params.userId,
      params.isTestMode,
    );

    const t = i18next.getFixedT(params.languageCode);

    const sentMessage = await telegram.sendMessage(
      params.chatId,
      buildCaptchaChallengeText(t, challenge),
      {
        parse_mode: "HTML",
        ...captchaChallengeMarkup(t, challenge),
      },
    );

    const persistedChallenge: CaptchaChallenge = {
      ...challenge,
      challengeMessageId: sentMessage.message_id,
    };

    await upsertCaptchaChallenge(db, persistedChallenge);

    scheduleExpiration(persistedChallenge);

    return persistedChallenge;
  };

  const completeChallenge = async (
    chatId: number,
    userId: number,
  ): Promise<CaptchaChallenge | null> => {
    const challenge = await getCaptchaChallenge(db, chatId, userId);

    if (!challenge) {
      clearExpiration(chatId, userId);

      return null;
    }

    if (challenge.isTestMode) {
      await cleanupChallenge(challenge);

      return challenge;
    }

    try {
      const permissions = await getDefaultChatPermissions(chatId);

      await telegram.restrictChatMember(chatId, userId, {
        permissions,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "unknown error";

      console.error(
        `[Captcha] Failed to restore permissions for ${userId} in ${chatId}: ${errorMessage}`,
      );
    }

    await cleanupChallenge(challenge);

    return challenge;
  };

  const failChallenge = async (
    chatId: number,
    userId: number,
    deleteMessage = true,
  ): Promise<CaptchaChallenge | null> =>
    expireChallenge(chatId, userId, deleteMessage);

  const discardChallenge = async (
    chatId: number,
    userId: number,
    deleteMessage = true,
  ): Promise<CaptchaChallenge | null> => {
    const challenge = await getCaptchaChallenge(db, chatId, userId);

    if (!challenge) {
      clearExpiration(chatId, userId);

      return null;
    }

    await cleanupChallenge(challenge, deleteMessage);

    return challenge;
  };

  return {
    completeChallenge,
    discardChallenge,
    failChallenge,
    loadChallenges,
    startChallenge,
  };
};
