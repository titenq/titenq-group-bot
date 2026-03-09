import { ChatMember } from "telegraf/types";

import { AdminMemberStatus } from "../enums";

export const isAdmin = (member: ChatMember): boolean => {
  return (
    member.status === AdminMemberStatus.ADMINISTRATOR ||
    member.status === AdminMemberStatus.CREATOR
  );
};
