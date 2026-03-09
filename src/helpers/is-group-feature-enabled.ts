import { isGroupFeatureEnabled as isGroupFeatureEnabledByChat } from "../db";
import { GroupFeature } from "../enums/group-feature";
import { BotContext } from "../interfaces/bot-context";

export const isGroupFeatureEnabled = async (
  ctx: BotContext,
  featureKey: GroupFeature,
): Promise<boolean> => {
  if (!ctx.chat || ctx.chat.type === "private") {
    return true;
  }

  return isGroupFeatureEnabledByChat(ctx.db, ctx.chat.id, featureKey);
};
