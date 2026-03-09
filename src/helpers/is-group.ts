import { GroupChatType } from "../enums";

export const isGroup = (chatType: string): boolean => {
  return (
    chatType === GroupChatType.GROUP || chatType === GroupChatType.SUPERGROUP
  );
};
