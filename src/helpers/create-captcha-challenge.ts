import {
  CAPTCHA_GRID_SIZE,
  CAPTCHA_ITEMS,
  CAPTCHA_SEQUENCE_LENGTH,
  CAPTCHA_TIMEOUT_MS,
} from "../config/constants";
import { CaptchaChallenge } from "../interfaces";

const shuffle = <T>(items: T[]): T[] => {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = nextItems[index];

    nextItems[index] = nextItems[randomIndex];
    nextItems[randomIndex] = current;
  }

  return nextItems;
};

export const createCaptchaChallenge = (
  chatId: number,
  userId: number,
  isTestMode = false,
): CaptchaChallenge => {
  const shuffledItems = shuffle([...CAPTCHA_ITEMS]);
  const availableItems = shuffledItems.slice(0, CAPTCHA_GRID_SIZE);
  
  const targetSequence = shuffle([...availableItems]).slice(
    0,
    CAPTCHA_SEQUENCE_LENGTH,
  );

  return {
    chatId,
    userId,
    challengeMessageId: 0,
    availableItemKeys: availableItems.map((item) => item.key),
    isTestMode,
    targetSequenceKeys: targetSequence.map((item) => item.key),
    selectedSequenceKeys: [],
    attempts: 0,
    expiresAt: Date.now() + CAPTCHA_TIMEOUT_MS,
  };
};
