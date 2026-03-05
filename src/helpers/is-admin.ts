import { ChatMember } from "telegraf/types";

import { AdminMemberStatus } from "../enums/admin-member-status";

export const isAdmin = (member: ChatMember): boolean => {
  return (
    member.status === AdminMemberStatus.ADMINISTRATOR ||
    member.status === AdminMemberStatus.CREATOR
  );
};
