import { Composer } from "telegraf";

import { BotContext } from "../interfaces";
import { adminHandlers } from "./admin";
import { captchaHandlers } from "./captcha";
import { commandHandlers } from "./commands";
import { dashboardHandlers } from "./dashboard";
import { faqHandlers } from "./faq";
import { gistHandlers } from "./gist";
import { groupEventHandlers } from "./group-events";
import { mediaHandlers } from "./media";
import { tempChatHandlers } from "./temp-chat";
import { globalBanActions } from "./global-ban-actions";
import { trustHandlers } from "./trust";
import { voteHandlers } from "./vote";

export const rootHandler = new Composer<BotContext>();

rootHandler.use(commandHandlers);
rootHandler.use(captchaHandlers);
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
