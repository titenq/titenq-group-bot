import { BotDb } from "./database";
import { DashboardStats } from "../interfaces";

export const getDashboardStats = async (db: BotDb): Promise<DashboardStats> => {
  const [totalGroups] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM groups",
  );

  const [activeGroups] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM groups WHERE is_active = 1",
  );

  const [openCases] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM vote_cases WHERE status = 'voting'",
  );

  const [pendingAdmin] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM vote_cases WHERE status = 'pending_admin'",
  );

  const [resolved] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM vote_cases WHERE status NOT IN ('voting', 'pending_admin')",
  );

  const [totalVotes] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM voters",
  );

  const [totalFaqs] = await db.all<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM group_faqs",
  );

  const groupRows = await db.all<
    {
      chat_id: number;
      title: string | null;
      language_code: string;
      is_active: number;
      open_cases: number;
      total_faqs: number;
      added_at: string;
    }[]
  >(
    `
      SELECT
        g.chat_id,
        g.title,
        g.language_code,
        g.is_active,
        g.added_at,
        COUNT(DISTINCT vc.target_message_id) as open_cases,
        COUNT(DISTINCT f.id) as total_faqs
      FROM groups g
      LEFT JOIN vote_cases vc
        ON vc.chat_id = g.chat_id
       AND vc.status IN ('voting', 'pending_admin')
      LEFT JOIN group_faqs f
        ON f.chat_id = g.chat_id
      GROUP BY g.chat_id
      ORDER BY g.added_at DESC
    `,
  );

  return {
    totalGroups: totalGroups.count,
    activeGroups: activeGroups.count,
    openVoteCases: openCases.count,
    pendingAdminCases: pendingAdmin.count,
    resolvedCases: resolved.count,
    totalVotes: totalVotes.count,
    totalFaqs: totalFaqs.count,
    groups: groupRows.map((row) => ({
      chatId: row.chat_id,
      title: row.title,
      language: row.language_code,
      isActive: row.is_active === 1,
      openCases: row.open_cases,
      totalFaqs: row.total_faqs,
      addedAt: row.added_at,
    })),
  };
};
