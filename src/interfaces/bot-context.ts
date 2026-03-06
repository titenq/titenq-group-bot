import { TFunction } from "i18next";
import { Context } from "telegraf";

import { MediaSendFn, SnapshotMediaHandlerMap, VoteCase } from "./bot";
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
  tempChatService: TempChatService;
}
