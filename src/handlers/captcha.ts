import { Composer } from "telegraf";
import { message } from "telegraf/filters";

import { CAPTCHA_MAX_ATTEMPTS } from "../config/constants";
import {
  getGroupWelcomeMessage,
  getCaptchaChallenge,
  updateCaptchaChallengeProgress,
  upsertCaptchaChallenge,
} from "../db";
import { GroupFeature, Language } from "../enums";
import {
  buildCaptchaChallengeText,
  buildWelcomeMessage,
  createCaptchaChallenge,
  isAdmin,
  isGroupFeatureEnabled,
  safeDelete,
  scheduleMessageCleanup,
} from "../helpers";
import { BotContext } from "../interfaces";
import { captchaChallengeMarkup } from "../markups/captcha-challenge";

export const captchaHandlers = new Composer<BotContext>();

const isRetryPending = (
  selectedSequenceKeys: string[],
  targetSequenceKeys: string[],
): boolean =>
  selectedSequenceKeys.length === targetSequenceKeys.length &&
  selectedSequenceKeys.some(
    (itemKey, index) => targetSequenceKeys[index] !== itemKey,
  );

captchaHandlers.command("captcha", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private" || !ctx.message) {
    return;
  }

  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);

  if (!isAdmin(actor)) {
    return;
  }

  await safeDelete(ctx.telegram, ctx.chat.id, ctx.message.message_id);

  const languageCode = ctx.languageCache.get(ctx.chat.id) ?? Language.PT;

  await ctx.captchaService.startChallenge({
    chatId: ctx.chat.id,
    isTestMode: true,
    languageCode,
    userId: ctx.from.id,
  });
});

captchaHandlers.on(message("new_chat_members"), async (ctx, next) => {
  if (ctx.chat.type === "private") {
    return next();
  }

  if (!(await isGroupFeatureEnabled(ctx, GroupFeature.CAPTCHA))) {
    return next();
  }

  const languageCode = ctx.languageCache.get(ctx.chat.id) ?? Language.PT;
  const actor = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
  const isActorAdmin = isAdmin(actor);

  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot && !isActorAdmin) {
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, member.id);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "unknown error";

        console.error(
          `[Captcha] Failed to remove bot ${member.id} from chat ${ctx.chat.id}: ${errorMessage}`,
        );
      }
    }

    if (member.is_bot) {
      continue;
    }

    await ctx.captchaService.startChallenge({
      chatId: ctx.chat.id,
      languageCode,
      userId: member.id,
    });
  }

  return next();
});

