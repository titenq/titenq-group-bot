import { TFunction } from "i18next";
import { Context } from "telegraf";

import { MediaSendFn, SnapshotMediaHandlerMap, VoteCase } from "./bot";
import { CaptchaService } from "./captcha-service";
import { BotDb } from "../db";
import { TempChatService } from "../services/temp-chat.service";

export interface BotContext extends Context {
  db: BotDb;
  voteCases: Map<string, VoteCase>;
  mediaSenders: SnapshotMediaHandlerMap<MediaSendFn>;
  maxAlertText: number;
  banKeyword: string;
  requiredVotes: number;
  languageCache: Map<number, string>;
  t: TFunction;
  captchaService: CaptchaService;
  tempChatService: TempChatService;
}
