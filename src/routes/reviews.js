const express = require('express');
const router = express.Router();
const { query } = require('../db');

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

module.exports = router;