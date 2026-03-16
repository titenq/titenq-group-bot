import { CaptchaChallenge, StartCaptchaChallengeParams } from "./captcha";

export interface CaptchaService {
  completeChallenge: (
    chatId: number,
    userId: number,
  ) => Promise<CaptchaChallenge | null>;
  discardChallenge: (
    chatId: number,
    userId: number,
    deleteMessage?: boolean,
  ) => Promise<CaptchaChallenge | null>;
  failChallenge: (
    chatId: number,
    userId: number,
    deleteMessage?: boolean,
  ) => Promise<CaptchaChallenge | null>;
  loadChallenges: (challenges: CaptchaChallenge[]) => void;
  startChallenge: (
    params: StartCaptchaChallengeParams,
  ) => Promise<CaptchaChallenge | null>;
}
