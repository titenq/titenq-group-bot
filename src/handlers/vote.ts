import { Composer } from "telegraf";
import { callbackQuery, message } from "telegraf/filters";

import {
  addGlobalBan,
  addVote,
  getUserTrustWeight,
  upsertVoteCase,
  updateVoteCaseStatus,
} from "../db";
import { Action, GroupFeature, SnapshotType, VoteCaseStatus } from "../enums";
import {
  caseKey,
  getMessageSnapshot,
  isAdmin,
  isGroupFeatureEnabled,
  isGroup,
  safeDelete,
  upsertVoteStatusMessage,
} from "../helpers";
import { BotContext, TargetUser, VoteCase } from "../interfaces";
import { adminDecisionMarkup } from "../markups/admin-decision";

export const voteHandlers = new Composer<BotContext>();

const ADMIN_TEST_BAN_KEYWORD = "testban";

const getVoteTotal = (voteCase: VoteCase): number => {
  return voteCase.voters.size + voteCase.extraAdminVotes;
};

const ensureVoteCase = async (
  ctx: BotContext,
  chatId: number,
  chatTitle: string | undefined,
  targetMessageId: number,
  targetUser: TargetUser,
  snapshot: ReturnType<typeof getMessageSnapshot>,
): Promise<VoteCase> => {
  const key = caseKey(chatId, targetMessageId);
  const existingCase = ctx.voteCases.get(key);

  if (existingCase) {
    return existingCase;
  }

  const createdCase: VoteCase = {
    chatId,
    targetMessageId,
    targetUser,
    snapshotMessageType: snapshot.type,
    snapshotMessagePreview: snapshot.preview,
    snapshotMessageContent: snapshot.content,
    snapshotMediaFileId: snapshot.mediaFileId,
    voters: new Set<number>(),
    extraAdminVotes: 0,
    status: VoteCaseStatus.VOTING,
    voteCommandMessageIds: new Set<number>(),
    botMessageIds: new Set<number>(),
    statusMsgId: undefined,
  };

  ctx.voteCases.set(key, createdCase);

  await upsertVoteCase(
    ctx.db,
    chatId,
    chatTitle,
    targetMessageId,
    targetUser.id,
    targetUser.firstName,
    targetUser.username,
    snapshot.type,
    snapshot.preview,
    snapshot.content,
    snapshot.mediaFileId,
  );

  return createdCase;
};

