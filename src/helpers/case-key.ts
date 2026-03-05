export const caseKey = (chatId: number, targetMessageId: number): string => {
  return `${chatId}:${targetMessageId}`;
};
