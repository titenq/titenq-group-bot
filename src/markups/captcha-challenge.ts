import { TFunction } from "i18next";
import { InlineKeyboardMarkup } from "telegraf/types";

import { CAPTCHA_ITEMS_BY_KEY } from "../config/constants";
import { CaptchaChallenge } from "../interfaces";

const STEP_MARKERS = ["1️⃣", "2️⃣", "3️⃣"];

const isRetryPending = (challenge: CaptchaChallenge): boolean =>
  challenge.selectedSequenceKeys.length ===
    challenge.targetSequenceKeys.length &&
  challenge.selectedSequenceKeys.some(
    (itemKey, index) => challenge.targetSequenceKeys[index] !== itemKey,
  );

export const captchaChallengeMarkup = (
  t: TFunction,
  challenge: CaptchaChallenge,
): {
  reply_markup: InlineKeyboardMarkup;
} => {
  const inlineKeyboard = challenge.availableItemKeys.reduce<
    InlineKeyboardMarkup["inline_keyboard"]
  >((rows, itemKey, index) => {
    const item = CAPTCHA_ITEMS_BY_KEY.get(itemKey);
    const selectedIndex = challenge.selectedSequenceKeys.indexOf(itemKey);
    
    const marker =
      selectedIndex >= 0 ? `${STEP_MARKERS[selectedIndex] ?? ""} ` : "";

    const button = {
      text: `${marker}${item?.emoji ?? itemKey}`,
      callback_data: `captcha_select_${challenge.userId}_${itemKey}`,
    };

    if (index % 3 === 0) {
      rows.push([button]);
    } else {
      rows[rows.length - 1].push(button);
    }

    return rows;
  }, []);

  if (isRetryPending(challenge)) {
    inlineKeyboard.push([
      {
        text: t("captcha.retry_button", {
          current: challenge.attempts + 1,
          total: 3,
        }),
        callback_data: `captcha_retry_${challenge.userId}`,
      },
    ]);
  }

  return {
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  };
};
