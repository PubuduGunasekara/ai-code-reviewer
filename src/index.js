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
const repositoriesRouter = require('./routes/repositories');
const { ping }         = require('./services/redisService');

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const DEFAULT_CLIENT_URL = 'http://localhost:3000';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const splitEnvList = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeOrigin = (value) => {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/$/, '');
  }
};

const parseBoolean = (value, fallback) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL || DEFAULT_CLIENT_URL,
    ...splitEnvList(process.env.CLIENT_URLS),
  ]
    .map(normalizeOrigin)
    .filter(Boolean)
);

const callbackUsesHttps = (process.env.CALLBACK_URL || '').startsWith('https://');
const sessionCookieSecure = parseBoolean(
  process.env.SESSION_COOKIE_SECURE,
  process.env.NODE_ENV === 'production' || callbackUsesHttps
);
const sessionCookieSameSite = (
  process.env.SESSION_COOKIE_SAME_SITE ||
  (sessionCookieSecure ? 'none' : 'lax')
).toLowerCase();
const allowedSameSiteValues = new Set(['lax', 'strict', 'none']);

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required');
}

if (!allowedSameSiteValues.has(sessionCookieSameSite)) {
  throw new Error('SESSION_COOKIE_SAME_SITE must be lax, strict, or none');
}

if (sessionCookieSameSite === 'none' && !sessionCookieSecure) {
  throw new Error('SESSION_COOKIE_SAME_SITE=none requires SESSION_COOKIE_SECURE=true');
}

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disable for now — React will handle this
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true, // CRITICAL: allows cookies to be sent cross-origin
}));
app.use(express.json());
app.use(morgan('dev'));

// ─── SESSION SETUP ────────────────────────────────────────────
// Sessions are how we remember who is logged in
// between requests without asking them to log in every time
app.use(session({
  name: process.env.SESSION_COOKIE_NAME || 'ai_code_reviewer.sid',
  store: new pgSession({
    pool,                // use our existing PostgreSQL pool
    tableName: 'session', // the table we created in migration 002
  }),
  proxy:             true,
  secret:            process.env.SESSION_SECRET,
  resave:            false,  // don't save session if nothing changed
  saveUninitialized: false,  // don't create session until something stored
  cookie: {
    secure:   sessionCookieSecure,
    httpOnly: true,
    sameSite: sessionCookieSameSite,
    maxAge:   SESSION_MAX_AGE_MS,
  },
}));

// ─── PASSPORT ─────────────────────────────────────────────────
app.use(passport.initialize()); // set up passport
app.use(passport.session());    // connect passport to our session

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    const redisAlive = await ping().catch(() => false);
    
    res.json({
      status:        'ok',
      service:       'ai-code-reviewer',
      timestamp:     new Date().toISOString(),
      version:       '0.1.0',
      database:      'connected',
      redis:         redisAlive ? 'connected' : 'disconnected',
      authenticated: req.isAuthenticated(),
    });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

// ─── ROUTES ───────────────────────────────────────────────────
app.use('/auth',          authRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/repositories', repositoriesRouter);

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
