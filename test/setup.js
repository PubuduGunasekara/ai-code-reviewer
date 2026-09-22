// Loaded via `node --require` before any test file. No network, DB, or
// Redis credentials are real here — tests mock those modules at the
// require boundary (see test/helpers/mockRequire.js).
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
