// Intentionally insecure demo input used to show what the AI reviewer catches
// (SQL injection, hardcoded credentials, plaintext password comparison).
// Never imported by the app — kept only as sample input for the demo.

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:password123@localhost/mydb'
});

router.get('/users', async (req, res) => {
  const userId = req.query.id;
  const result = await pool.query(
    "SELECT * FROM users WHERE id = " + userId
  );
  res.json(result.rows);
});

router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (password == '1234') {
    res.json({ token: 'abc123' });
  }
});

module.exports = router;
