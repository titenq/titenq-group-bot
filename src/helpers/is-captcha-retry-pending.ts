import { CaptchaChallenge } from "../interfaces";

export const isCaptchaRetryPending = (challenge: CaptchaChallenge): boolean => {
  if (challenge.selectedSequenceKeys.length === 0) {
    return false;
  }

  return challenge.selectedSequenceKeys.some(
    (itemKey, index) => challenge.targetSequenceKeys[index] !== itemKey,
  );
};
