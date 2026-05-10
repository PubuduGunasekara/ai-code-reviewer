const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-code-reviewer',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

// Routes (empty for now — we add next session)
app.get('/api/v1/reviews', (req, res) => {
  res.json({ message: 'Reviews endpoint — coming soon', reviews: [] });
});

// 404 handler
app.use('/{*splat}', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`AI Code Reviewer API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});