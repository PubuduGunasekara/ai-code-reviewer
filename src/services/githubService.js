let OctokitClass;

const getOctokitClass = async () => {
  if (!OctokitClass) {
    const octokitModule = await import('@octokit/rest');
    OctokitClass = octokitModule.Octokit || octokitModule.default;
  }
  return OctokitClass;
};

class GitHubService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.octokit = null;
  }

  async getOctokit() {
    if (!this.octokit) {
      const Octokit = await getOctokitClass();
      this.octokit = new Octokit({ auth: this.accessToken });
    }
    return this.octokit;
  }

  // ─── FETCH PR DETAILS ───────────────────────────────────────
  async getPullRequest(owner, repo, pullNumber) {
    try {
      const octokit = await this.getOctokit();
      const { data } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });

      return {
        number:    data.number,
        title:     data.title,
        body:      data.body,
        state:     data.state,
        author:    data.user.login,
        base:      data.base.ref,
        head:      data.head.ref,
        commits:   data.commits,
        additions: data.additions,
        deletions: data.deletions,
        changed_files: data.changed_files,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`PR #${pullNumber} not found in ${owner}/${repo}`);
      }
      throw error;
    }
  }

  // ─── FETCH PR DIFF ──────────────────────────────────────────
  async getPullRequestDiff(owner, repo, pullNumber) {
    try {
      const octokit = await this.getOctokit();
      const { data } = await octokit.request(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}',
        {
          owner,
          repo,
          pull_number: pullNumber,
          headers: {
            accept: 'application/vnd.github.v3.diff',
          },
        }
      );

      return data;
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`PR #${pullNumber} not found`);
      }
      throw error;
    }
  }

  // ─── PARSE DIFF INTO FILES ───────────────────────────────────
  parseDiffIntoFiles(rawDiff) {
    const files = [];
    const fileDiffs = rawDiff.split(/^diff --git /m).filter(Boolean);

    for (const fileDiff of fileDiffs) {
      const lines = fileDiff.split('\n');
      const filenameLine = lines[0];
      const match = filenameLine.match(/b\/(.+)$/);
      const filename = match ? match[1] : 'unknown';

      let additions = 0;
      let deletions = 0;
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++;
        if (line.startsWith('-') && !line.startsWith('---')) deletions++;
      }

      files.push({
        filename,
        additions,
        deletions,
        diff: 'diff --git ' + fileDiff,
      });
    }

    return files;
  }

  // ─── FETCH FILES CHANGED IN PR ───────────────────────────────
  async getPullRequestFiles(owner, repo, pullNumber) {
    try {
      const octokit = await this.getOctokit();
      const { data } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      });

      return data.map(file => ({
        filename: file.filename,
        status:   file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes:  file.changes,
        patch:    file.patch,
      }));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = GitHubService;
