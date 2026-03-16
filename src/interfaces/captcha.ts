export interface CaptchaItem {
  key: string;
  emoji: string;
}

export interface CaptchaChallenge {
  chatId: number;
  userId: number;
  challengeMessageId: number;
  availableItemKeys: string[];
  isTestMode: boolean;
  targetSequenceKeys: string[];
  selectedSequenceKeys: string[];
  attempts: number;
  expiresAt: number;
}

export interface StartCaptchaChallengeParams {
  chatId: number;
  isTestMode?: boolean;
  languageCode: string;
  userId: number;
}
