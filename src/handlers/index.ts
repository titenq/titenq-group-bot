import { Composer } from "telegraf";

import { adminHandlers } from "./admin";
import { captchaHandlers } from "./captcha";
import { commandHandlers } from "./commands";
import { dashboardHandlers } from "./dashboard";
import { faqHandlers } from "./faq";
import { gistHandlers } from "./gist";
import { globalBanActions } from "./global-ban-actions";
import { groupEventHandlers } from "./group-events";
import { BotContext } from "../interfaces";
import { mediaHandlers } from "./media";
import { rulesHandlers } from "./rules";
import { tempChatHandlers } from "./temp-chat";
import { trustHandlers } from "./trust";
import { voteHandlers } from "./vote";
import { welcomeHandlers } from "./welcome";

export const rootHandler = new Composer<BotContext>();

rootHandler.use(commandHandlers);
rootHandler.use(captchaHandlers);
rootHandler.use(dashboardHandlers);
rootHandler.use(gistHandlers);
rootHandler.use(mediaHandlers);
rootHandler.use(rulesHandlers);
rootHandler.use(faqHandlers);
rootHandler.use(tempChatHandlers);
rootHandler.use(trustHandlers);
rootHandler.use(welcomeHandlers);
rootHandler.use(groupEventHandlers);
rootHandler.use(voteHandlers);
rootHandler.use(globalBanActions);
rootHandler.use(adminHandlers);
