import { GistApiResponse, GistCreatedResponse } from "../interfaces";

export const createGist = async (
  token: string,
  filename: string,
  content: string,
  description: string,
): Promise<GistCreatedResponse> => {
  const response = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      description,
      public: true,
      files: {
        [filename]: {
          content,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(`GitHub API error ${response.status}: ${errorBody}`);
  }

  const data: GistApiResponse = await response.json();

  return {
    htmlUrl: data.html_url,
  };
};
