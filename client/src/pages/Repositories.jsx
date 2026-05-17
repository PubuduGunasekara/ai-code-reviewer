import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reposApi, reviewsApi } from "../api/client";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Repositories() {
  const navigate = useNavigate();

  const [githubRepos, setGithubRepos] = useState([]);
  const [connectedRepos, setConnectedRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  // For the "create review" form
  const [selectedRepo, setSelectedRepo] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [reviewError, setReviewError] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [ghRes, connRes] = await Promise.all([
        reposApi.getFromGitHub(),
        reposApi.getConnected(),
      ]);
      setGithubRepos(ghRes.data.repositories || []);
      setConnectedRepos(connRes.data.repositories || []);
    } catch (err) {
      console.error("Failed to load repos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function connectRepo(githubRepoId) {
    setConnecting(githubRepoId);
    try {
      await reposApi.connect(githubRepoId);
      await loadAll(); // refresh both lists
    } catch (err) {
      alert(err.response?.data?.error || "Failed to connect repo");
    } finally {
      setConnecting(null);
    }
  }

  async function disconnectRepo(repoId) {
    if (!confirm("Disconnect this repository?")) return;
    try {
      await reposApi.disconnect(repoId);
      await loadAll();
    } catch (err) {
      alert("Failed to disconnect repo");
    }
  }

  async function createReview(e) {
    e.preventDefault();
    if (!selectedRepo || !prNumber) return;

    setReviewing(true);
    setReviewError(null);

    try {
      // Step 1: fetch the PR diff
      const fetchRes = await reviewsApi.fetchPR(
        selectedRepo,
        parseInt(prNumber),
      );
      const reviewId = fetchRes.data.review.id;

      // Step 2: trigger GPT-4o review
      await reviewsApi.process(reviewId);

      // Step 3: navigate to the completed review
      navigate(`/reviews/${reviewId}`);
    } catch (err) {
      setReviewError(err.response?.data?.error || "Failed to create review");
    } finally {
      setReviewing(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading repositories..." />;

  const connectedIds = new Set(connectedRepos.map((r) => r.github_repo_id));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Create Review Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">Create a Review</h2>
          <p className="text-gray-400 text-sm mb-5">
            Select a connected repository and enter a PR number
          </p>
          <form
            onSubmit={createReview}
            className="flex gap-3 flex-col sm:flex-row sm:flex-wrap"
          >
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full sm:flex-1 sm:min-w-48 bg-gray-800 border border-gray-700 
               rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none 
               focus:border-blue-500"
              required
            >
              <option value="">Select a repository...</option>
              {connectedRepos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.full_name}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="PR number (e.g. 3)"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              className="w-full sm:w-40 bg-gray-800 border border-gray-700 rounded-xl 
               px-4 py-2.5 text-white text-sm focus:outline-none 
               focus:border-blue-500"
              min="1"
              required
            />

            <button
              type="submit"
              disabled={reviewing || !selectedRepo || !prNumber}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 
               disabled:bg-gray-700 disabled:text-gray-500 text-white 
               px-6 py-2.5 rounded-xl text-sm font-medium transition-colors 
               flex items-center justify-center gap-2"
            >
              {reviewing ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-white/30 border-t-white 
                        rounded-full animate-spin"
                  />
                  Reviewing...
                </>
              ) : (
                "🤖 Review PR"
              )}
            </button>
          </form>
          {reviewError && (
            <div
              className="mt-3 text-red-400 text-sm bg-red-500/10 
                            border border-red-500/30 rounded-xl px-4 py-3"
            >
              {reviewError}
            </div>
          )}
          {reviewing && (
            <div className="mt-3 text-blue-400 text-sm font-mono">
              Fetching PR diff → sending to GPT-4o → analysing code... This
              takes 5-15 seconds.
            </div>
          )}
        </div>

        {/* Connected Repos */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Connected Repositories
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({connectedRepos.length})
            </span>
          </h2>

          {connectedRepos.length === 0 ? (
            <div
              className="bg-gray-900 border border-dashed border-gray-700 
                            rounded-2xl p-8 text-center text-gray-500 text-sm"
            >
              No repos connected yet. Connect one below.
            </div>
          ) : (
            <div className="space-y-2">
              {connectedRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between bg-gray-900 
                             border border-gray-800 rounded-xl px-4 py-3"
                >
                  <div>
                    <span className="font-mono text-sm text-white">
                      {repo.full_name}
                    </span>
                    {repo.is_private && (
                      <span className="ml-2 text-xs text-gray-500">
                        🔒 private
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => disconnectRepo(repo.id)}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All GitHub Repos */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Your GitHub Repositories
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({githubRepos.length})
            </span>
          </h2>

          <div className="space-y-2">
            {githubRepos.map((repo) => {
              const isConnected = connectedIds.has(repo.github_repo_id);
              return (
                <div
                  key={repo.github_repo_id}
                  className="flex items-center justify-between bg-gray-900 
                             border border-gray-800 rounded-xl px-4 py-3"
                >
                  <div>
                    <span className="font-mono text-sm text-white">
                      {repo.full_name}
                    </span>
                    <div className="flex gap-2 mt-0.5">
                      {repo.is_private && (
                        <span className="text-xs text-gray-500">
                          🔒 private
                        </span>
                      )}
                      {repo.language && (
                        <span className="text-xs text-gray-600">
                          {repo.language}
                        </span>
                      )}
                    </div>
                  </div>

                  {isConnected ? (
                    <span
                      className="text-xs font-mono text-green-400 
                                     bg-green-500/10 px-3 py-1 rounded-full"
                    >
                      ✓ connected
                    </span>
                  ) : (
                    <button
                      onClick={() => connectRepo(repo.github_repo_id)}
                      disabled={connecting === repo.github_repo_id}
                      className="text-xs text-blue-400 hover:text-blue-300 
                                 border border-blue-500/30 hover:border-blue-400 
                                 px-3 py-1 rounded-full transition-colors 
                                 disabled:opacity-50"
                    >
                      {connecting === repo.github_repo_id
                        ? "Connecting..."
                        : "Connect"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
