import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = `${API}/auth/github`;
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  getMe:   () => api.get('/../../auth/me'),
  logout:  () => api.post('/../../auth/logout'),
};

export const reposApi = {
  getConnected:  () => api.get('/repositories'),
  getFromGitHub: () => api.get('/repositories/github'),
  connect:       (githubRepoId) => api.post('/repositories', { github_repo_id: githubRepoId }),
  disconnect:    (repoId) => api.delete(`/repositories/${repoId}`),
};

export const reviewsApi = {
  getAll:   (page = 1) => api.get(`/reviews?page=${page}`),
  getOne:   (reviewId) => api.get(`/reviews/${reviewId}`),
  fetchPR:  (repositoryId, prNumber) => api.post('/reviews/fetch-pr', {
    repository_id: repositoryId,
    pr_number: prNumber,
  }),
  process:  (reviewId) => api.post(`/reviews/${reviewId}/process`),
};

export default api;