export const Action = {
  ADMIN_BAN: "admin_ban",
  ADMIN_IGNORE: "admin_ignore",
  ADMIN_VIEW: "admin_view",
  ADMIN_VOTERS: "admin_voters",
  ADMIN_RESTORE: "admin_restore",
  PREVIEW_DELETE: "preview_delete",
  PREVIEW_KEEP: "preview_keep",
  VIEW_BAN_REASONS: "view_ban_reasons",
  BAN_USER: "ban_user",
  IGNORE_BAN_ALERT: "ignore_ban_alert",
} as const;

export type Action = (typeof Action)[keyof typeof Action];
