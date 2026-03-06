export interface QueueJob {
  roomId: string;
  sourceChatId: number;
  messageId: number;
  targetChatIds: number[];
  authorName: string;
}
