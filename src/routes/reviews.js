const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth }   = require('./auth');
const GitHubService     = require('../services/githubService');

// GET /api/v1/reviews
router.get('/', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT id, pr_number, pr_title, status,
              issues_count, processing_time_ms,
              cached, created_at
       FROM reviews
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM reviews');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: { page, limit, total,
        pages: Math.ceil(total / limit) },
    });

  } catch (error) {
    console.error('GET /reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/v1/reviews/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const reviewResult = await query(
      'SELECT * FROM reviews WHERE id = $1', [id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const commentsResult = await query(
      `SELECT * FROM review_comments
       WHERE review_id = $1
       ORDER BY severity DESC, line_number ASC`,
      [id]
    );

    res.json({
      review:   reviewResult.rows[0],
      comments: commentsResult.rows,
    });

  } catch (error) {
    console.error('GET /reviews/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// POST /api/v1/reviews
router.post('/', async (req, res) => {
  try {
    const { pr_number, pr_title, repository_id, user_id } = req.body;

    if (!pr_number || !repository_id || !user_id) {
      return res.status(400).json({
        error: 'Missing required fields: pr_number, repository_id, user_id'
      });
    }

    const result = await query(
      `INSERT INTO reviews
         (pr_number, pr_title, repository_id, user_id, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [pr_number, pr_title, repository_id, user_id]
    );

    res.status(201).json({
      message: 'Review created',
      review:  result.rows[0],
    });

  } catch (error) {
    console.error('POST /reviews error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// POST /api/v1/reviews/fetch-pr
// Fetch a PR diff from GitHub and create a review request
// This is step 1 of the review process — get the diff
// Step 2 (GPT-4o analysis) comes next session
router.post('/fetch-pr', requireAuth, async (req, res) => {
  try {
    const { repository_id, pr_number } = req.body;

    if (!repository_id || !pr_number) {
      return res.status(400).json({
        error: 'Missing required fields: repository_id, pr_number',
      });
    }

    // Get the repository from DB
    // Verify it belongs to this user (security check)
    const repoResult = await query(
      `SELECT * FROM repositories 
       WHERE id = $1 AND user_id = $2`,
      [repository_id, req.user.id]
    );

    if (repoResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Repository not found or not connected',
      });
    }

    const repo = repoResult.rows[0];

    // Create GitHub service with this user's token
    const github = new GitHubService(req.user.access_token);

    // Fetch PR metadata
    console.log(`📥 Fetching PR #${pr_number} from ${repo.full_name}...`);
    const prDetails = await github.getPullRequest(
      repo.owner, repo.name, pr_number
    );

    // Fetch the actual diff
    const rawDiff = await github.getPullRequestDiff(
      repo.owner, repo.name, pr_number
    );

    // Parse diff into individual files
    const files = github.parseDiffIntoFiles(rawDiff);

    // Create a review record in the database
    // Status is 'pending' — GPT-4o hasn't reviewed it yet
    const reviewResult = await query(
      `INSERT INTO reviews
         (user_id, repository_id, pr_number, pr_title,
          status, diff_content)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING id, pr_number, pr_title, status, created_at`,
      [
        req.user.id,
        repository_id,
        pr_number,
        prDetails.title,
        rawDiff,
      ]
    );

    const review = reviewResult.rows[0];

    console.log(` Review created: ${review.id} for PR #${pr_number}`);

    res.status(201).json({
      message:   'PR fetched — ready for AI review',
      review: {
        id:        review.id,
        pr_number: review.pr_number,
        pr_title:  review.pr_title,
        status:    review.status,
        pr_details: {
          author:        prDetails.author,
          additions:     prDetails.additions,
          deletions:     prDetails.deletions,
          changed_files: prDetails.changed_files,
          state:         prDetails.state,
        },
        files_changed: files.map(f => ({
          filename:  f.filename,
          additions: f.additions,
          deletions: f.deletions,
        })),
      },
    });

  } catch (error) {
    console.error('POST /reviews/fetch-pr error:', error);

    if (error.status === 401 || error.status === 403) {
      return res.status(401).json({
        error: 'GitHub authentication failed',
        message: 'Your GitHub token is invalid or expired, please log in again',
      });
    }

    if (error.message && error.message.toLowerCase().includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    const message = error.message || 'Failed to fetch PR';
    return res.status(500).json({ error: message });
  }
});

module.exports = router;