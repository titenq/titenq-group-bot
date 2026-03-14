import { Composer } from "telegraf";
import { message } from "telegraf/filters";

import {
  addGlobalBan,
  addVote,
  getUserTrustWeight,
  upsertVoteCase,
  updateVoteCaseStatus,
} from "../db";
import { GroupFeature, SnapshotType, VoteCaseStatus } from "../enums";
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

voteHandlers.on(message(SnapshotType.TEXT), async (ctx) => {
  const incomingMessage = ctx.message;

  if (!incomingMessage || !(SnapshotType.TEXT in incomingMessage)) {
    return;
  }

  if (!isGroup(ctx.chat.type)) {
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
  const key = caseKey(chatId, targetMessageId);
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

  let current = ctx.voteCases.get(key);

  if (!current) {
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
    current = createdCase;

    await upsertVoteCase(
      ctx.db,
      chatId,
      "title" in ctx.chat ? ctx.chat.title : undefined,
      targetMessageId,
      targetUser.id,
      targetUser.firstName,
      targetUser.username,
      snapshot.type,
      snapshot.preview,
      snapshot.content,
      snapshot.mediaFileId,
    );
  }

  if (current.status !== VoteCaseStatus.VOTING) {
    await safeDelete(ctx.telegram, chatId, incomingMessage.message_id);

    return;
  }

  current.voteCommandMessageIds.add(incomingMessage.message_id);

  await safeDelete(ctx.telegram, chatId, incomingMessage.message_id);

  if (!current.voters.has(voterId)) {
    const weight = await getUserTrustWeight(ctx.db, chatId, voterId);
    const extraVotesFromWeight = weight > 1 ? weight - 1 : 0;
    const extraVotesFromAdminTestBan = shouldApplyAdminTestVotes
      ? ctx.requiredVotes - 1
      : 0;

    if (extraVotesFromWeight > 0 || extraVotesFromAdminTestBan > 0) {
      current.extraAdminVotes +=
        extraVotesFromWeight + extraVotesFromAdminTestBan;
    }

    current.voters.add(voterId);
  } else {
    const previousSize = current.voters.size;

    current.voters.add(voterId);

    const isNewVote = current.voters.size > previousSize;
    let countedAsAdminOverride = false;

    if (isNewVote) {
      await addVote(ctx.db, chatId, targetMessageId, voterId);
    } else {
      const voterMember = await ctx.telegram.getChatMember(chatId, voterId);
      const voterIsAdmin = isAdmin(voterMember);

      if (voterIsAdmin) {
        current.extraAdminVotes += 1;
        countedAsAdminOverride = true;
      }

      if (countedAsAdminOverride) {
        const votes = current.voters.size + current.extraAdminVotes;

        await upsertVoteStatusMessage(
          ctx.telegram,
          ctx.db,
          ctx.t,
          current,
          targetMessageId,
          votes,
          ctx.banKeyword,
          ctx.requiredVotes,
        );

        if (votes < ctx.requiredVotes) {
          return;
        }
      } else {
        return;
      }
    }
  }

  const votes = current.voters.size + current.extraAdminVotes;

  await upsertVoteStatusMessage(
    ctx.telegram,
    ctx.db,
    ctx.t,
    current,
    targetMessageId,
    votes,
    ctx.banKeyword,
    ctx.requiredVotes,
  );

  if (votes < ctx.requiredVotes) {
    return;
  }

  current.status = VoteCaseStatus.PENDING_ADMIN;

  await updateVoteCaseStatus(
    ctx.db,
    chatId,
    targetMessageId,
    VoteCaseStatus.PENDING_ADMIN,
  );

  await safeDelete(ctx.telegram, chatId, targetMessageId);

  try {
    await ctx.telegram.restrictChatMember(chatId, current.targetUser.id, {
      permissions: {
        can_send_messages: false,
      },
    });
  } catch (error) {
    console.error(
      `Failed to mute target user ${current.targetUser.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  if (current.statusMsgId) {
    await safeDelete(ctx.telegram, chatId, current.statusMsgId);

    current.botMessageIds.delete(current.statusMsgId);
    current.statusMsgId = undefined;
  }

  const admins = await ctx.telegram.getChatAdministrators(chatId);

  const adminMentions = admins
    .filter((admin) => admin.user.username)
    .map((admin) => `@${admin.user.username}`)
    .join(" ");

  const adminNotice = adminMentions
    ? ctx.t("admin.notice_mentions", { mentions: adminMentions })
    : ctx.t("admin.notice_generic");

  const suspectUsername = current.targetUser.username
    ? `@${current.targetUser.username}`
    : ctx.t("admin.suspect_no_username");

  const adminDecisionReply = await ctx.reply(
    ctx.t("vote.admin_decision", {
      firstName: current.targetUser.firstName,
      username: suspectUsername,
      userId: current.targetUser.id,
      votes,
      requiredVotes: ctx.requiredVotes,
      adminNotice,
    }),
    adminDecisionMarkup(ctx.t, chatId, targetMessageId, current.targetUser.id),
  );

  current.botMessageIds.add(adminDecisionReply.message_id);
});
