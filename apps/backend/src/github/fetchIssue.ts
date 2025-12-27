import axios from 'axios';

export type GithubIssue = {
  title: string;
  body: string | null;
};

export const fetchGithubIssue = async (
  owner: string,
  repo: string,
  issueNumber: string
): Promise<GithubIssue> => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;

    const response = await axios.get(url, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    return {
      title: response.data.title,
      body: response.data.body,
    };
  } catch (err) {
    console.log(err);
    return {
      title: '',
      body: null,
    };
  }
};
