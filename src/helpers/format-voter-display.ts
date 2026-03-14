import { TFunction } from "i18next";
import { Telegram } from "telegraf";

export const formatVoterDisplay = async (
  t: TFunction,
  telegram: Telegram,
  chatId: number,
  voterId: number,
): Promise<string> => {
  try {
    const member = await telegram.getChatMember(chatId, voterId);

    if (member.user.username) {
      return `@${member.user.username}`;
    }

    return `${member.user.first_name} (${voterId})`;
  } catch {
    return t("admin.voter_id_fallback", { voterId });
  }
};
