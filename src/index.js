const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
require('dotenv').config();

const { pool }    = require('./db');
const reviewsRouter = require('./routes/reviews');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check — now tests DB connection too
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status:    'ok',
      service:   'ai-code-reviewer',
      timestamp: new Date().toISOString(),
      version:   '0.1.0',
      database:  'connected',
    });
  } catch {
    res.status(503).json({
      status:   'degraded',
      database: 'disconnected',
    });
  }
});

// Mount routes
app.use('/api/v1/reviews', reviewsRouter);

// 404 catch-all
app.use('/{*splat}', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Health:   http://localhost:${PORT}/health`);
  console.log(` Reviews:  http://localhost:${PORT}/api/v1/reviews`);
});