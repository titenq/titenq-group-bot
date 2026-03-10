import { BuildWelcomeMessageParams } from "../interfaces";

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const normalizeWelcomeSpacing = (value: string): string => {
  return value
    .split("\n")
    .map((line) =>
      line
        .replace(/\s+([,!.?:;])/g, "$1")
        .replace(/\s{2,}/g, " ")
        .trimEnd(),
    )
    .join("\n")
    .trim();
};

export const buildWelcomeMessage = (
  params: BuildWelcomeMessageParams,
): string => {
  const name = params.name ? escapeHtml(params.name) : "";
  const username = params.username ? escapeHtml(`@${params.username}`) : "";
  const groupTitle = params.groupTitle ? escapeHtml(params.groupTitle) : "";

  const message = params.template
    .replace(/\{name\}/g, name)
    .replace(/\{username\}/g, username)
    .replace(/\{group\}/g, groupTitle);

  return normalizeWelcomeSpacing(message);
};
