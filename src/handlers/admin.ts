import { Composer } from "telegraf";
import { callbackQuery } from "telegraf/filters";

import { updateVoteCaseStatus } from "../db";
import { Action } from "../enums/action";
import { VoteCaseStatus } from "../enums/vote-case-status";
import { caseKey } from "../helpers/case-key";
import { cleanupCaseMessages } from "../helpers/cleanup-case-messages";
import { formatVoterDisplay } from "../helpers/format-voter-display";
import { isAdmin } from "../helpers/is-admin";
import { isSnapshotMediaType } from "../helpers/is-snapshot-media-type";
import { safeDelete } from "../helpers/safe-delete";
import { sendSnapshotMedia } from "../helpers/send-snapshot-media";
import { truncateText } from "../helpers/truncate-text";
import { BotContext } from "../interfaces/bot-context";
import { previewDecisionMarkup } from "../markups/preview-decision";

export const adminHandlers = new Composer<BotContext>();

adminHandlers.on(callbackQuery("data"), async (ctx) => {
  const callback = ctx.callbackQuery;

  if (!callback.data) {
    return;
  }

  const [action, rawChatId, rawMessageId, rawArg] = callback.data.split("|");

  if (
    !action ||
    !rawChatId ||
    !rawMessageId ||
    !rawArg ||
    !Object.values(Action).includes(action as Action)
  ) {
    return;
  }

  const chatId = Number(rawChatId);
  const messageId = Number(rawMessageId);
  const actorId = callback.from.id;

  if (!chatId || !messageId) {
    await ctx.answerCbQuery(ctx.t("admin.error_chat_validation"));

    return;
  }

  const actor = await ctx.telegram.getChatMember(chatId, actorId);

  if (!isAdmin(actor)) {
    await ctx.answerCbQuery(ctx.t("admin.error_only_admins"), {
      show_alert: true,
    });

    return;
  }

  const actionArg = Number(rawArg);
  const voteCase = ctx.voteCases.get(caseKey(chatId, messageId));

  if (action === Action.PREVIEW_DELETE || action === Action.PREVIEW_KEEP) {
    if (Number.isNaN(actionArg) || actionArg <= 0) {
      await ctx.answerCbQuery(ctx.t("admin.error_preview_invalid"), {
        show_alert: true,
      });

      return;
    }

    if (action === Action.PREVIEW_DELETE) {
      await safeDelete(ctx.telegram, chatId, actionArg);
      await ctx.answerCbQuery(ctx.t("admin.preview_deleted"));
    } else {
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "unknown error";

        console.error(`Failed to remove view buttons: ${errorMessage}`);
      }

      await ctx.answerCbQuery(ctx.t("admin.preview_kept"));
    }

    if (voteCase) {
      voteCase.botMessageIds.delete(actionArg);
    }

    return;
  } else if (action === Action.ADMIN_IGNORE) {
    if (!voteCase) {
      await ctx.answerCbQuery(ctx.t("admin.error_case_not_found"), {
        show_alert: true,
      });

      return;
    }

    try {
      await ctx.telegram.restrictChatMember(chatId, voteCase.targetUser.id, {
        permissions: {
          can_send_messages: true,
          can_send_audios: true,
          can_send_documents: true,
          can_send_photos: true,
          can_send_videos: true,
          can_send_video_notes: true,
          can_send_voice_notes: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
        },
      });
    } catch (error) {
      console.error(
        `Failed to unmute user on IGNORE: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    await ctx.answerCbQuery(ctx.t("admin.report_ignored"));

    await updateVoteCaseStatus(
      ctx.db,
      chatId,
      messageId,
      VoteCaseStatus.IGNORED,
    );

    return;
  }

  if (action === Action.ADMIN_VIEW) {
    if (!voteCase) {
      await ctx.answerCbQuery(ctx.t("admin.error_case_not_found"), {
        show_alert: true,
      });

      return;
    }

    if (
      isSnapshotMediaType(voteCase.snapshotMessageType) &&
      voteCase.snapshotMediaFileId
    ) {
      const viewedBy = callback.from.username
        ? `@${callback.from.username}`
        : `${callback.from.first_name} (${callback.from.id})`;

      const previewMessageId = await sendSnapshotMedia(
        chatId,
        voteCase,
        ctx.t("admin.viewed_by", { viewedBy }),
        "",
        ctx.mediaSenders,
      );

      const previewKeyboard = previewDecisionMarkup(
        ctx.t,
        chatId,
        messageId,
        previewMessageId,
      );

      await ctx.telegram.editMessageReplyMarkup(
        chatId,
        previewMessageId,
        undefined,
        previewKeyboard.reply_markup,
      );

      voteCase.botMessageIds.add(previewMessageId);

      await ctx.answerCbQuery(ctx.t("admin.content_displayed"));

      return;
    }

    await ctx.answerCbQuery(
      truncateText(voteCase.snapshotMessagePreview, ctx.maxAlertText),
      {
        show_alert: true,
      },
    );

    return;
  }

  if (action === Action.ADMIN_VOTERS) {
    if (!voteCase) {
      await ctx.answerCbQuery(ctx.t("admin.error_case_not_found"), {
        show_alert: true,
      });

      return;
    }

    const voters = [...voteCase.voters];

    if (voters.length === 0) {
      await ctx.answerCbQuery(ctx.t("admin.error_no_votes_yet"), {
        show_alert: true,
      });

      return;
    }

    const voterNames = await Promise.all(
      voters.map((voterId) =>
        formatVoterDisplay(ctx.telegram, chatId, voterId),
      ),
    );

    const votersText = voterNames
      .map((name, i) => `${i + 1}. ${name}`)
      .join("\n");

    const extraVotesText =
      voteCase.extraAdminVotes > 0
        ? ctx.t("admin.voters_extra_admin", { count: voteCase.extraAdminVotes })
        : "";

    await ctx.answerCbQuery(
      truncateText(
        ctx.t("admin.voters_list_title", {
          count: voters.length,
          list: votersText,
        }) + extraVotesText,
        ctx.maxAlertText,
      ),
      {
        show_alert: true,
      },
    );

    return;
  }

  if (action === Action.ADMIN_RESTORE) {
    if (!voteCase) {
      await ctx.answerCbQuery(ctx.t("admin.error_case_not_found"), {
        show_alert: true,
      });

      return;
    }

    const restoredBy = callback.from.username
      ? `@${callback.from.username}`
      : `${callback.from.first_name} (${callback.from.id})`;

    const originalUsername = voteCase.targetUser.username
      ? `@${voteCase.targetUser.username}`
      : ctx.t("admin.suspect_no_username");

    if (
      isSnapshotMediaType(voteCase.snapshotMessageType) &&
      voteCase.snapshotMediaFileId
    ) {
      await sendSnapshotMedia(
        chatId,
        voteCase,
        ctx.t("admin.restored_by_title", { restoredBy }),
        "",
        ctx.mediaSenders,
      );
    } else if (voteCase.snapshotMessageContent) {
      await ctx.telegram.sendMessage(
        chatId,
        ctx.t("admin.restored_by_title", { restoredBy }) +
          "\n" +
          ctx.t("admin.restored_content_info", {
            firstName: voteCase.targetUser.firstName,
            originalUsername,
            content: voteCase.snapshotMessageContent,
          }),
      );
    } else {
      await ctx.answerCbQuery(ctx.t("admin.error_no_restorable_content"), {
        show_alert: true,
      });

      return;
    }

    await ctx.answerCbQuery(ctx.t("admin.message_restored"));

    try {
      await ctx.telegram.restrictChatMember(chatId, voteCase.targetUser.id, {
        permissions: {
          can_send_messages: true,
          can_send_audios: true,
          can_send_documents: true,
          can_send_photos: true,
          can_send_videos: true,
          can_send_video_notes: true,
          can_send_voice_notes: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
        },
      });
    } catch (error) {
      console.error(
        `Failed to unmute user on RESTORE: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    await updateVoteCaseStatus(
      ctx.db,
      chatId,
      messageId,
      VoteCaseStatus.RESTORED,
    );

    voteCase.status = VoteCaseStatus.RESTORED;

    const callbackMessageId =
      ctx.callbackQuery.message && "message_id" in ctx.callbackQuery.message
        ? ctx.callbackQuery.message.message_id
        : undefined;

    await cleanupCaseMessages(
      ctx.telegram,
      voteCase,
      callbackMessageId ? [callbackMessageId] : [],
    );

    ctx.voteCases.delete(caseKey(chatId, messageId));

    return;
  }

  const targetUserId = actionArg;
  const decisionText =
    action === Action.ADMIN_BAN
      ? ctx.t("admin.word_banned")
      : ctx.t("admin.word_ignored");

  if (action === Action.ADMIN_BAN) {
    try {
      await ctx.telegram.banChatMember(chatId, targetUserId);
    } catch (error) {
      if (error instanceof Error) {
        await ctx.answerCbQuery(
          ctx.t("admin.error_ban_failed", { message: error.message }),
          {
            show_alert: true,
          },
        );

        return;
      }

      await ctx.answerCbQuery(ctx.t("admin.error_ban_failed_permissions"), {
        show_alert: true,
      });

      return;
    }
  }

  await updateVoteCaseStatus(
    ctx.db,
    chatId,
    messageId,
    action === Action.ADMIN_BAN
      ? VoteCaseStatus.BANNED
      : VoteCaseStatus.IGNORED,
  );

  await ctx.answerCbQuery(
    ctx.t("admin.case_decided", { decision: decisionText }),
  );

  if (voteCase) {
    voteCase.status =
      action === Action.ADMIN_BAN
        ? VoteCaseStatus.BANNED
        : VoteCaseStatus.IGNORED;

    const callbackMessageId =
      ctx.callbackQuery.message && "message_id" in ctx.callbackQuery.message
        ? ctx.callbackQuery.message.message_id
        : undefined;

    await cleanupCaseMessages(
      ctx.telegram,
      voteCase,
      callbackMessageId ? [callbackMessageId] : [],
    );

    ctx.voteCases.delete(caseKey(chatId, messageId));
  }
});
