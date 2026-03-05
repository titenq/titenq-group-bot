export interface DashboardStats {
  totalGroups: number;
  activeGroups: number;
  openVoteCases: number;
  pendingAdminCases: number;
  resolvedCases: number;
  totalVotes: number;
  totalFaqs: number;
  groups: DashboardGroupRow[];
}

export interface DashboardGroupRow {
  chatId: number;
  title: string | null;
  language: string;
  isActive: boolean;
  openCases: number;
  totalFaqs: number;
  addedAt: string;
}
