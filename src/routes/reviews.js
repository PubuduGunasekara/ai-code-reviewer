const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth }   = require('./auth');
const GitHubService     = require('../services/githubService');
const { reviewDiff }  = require('../services/openaiService');

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
    console.log(`Fetching PR #${pr_number} from ${repo.full_name}...`);
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

// POST /api/v1/reviews/:id/process
// Trigger GPT-4o review on a stored PR diff
// This is the main feature — where AI actually reviews code
router.post('/:id/process', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    // ── 1. Fetch the review from database ──────────────────────
    const reviewResult = await query(
      `SELECT r.*, 
              repo.owner, repo.name as repo_name
       FROM reviews r
       JOIN repositories repo ON r.repository_id = repo.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, req.user.id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Review not found or not owned by you' 
      });
    }

    const review = reviewResult.rows[0];

    // ── 2. Check it's not already processed ───────────────────
    if (review.status === 'completed') {
      return res.status(409).json({
        error: 'Review already completed',
        message: 'Use GET /api/v1/reviews/:id to see the results',
      });
    }

    if (review.status === 'processing') {
      return res.status(409).json({
        error: 'Review is already being processed',
      });
    }

    if (!review.diff_content) {
      return res.status(400).json({
        error: 'No diff content — use /fetch-pr first',
      });
    }

    // ── 3. Update status to 'processing' ──────────────────────
    // This prevents duplicate processing if user hits the
    // endpoint twice simultaneously
    await query(
      `UPDATE reviews SET status = 'processing', 
       updated_at = NOW() WHERE id = $1`,
      [id]
    );

    console.log(`Processing review ${id} for PR #${review.pr_number}`);

    // ── 4. Send diff to GPT-4o ────────────────────────────────
    const { review: aiReview, processingTimeMs, model } = 
      await reviewDiff(
        review.diff_content,
        review.pr_title,
        review.pr_number
      );

    // ── 5. Save each comment to review_comments table ─────────
    // We save them individually so they can be queried,
    // filtered by severity, and displayed inline on the diff
    const savedComments = [];
    
    for (const issue of aiReview.issues) {
      const commentResult = await query(
        `INSERT INTO review_comments
           (review_id, file_path, line_number, severity, 
            category, comment, cwe_reference, suggestion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          issue.file     || 'unknown',
          issue.line     || null,
          issue.severity || 'info',
          issue.category || 'general',
          issue.comment,
          issue.cwe      || null,
          issue.suggestion || null,
        ]
      );
      savedComments.push(commentResult.rows[0]);
    }

    // ── 6. Update review as completed ─────────────────────────
    await query(
      `UPDATE reviews SET
         status             = 'completed',
         review_result      = $1,
         issues_count       = $2,
         processing_time_ms = $3,
         model_used         = $4,
         updated_at         = NOW()
       WHERE id = $5`,
      [
        JSON.stringify(aiReview),  // full response stored as JSONB
        aiReview.issues.length,
        processingTimeMs,
        model,
        id,
      ]
    );

    console.log(`Review ${id} complete: ${aiReview.issues.length} issues found`);

    // ── 7. Return the full review ──────────────────────────────
    res.json({
      message: 'AI review complete',
      review: {
        id,
        pr_number:          review.pr_number,
        pr_title:           review.pr_title,
        status:             'completed',
        processing_time_ms: processingTimeMs,
        model_used:         model,
        summary:            aiReview.summary,
        score:              aiReview.score,
        positives:          aiReview.positives,
        issues_count:       aiReview.issues.length,
        issues_by_severity: {
          critical: savedComments.filter(c => c.severity === 'critical').length,
          high:     savedComments.filter(c => c.severity === 'high').length,
          medium:   savedComments.filter(c => c.severity === 'medium').length,
          low:      savedComments.filter(c => c.severity === 'low').length,
          info:     savedComments.filter(c => c.severity === 'info').length,
        },
        comments: savedComments,
      },
    });

  } catch (error) {
    console.error(`Review processing error for ${id}:`, error.message);

    // If GPT-4o fails — update status back to 'pending'
    // so the user can try again
    await query(
      `UPDATE reviews SET status = 'pending', updated_at = NOW() 
       WHERE id = $1`,
      [id]
    );

    if (error.message.includes('OpenAI')) {
      return res.status(502).json({ error: error.message });
    }

    res.status(500).json({ error: 'Review processing failed' });
  }
});

module.exports = router;