import { TFunction } from "i18next";

import { CAPTCHA_MAX_ATTEMPTS, CAPTCHA_TIMEOUT_MS } from "../config/constants";
import { CaptchaChallenge } from "../interfaces";

const isRetryPending = (challenge: CaptchaChallenge): boolean =>
  challenge.selectedSequenceKeys.length ===
    challenge.targetSequenceKeys.length &&
  challenge.selectedSequenceKeys.some(
    (itemKey, index) => challenge.targetSequenceKeys[index] !== itemKey,
  );

export const buildCaptchaChallengeText = (
  t: TFunction,
  challenge: CaptchaChallenge,
): string => {
  const sequenceLabels = challenge.targetSequenceKeys.map((itemKey) =>
    t(`captcha.items.${itemKey}`).toUpperCase(),
  );

  const secondsRemaining = Math.max(
    1,
    Math.ceil((challenge.expiresAt - Date.now()) / 1000),
  );
  
  const retryPending = isRetryPending(challenge);

  return [
    `🧩 <b>${t("captcha.title")}</b>`,
    "",
    t("captcha.instructions"),
    "",
    `<b>${sequenceLabels.join(", ")}</b>`,
    "",
    t("captcha.meta", {
      attempts: CAPTCHA_MAX_ATTEMPTS,
      seconds: Math.min(secondsRemaining, CAPTCHA_TIMEOUT_MS / 1000),
    }),
    !challenge.isTestMode ? t("captcha.locked_notice") : undefined,
    ...(retryPending
      ? [
          "",
          `<b>${t("captcha.wrong_sequence_text")}</b>`,
          `<b>${t("captcha.retry_pending_text", {
            current: challenge.attempts + 1,
            total: CAPTCHA_MAX_ATTEMPTS,
          })}</b>`,
        ]
      : []),
  ]
    .filter((line) => line !== undefined)
    .join("\n");
};
