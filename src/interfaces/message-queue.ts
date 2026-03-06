export interface MessageQueueService {
  addJob: (job: {
    roomId: string;
    sourceChatId: number;
    messageId: number;
    targetChatIds: number[];
    authorName: string;
  }) => void;
}