const finalizeVoteCase = async (
  ctx: BotContext,
  voteCase: VoteCase,
  votes: number,
): Promise<void> => {
  const chatId = voteCase.chatId;
  const targetMessageId = voteCase.targetMessageId;

  voteCase.status = VoteCaseStatus.PENDING_ADMIN;

  await updateVoteCaseStatus(
    ctx.db,
    chatId,
    targetMessageId,
    VoteCaseStatus.PENDING_ADMIN,
  );

  await safeDelete(ctx.telegram, chatId, targetMessageId);

  try {
    await ctx.telegram.restrictChatMember(chatId, voteCase.targetUser.id, {
      permissions: {
        can_send_messages: false,
      },
    });
  } catch (error) {
    console.error(
      `Failed to mute target user ${voteCase.targetUser.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  if (voteCase.statusMsgId) {
    await safeDelete(ctx.telegram, chatId, voteCase.statusMsgId);

    voteCase.botMessageIds.delete(voteCase.statusMsgId);
    voteCase.statusMsgId = undefined;
  }

  const admins = await ctx.telegram.getChatAdministrators(chatId);

  const adminMentions = admins
    .filter((admin) => admin.user.username)
    .map((admin) => `@${admin.user.username}`)
    .join(" ");

  const adminNotice = adminMentions
    ? ctx.t("admin.notice_mentions", { mentions: adminMentions })
    : ctx.t("admin.notice_generic");

  const suspectUsername = voteCase.targetUser.username
    ? `@${voteCase.targetUser.username}`
    : ctx.t("admin.suspect_no_username");

  const adminDecisionReply = await ctx.reply(
    ctx.t("vote.admin_decision", {
      firstName: voteCase.targetUser.firstName,
      username: suspectUsername,
      userId: voteCase.targetUser.id,
      votes,
      requiredVotes: ctx.requiredVotes,
      adminNotice,
    }),
    adminDecisionMarkup(ctx.t, chatId, targetMessageId, voteCase.targetUser.id),
  );

  voteCase.botMessageIds.add(adminDecisionReply.message_id);
};

const registerVote = async (
  ctx: BotContext,
  voteCase: VoteCase,
  voterId: number,
  voteWeight: number,
): Promise<"registered" | "duplicate" | "closed"> => {
  if (voteCase.status !== VoteCaseStatus.VOTING) {
    return "closed";
  }

  if (voteCase.voters.has(voterId)) {
    return "duplicate";
  }

  const inserted = await addVote(
    ctx.db,
    voteCase.chatId,
    voteCase.targetMessageId,
    voterId,
  );

  if (!inserted) {
    voteCase.voters.add(voterId);

    return "duplicate";
  }

  voteCase.voters.add(voterId);

  if (voteWeight > 1) {
    voteCase.extraAdminVotes += voteWeight - 1;
  }

  const votes = getVoteTotal(voteCase);

  await upsertVoteStatusMessage(
    ctx.telegram,
    ctx.db,
    ctx.t,
    voteCase,
    voteCase.targetMessageId,
    votes,
    ctx.banKeyword,
    ctx.requiredVotes,
  );

  if (votes < ctx.requiredVotes) {
    return "registered";
  }

  await finalizeVoteCase(ctx, voteCase, votes);

  return "registered";
};

voteHandlers.on(message(SnapshotType.TEXT), async (ctx) => {
  const incomingMessage = ctx.message;

  if (!incomingMessage || !(SnapshotType.TEXT in incomingMessage)) {
    return;
  }

  if (!ctx.chat || !isGroup(ctx.chat.type)) {
    return;
  }

  const rawText = incomingMessage.text.trim();
  const [commandToken, ...reasonParts] = rawText.split(/\s+/);
  const normalizedCommand = (commandToken ?? "").toLowerCase();
  const normalizedBanKeyword = ctx.banKeyword.toLowerCase();
  const isAdminTestBanCommand = normalizedCommand === ADMIN_TEST_BAN_KEYWORD;
  const isBanCommand = normalizedCommand === normalizedBanKeyword;

  if (!isBanCommand && !isAdminTestBanCommand) {
    return;
  }

  if (!(await isGroupFeatureEnabled(ctx, GroupFeature.MODERATION))) {
    return;
  }

  const reasonText = reasonParts.join(" ").trim();
  const reason = reasonText ? reasonText.slice(0, 120) : null;
  const reply = incomingMessage.reply_to_message;

  if (!reply || !("from" in reply) || !reply.from) {
    await ctx.reply(
      ctx.t("vote.use_ban_reply", { banKeyword: ctx.banKeyword }),
    );

    return;
  }

  const targetUser: TargetUser = {
    id: reply.from.id,
    firstName: reply.from.first_name,
    username: reply.from.username ?? undefined,
  };

  const snapshot = getMessageSnapshot(ctx.t, reply);
  const chatId = ctx.chat.id;
  const targetMessageId = reply.message_id;
  const voterId = incomingMessage.from.id;
  const voterMember = await ctx.telegram.getChatMember(chatId, voterId);
  const isAdminUser = isAdmin(voterMember);
  const shouldApplyAdminTestVotes = isAdminUser && isAdminTestBanCommand;

  if (isAdminUser && !shouldApplyAdminTestVotes) {
    try {
      await ctx.telegram.banChatMember(chatId, targetUser.id);
    } catch (error) {
      console.error(
        `Failed to ban user ${targetUser.id} by admin: ${error instanceof Error ? error.message : "Unknown error"}`,
      );

      await ctx.reply(ctx.t("admin.ban_failed"));

      return;
    }

    try {
      await addGlobalBan(ctx.db, {
        user_id: targetUser.id,
        username: targetUser.username || null,
        group_id: chatId,
        group_name: "title" in ctx.chat ? ctx.chat.title : "Unknown",
        message_text: snapshot.content || snapshot.preview || null,
        reason,
        admin_id: voterId,
      });
    } catch (error) {
      console.error(
        `[Vote] Failed to persist global ban: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }

    await ctx.reply(
      ctx.t("admin.user_banned_by_admin", {
        firstName: targetUser.firstName,
        reason: reason || ctx.t("admin.no_reason_provided"),
      }),
    );

    await safeDelete(ctx.telegram, chatId, incomingMessage.message_id);
    await safeDelete(ctx.telegram, chatId, targetMessageId);

    return;
  }

  const current = await ensureVoteCase(
    ctx,
    chatId,
    "title" in ctx.chat ? ctx.chat.title : undefined,
    targetMessageId,
    targetUser,
    snapshot,
  );

  if (current.status !== VoteCaseStatus.VOTING) {
    await safeDelete(ctx.telegram, chatId, incomingMessage.message_id);

    return;
  }

  current.voteCommandMessageIds.add(incomingMessage.message_id);

  await safeDelete(ctx.telegram, chatId, incomingMessage.message_id);

  const weight = shouldApplyAdminTestVotes
    ? 1
    : await getUserTrustWeight(ctx.db, chatId, voterId);

  await registerVote(ctx, current, voterId, weight);
});

voteHandlers.on(callbackQuery("data"), async (ctx, next) => {
  const callbackData = ctx.callbackQuery.data;

  if (!callbackData) {
    return next();
  }

  const [action, rawChatId, rawTargetMessageId] = callbackData.split("|");

  if (action !== Action.VOTE_CAST || !rawChatId || !rawTargetMessageId) {
    return next();
  }

  const chatId = Number(rawChatId);
  const targetMessageId = Number(rawTargetMessageId);
  const voteCase = ctx.voteCases.get(caseKey(chatId, targetMessageId));

  if (!voteCase || voteCase.status !== VoteCaseStatus.VOTING) {
    await ctx.answerCbQuery(ctx.t("vote.closed"), {
      show_alert: true,
    });

    return;
  }

  const voterId = ctx.from.id;

  if (voteCase.voters.has(voterId)) {
    await ctx.answerCbQuery(ctx.t("vote.already_voted"), {
      show_alert: true,
    });

    return;
  }

  const weight = await getUserTrustWeight(ctx.db, chatId, voterId);
  const result = await registerVote(ctx, voteCase, voterId, weight);

  if (result === "duplicate") {
    await ctx.answerCbQuery(ctx.t("vote.already_voted"), {
      show_alert: true,
    });

    return;
  }

  if (result === "closed") {
    await ctx.answerCbQuery(ctx.t("vote.closed"), {
      show_alert: true,
    });

    return;
  }

  await ctx.answerCbQuery(ctx.t("vote.registered"));
});
