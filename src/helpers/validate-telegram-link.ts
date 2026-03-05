export const validateTelegramLink = async (url: string): Promise<boolean> => {
  const regex = /^https:\/\/t\.me\/(?:c\/\d+\/\d+|[a-zA-Z0-9_]+\/\d+)$/;

  if (!regex.test(url)) {
    return false;
  }

  if (url.includes("/c/")) {
    return true;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return false;
    }

    const html = await response.text();

    return (
      html.includes("tgme_page_post") || html.includes("tgme_widget_message")
    );
  } catch {
    return false;
  }
};
