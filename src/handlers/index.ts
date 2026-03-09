import { Composer } from "telegraf";

import { adminHandlers } from "./admin";
import { commandHandlers } from "./commands";
import { dashboardHandlers } from "./dashboard";
import { faqHandlers } from "./faq";
import { gistHandlers } from "./gist";
import { groupEventHandlers } from "./group-events";
import { BotContext } from "../interfaces/bot-context";
import { mediaHandlers } from "./media";
import { tempChatHandlers } from "./temp-chat";
import { trustHandlers } from "./trust";
import { globalBanActions } from "./global-ban-actions";
import { voteHandlers } from "./vote";

export const rootHandler = new Composer<BotContext>();

rootHandler.use(commandHandlers);
rootHandler.use(dashboardHandlers);
rootHandler.use(gistHandlers);
rootHandler.use(mediaHandlers);
rootHandler.use(faqHandlers);
rootHandler.use(tempChatHandlers);
rootHandler.use(trustHandlers);
rootHandler.use(groupEventHandlers);
rootHandler.use(voteHandlers);
rootHandler.use(globalBanActions);
rootHandler.use(adminHandlers);
