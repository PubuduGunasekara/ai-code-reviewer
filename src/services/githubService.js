const { Octokit } = require('@octokit/rest');

// Why a separate service file?
// The logic for talking to GitHub doesn't belong in routes.
// Routes handle HTTP — services handle business logic.
// This is the Single Responsibility Principle applied to files.

class GitHubService {
  constructor(accessToken) {
    // Create an Octokit instance for this specific user's token
    this.octokit = new Octokit({ auth: accessToken });
  }

  // ─── FETCH PR DETAILS ───────────────────────────────────────
  async getPullRequest(owner, repo, pullNumber) {
    try {
      const { data } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });

      return {
        number:    data.number,
        title:     data.title,
        body:      data.body,
        state:     data.state,        // open, closed, merged
        author:    data.user.login,
        base:      data.base.ref,     // branch being merged INTO
        head:      data.head.ref,     // branch being merged FROM
        commits:   data.commits,      // number of commits
        additions: data.additions,    // lines added
        deletions: data.deletions,    // lines removed
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
  // This is the raw text diff that GPT-4o will read and review
  async getPullRequestDiff(owner, repo, pullNumber) {
    try {
      // GitHub returns different formats based on Accept header
      // 'application/vnd.github.v3.diff' = unified diff format
      const { data } = await this.octokit.request(
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

      return data; // raw diff text

    } catch (error) {
      if (error.status === 404) {
        throw new Error(`PR #${pullNumber} not found`);
      }
      throw error;
    }
  }

  // ─── PARSE DIFF INTO FILES ───────────────────────────────────
  // The raw diff is one big string. This splits it into
  // individual files so we can review them separately.
  parseDiffIntoFiles(rawDiff) {
    const files = [];
    // Each file in the diff starts with "diff --git"
    const fileDiffs = rawDiff.split(/^diff --git /m).filter(Boolean);

    for (const fileDiff of fileDiffs) {
      const lines = fileDiff.split('\n');

      // Extract filename from the first line
      // Format: "a/src/index.js b/src/index.js"
      const filenameLine = lines[0];
      const match = filenameLine.match(/b\/(.+)$/);
      const filename = match ? match[1] : 'unknown';

      // Count added and removed lines
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
        diff: 'diff --git ' + fileDiff, // reconstruct full diff for this file
      });
    }

    return files;
  }

  // ─── FETCH FILES CHANGED IN PR ───────────────────────────────
  // GitHub also has a separate endpoint that lists changed files
  // with their patch (diff) — more structured than the raw diff
  async getPullRequestFiles(owner, repo, pullNumber) {
    try {
      const { data } = await this.octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100, // max files per request
      });

      return data.map(file => ({
        filename:  file.filename,
        status:    file.status,    // added, modified, removed, renamed
        additions: file.additions,
        deletions: file.deletions,
        changes:   file.changes,
        patch:     file.patch,     // the diff for this specific file
      }));

    } catch (error) {
      throw error;
    }
  }
}

module.exports = GitHubService;