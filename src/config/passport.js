const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { query } = require('../db');

// ─── STRATEGY ────────────────────────────────────────────────
// This is the core logic: "when GitHub sends us a verified user,
// what do we do with them?"

passport.use(new GitHubStrategy(
  {
    clientID:     process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL:  'http://localhost:3001/auth/callback',
    scope: ['user:email', 'repo'],
  },

  // This function runs AFTER GitHub verifies the user
  // accessToken: lets us call GitHub API as this user
  // profile:     the user's GitHub profile data
  async (accessToken, refreshToken, profile, done) => {
    try {
      const githubId       = profile.id;
      const githubUsername = profile.username;
      const displayName    = profile.displayName || profile.username;
      const avatarUrl      = profile.photos?.[0]?.value || null;

      // Check if this user already exists in our database
      const existing = await query(
        'SELECT * FROM users WHERE github_id = $1',
        [githubId]
      );

      if (existing.rows.length > 0) {
        // User exists → update their access token (it may have changed)
        // and return the existing user
        const updated = await query(
          `UPDATE users 
           SET access_token = $1, updated_at = NOW()
           WHERE github_id = $2
           RETURNING *`,
          [accessToken, githubId]
        );
        console.log(`✅ Returning user logged in: ${githubUsername}`);
        return done(null, updated.rows[0]);
      }

      // New user → insert into database
      const newUser = await query(
        `INSERT INTO users 
           (github_id, github_username, display_name, avatar_url, access_token)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [githubId, githubUsername, displayName, avatarUrl, accessToken]
      );

      console.log(`✅ New user created: ${githubUsername}`);
      return done(null, newUser.rows[0]);

    } catch (error) {
      console.error('❌ Passport strategy error:', error);
      return done(error, null);
    }
  }
));

// ─── SERIALIZATION ───────────────────────────────────────────
// "What do we store in the session?"
// We only store the user's ID — not the whole user object.
// On every request, we look up the full user from the database
// using this ID.

passport.serializeUser((user, done) => {
  done(null, user.id); // store UUID in session
});

// "Given the ID from the session, get the full user"
passport.deserializeUser(async (id, done) => {
  try {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return done(null, false); // session exists but user deleted
    }

    done(null, result.rows[0]); // attach user to req.user
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;