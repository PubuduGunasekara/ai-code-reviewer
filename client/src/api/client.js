import axios from 'axios';

// Create one axios instance used everywhere in the app
// This is the single source of truth for all API calls
const api = axios.create({
  baseURL: '/api/v1',         // all requests prefix with /api/v1
  withCredentials: true,      // CRITICAL: sends session cookie with every request
                              // without this, you're always logged out
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── RESPONSE INTERCEPTOR ─────────────────────────────────────
// Runs on every response before it reaches your component
// If 401 (not logged in) → redirect to login page
api.interceptors.response.use(
  (response) => response,           // success → pass through unchanged
  (error) => {
    if (error.response?.status === 401) {
      // Session expired or not logged in
      // Redirect to login (the backend handles GitHub OAuth)
      window.location.href = '/auth/github';
    }
    return Promise.reject(error);   // still reject so catch() blocks work
  }
);

// ─── AUTH ENDPOINTS ───────────────────────────────────────────
export const authApi = {
  // Check who is currently logged in
  getMe: () => api.get('/../../auth/me'),

  // Logout (POST to backend, then redirect)
  logout: () => api.post('/../../auth/logout'),
};

// ─── REPOSITORIES ENDPOINTS ───────────────────────────────────
export const reposApi = {
  // Get repos connected to our app
  getConnected: () => api.get('/repositories'),

  // Get all repos from GitHub (to let user pick which to connect)
  getFromGitHub: () => api.get('/repositories/github'),

  // Connect a repo
  connect: (githubRepoId) =>
    api.post('/repositories', { github_repo_id: githubRepoId }),

  // Disconnect a repo
  disconnect: (repoId) =>
    api.delete(`/repositories/${repoId}`),
};

// ─── REVIEWS ENDPOINTS ────────────────────────────────────────
export const reviewsApi = {
  // Get list of all reviews (paginated)
  getAll: (page = 1) => api.get(`/reviews?page=${page}`),

  // Get one review with its comments
  getOne: (reviewId) => api.get(`/reviews/${reviewId}`),

  // Fetch a PR diff from GitHub and create review record
  fetchPR: (repositoryId, prNumber) =>
    api.post('/reviews/fetch-pr', {
      repository_id: repositoryId,
      pr_number: prNumber,
    }),

  // Trigger GPT-4o review on a stored diff
  process: (reviewId) =>
    api.post(`/reviews/${reviewId}/process`),
};

export default api;