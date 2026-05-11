const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const morgan         = require('morgan');
const session        = require('express-session');
const pgSession      = require('connect-pg-simple')(session);
require('dotenv').config();

const { pool }         = require('./db');
const passport         = require('./config/passport');
const reviewsRouter    = require('./routes/reviews');
const authRouter       = require('./routes/auth').router;

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disable for now — React will handle this
}));
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true, // CRITICAL: allows cookies to be sent cross-origin
}));
app.use(express.json());
app.use(morgan('dev'));

// ─── SESSION SETUP ────────────────────────────────────────────
// Sessions are how we remember who is logged in
// between requests without asking them to log in every time
app.use(session({
  store: new pgSession({
    pool,                // use our existing PostgreSQL pool
    tableName: 'session', // the table we created in migration 002
  }),
  secret:            process.env.SESSION_SECRET,
  resave:            false,  // don't save session if nothing changed
  saveUninitialized: false,  // don't create session until something stored
  cookie: {
    secure:   false,         // true in production (requires HTTPS)
    httpOnly: true,          // JS cannot read the cookie (XSS protection)
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },
}));

// ─── PASSPORT ─────────────────────────────────────────────────
app.use(passport.initialize()); // set up passport
app.use(passport.session());    // connect passport to our session

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status:        'ok',
      service:       'ai-code-reviewer',
      timestamp:     new Date().toISOString(),
      version:       '0.1.0',
      database:      'connected',
      authenticated: req.isAuthenticated(),
    });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

// ─── ROUTES ───────────────────────────────────────────────────
app.use('/auth',          authRouter);
app.use('/api/v1/reviews', reviewsRouter);

// ─── 404 ──────────────────────────────────────────────────────
app.use('/{*splat}', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health:    http://localhost:${PORT}/health`);
  console.log(`Login:     http://localhost:${PORT}/auth/github`);
  console.log(`Me:        http://localhost:${PORT}/auth/me`);
  console.log(`Reviews:   http://localhost:${PORT}/api/v1/reviews`);
});