const express  = require('express');
const passport = require('../config/passport');
const router   = express.Router();

// ─── MIDDLEWARE ───────────────────────────────────────────────
// Checks if user is logged in before allowing access to protected routes
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next(); // user is logged in → continue
  }
  res.status(401).json({
    error: 'Unauthorised',
    message: 'You must be logged in to access this resource',
    loginUrl: 'http://localhost:3001/auth/github',
  });
};

// ─── ROUTES ──────────────────────────────────────────────────

// Step 1 of OAuth: redirect user to GitHub
// User visits this URL → GitHub login page
router.get('/github',
  passport.authenticate('github', {
    scope: ['user:email', 'repo'],
  })
);

// Step 2 of OAuth: GitHub redirects back here after user approves
// GitHub sends a ?code=... query parameter
// Passport exchanges it for an access token automatically
router.get('/callback',
  passport.authenticate('github', {
    failureRedirect: '/auth/failure',
    session: true,
  }),
  (req, res) => {
    // Login successful — req.user is now populated
    console.log(`🎉 Login successful: ${req.user.github_username}`);

    // In production: redirect to React frontend
    // For now: return the user data as JSON so we can test it
    res.json({
      message: 'Login successful',
      user: {
        id: req.user.id,
        github_username: req.user.github_username,
        display_name: req.user.display_name,
        avatar_url: req.user.avatar_url,
      },
    });
  }
);

// Login failure handler
router.get('/failure', (req, res) => {
  res.status(401).json({ error: 'GitHub authentication failed' });
});

// GET /auth/me — who is logged in right now?
// Protected route — only works if you have a valid session
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      github_username: req.user.github_username,
      display_name: req.user.display_name,
      avatar_url: req.user.avatar_url,
      created_at: req.user.created_at,
    },
  });
});

// POST /auth/logout — end the session
router.post('/logout', requireAuth, (req, res) => {
  const username = req.user.github_username;

  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy(() => {
      res.json({ message: `Goodbye ${username}` });
    });
  });
});

module.exports = { router, requireAuth };