import { GroupChatType } from "../enums/group-chat-type";

export const isGroup = (chatType: string): boolean => {
  return (
    chatType === GroupChatType.GROUP || chatType === GroupChatType.SUPERGROUP
  );
};