captchaHandlers.action(/^captcha_select_(\d+)_([a-z_]+)$/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const targetUserId = Number(ctx.match[1]);
  const itemKey = ctx.match[2];

  if (ctx.from.id !== targetUserId) {
    await ctx.answerCbQuery(ctx.t("captcha.error_only_target_user"), {
      show_alert: true,
    });

    return;
  }

  const challenge = await getCaptchaChallenge(
    ctx.db,
    ctx.chat.id,
    targetUserId,
  );
  const callbackMessage = ctx.callbackQuery.message;

  if (!challenge && callbackMessage) {
    await safeDelete(ctx.telegram, ctx.chat.id, callbackMessage.message_id);
  }

  if (!challenge) {
    await ctx.answerCbQuery();

    return;
  }

  if (
    ctx.callbackQuery.message &&
    ctx.callbackQuery.message.message_id !== challenge.challengeMessageId
  ) {
    await safeDelete(
      ctx.telegram,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
    );
    await ctx.answerCbQuery();

    return;
  }

  if (!challenge.availableItemKeys.includes(itemKey)) {
    await ctx.answerCbQuery(ctx.t("captcha.error_not_found"), {
      show_alert: true,
    });

    return;
  }

  if (challenge.expiresAt <= Date.now()) {
    await ctx.captchaService.failChallenge(ctx.chat.id, targetUserId);
    await ctx.answerCbQuery(ctx.t("captcha.expired"), {
      show_alert: true,
    });

    return;
  }

  if (
    isRetryPending(challenge.selectedSequenceKeys, challenge.targetSequenceKeys)
  ) {
    await ctx.answerCbQuery();

    return;
  }

  if (challenge.selectedSequenceKeys.includes(itemKey)) {
    await ctx.answerCbQuery();

    return;
  }

  const nextSelectedSequenceKeys = [...challenge.selectedSequenceKeys, itemKey];

  const hasCompletedSequence =
    nextSelectedSequenceKeys.length === challenge.targetSequenceKeys.length;

  const isCorrectSequence = hasCompletedSequence
    ? nextSelectedSequenceKeys.every(
        (selectedItemKey, index) =>
          challenge.targetSequenceKeys[index] === selectedItemKey,
      )
    : false;

  if (!hasCompletedSequence) {
    const updatedChallenge = await updateCaptchaChallengeProgress(
      ctx.db,
      ctx.chat.id,
      targetUserId,
      nextSelectedSequenceKeys,
      challenge.attempts,
    );

    if (!updatedChallenge) {
      await ctx.answerCbQuery();

      return;
    }

    if (ctx.callbackQuery.message) {
      await ctx.editMessageText(
        buildCaptchaChallengeText(ctx.t, updatedChallenge),
        {
          parse_mode: "HTML",
          ...captchaChallengeMarkup(ctx.t, updatedChallenge),
        },
      );
    }

    await ctx.answerCbQuery();

    return;
  }

  if (isCorrectSequence) {
    const completedChallenge = await ctx.captchaService.completeChallenge(
      ctx.chat.id,
      targetUserId,
    );

    if (completedChallenge) {
      const welcomeMessageEnabled = await isGroupFeatureEnabled(
        ctx,
        GroupFeature.WELCOME,
      );

      if (welcomeMessageEnabled) {
        const welcomeMessage = await getGroupWelcomeMessage(
          ctx.db,
          ctx.chat.id,
        );

        if (welcomeMessage) {
          await ctx.reply(
            buildWelcomeMessage({
              groupTitle: "title" in ctx.chat ? ctx.chat.title : undefined,
              name: ctx.from.first_name,
              template: welcomeMessage.template,
              username: ctx.from.username,
            }),
            {
              parse_mode: "HTML",
            },
          );
        } else {
          await ctx.reply(
            ctx.t("captcha.welcome", {
              name: ctx.from.first_name,
            }),
            {
              parse_mode: "HTML",
            },
          );
        }
      } else {
        await ctx.reply(
          ctx.t("captcha.welcome", {
            name: ctx.from.first_name,
          }),
          {
            parse_mode: "HTML",
          },
        );
      }
    }

    await ctx.answerCbQuery(ctx.t("captcha.success"), {
      show_alert: false,
    });

    return;
  }

  const nextAttempts = challenge.attempts + 1;

  const clickedChallenge = {
    ...challenge,
    attempts: nextAttempts,
    selectedSequenceKeys: nextSelectedSequenceKeys,
  };

  const challengeMessage = ctx.callbackQuery.message;

  await upsertCaptchaChallenge(ctx.db, clickedChallenge);

  if (nextAttempts >= CAPTCHA_MAX_ATTEMPTS) {
    if (challenge.isTestMode && challengeMessage) {
      await ctx.editMessageText(ctx.t("captcha.admin_test_failed"), {
        parse_mode: "HTML",
      });

      await ctx.captchaService.discardChallenge(
        ctx.chat.id,
        targetUserId,
        false,
      );

      scheduleMessageCleanup({
        botMessageId: challenge.challengeMessageId,
        chatId: ctx.chat.id,
        telegram: ctx.telegram,
      });

      await ctx.answerCbQuery();

      return;
    }

    if (challengeMessage) {
      await ctx.editMessageText(
        buildCaptchaChallengeText(ctx.t, clickedChallenge),
        {
          parse_mode: "HTML",
          ...captchaChallengeMarkup(ctx.t, clickedChallenge),
        },
      );
    }

    await ctx.captchaService.failChallenge(ctx.chat.id, targetUserId, false);

    scheduleMessageCleanup({
      botMessageId: challenge.challengeMessageId,
      chatId: ctx.chat.id,
      telegram: ctx.telegram,
    });

    await ctx.answerCbQuery();

    return;
  }

  if (challengeMessage) {
    await ctx.editMessageText(
      buildCaptchaChallengeText(ctx.t, clickedChallenge),
      {
        parse_mode: "HTML",
        ...captchaChallengeMarkup(ctx.t, clickedChallenge),
      },
    );
  }

  await ctx.answerCbQuery(undefined);
});

captchaHandlers.action(/^captcha_retry_(\d+)$/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return;
  }

  const targetUserId = Number(ctx.match[1]);

  if (ctx.from.id !== targetUserId) {
    await ctx.answerCbQuery(ctx.t("captcha.error_only_target_user"), {
      show_alert: true,
    });

    return;
  }

  const challenge = await getCaptchaChallenge(
    ctx.db,
    ctx.chat.id,
    targetUserId,
  );

  const callbackMessage = ctx.callbackQuery.message;

  if (!challenge && callbackMessage) {
    await safeDelete(ctx.telegram, ctx.chat.id, callbackMessage.message_id);
  }

  if (!challenge) {
    await ctx.answerCbQuery();

    return;
  }

  if (
    callbackMessage &&
    callbackMessage.message_id !== challenge.challengeMessageId
  ) {
    await safeDelete(ctx.telegram, ctx.chat.id, callbackMessage.message_id);
    await ctx.answerCbQuery();

    return;
  }

  if (
    !isRetryPending(
      challenge.selectedSequenceKeys,
      challenge.targetSequenceKeys,
    )
  ) {
    await ctx.answerCbQuery();

    return;
  }

  const regeneratedChallenge = createCaptchaChallenge(
    ctx.chat.id,
    targetUserId,
  );

  const resetChallenge = {
    ...regeneratedChallenge,
    attempts: challenge.attempts,
    challengeMessageId: challenge.challengeMessageId,
    expiresAt: challenge.expiresAt,
    isTestMode: challenge.isTestMode,
  };

  await upsertCaptchaChallenge(ctx.db, resetChallenge);

  if (ctx.callbackQuery.message) {
    await ctx.editMessageText(
      buildCaptchaChallengeText(ctx.t, resetChallenge),
      {
        parse_mode: "HTML",
        ...captchaChallengeMarkup(ctx.t, resetChallenge),
      },
    );
  }

  await ctx.answerCbQuery();
});
