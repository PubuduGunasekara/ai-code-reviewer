import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reposApi, reviewsApi } from "../api/client";
import AppFooter from "../components/AppFooter";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/LoadingSpinner";

function RepositoryRow({ repo, action }) {
  return (
    <div className="interactive-card flex flex-col justify-between gap-4 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--text)]">
          {repo.full_name}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {repo.is_private && (
            <span className="faint-text text-xs">private</span>
          )}
          {repo.language && (
            <span className="faint-text text-xs">{repo.language}</span>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function Repositories() {
  const navigate = useNavigate();

  const [githubRepos, setGithubRepos] = useState([]);
  const [connectedRepos, setConnectedRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [reviewing, setReviewing] = useState(false);

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
      await loadAll();
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
    } catch {
      alert("Failed to disconnect repo");
    }
  }

  async function createReview(e) {
    e.preventDefault();
    if (!selectedRepo || !prNumber) return;

    setReviewing(true);
    setReviewError(null);

    try {
      const fetchRes = await reviewsApi.fetchPR(
        selectedRepo,
        parseInt(prNumber),
      );
      const reviewId = fetchRes.data.review.id;

      await reviewsApi.process(reviewId);

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
    <div className="app-bg">
      <Navbar />

      <main className="page-shell">
        <section className="mb-8">
          <p className="faint-text text-xs font-semibold uppercase tracking-[0.18em]">
            Repositories
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Review a pull request
          </h1>
          <p className="muted-text mt-2 max-w-2xl text-sm leading-6">
            Choose a connected repository, enter a pull request number, and keep
            the review flow exactly where it already works.
          </p>
        </section>

        <section className="surface-card mb-8 p-5 sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text)]">
                Create review
              </h2>
              <p className="muted-text mt-1 text-sm">
                Select a connected repository and enter a PR number.
              </p>
            </div>
          </div>

          <form
            onSubmit={createReview}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]"
          >
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="input-shell"
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
              placeholder="PR number"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              className="input-shell"
              min="1"
              required
            />

            <button
              type="submit"
              disabled={reviewing || !selectedRepo || !prNumber}
              className="btn-primary"
            >
              {reviewing ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                  Reviewing...
                </>
              ) : (
                "Review PR"
              )}
            </button>
          </form>

          {reviewError && (
            <div className="surface-panel mt-3 border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {reviewError}
            </div>
          )}
          {reviewing && (
            <div className="muted-text mt-3 text-sm">
              Fetching PR diff, processing the review, and preparing results.
            </div>
          )}
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="faint-text text-xs font-semibold uppercase tracking-[0.18em]">
                Connected
              </p>
              <h2 className="text-xl font-semibold text-[var(--text)]">
                Repositories
                <span className="faint-text ml-2 text-sm font-normal">
                  ({connectedRepos.length})
                </span>
              </h2>
            </div>
          </div>

          {connectedRepos.length === 0 ? (
            <div className="surface-panel muted-text border-dashed p-8 text-center text-sm">
              No repositories connected yet.
            </div>
          ) : (
            <div className="space-y-2">
              {connectedRepos.map((repo) => (
                <RepositoryRow
                  key={repo.id}
                  repo={repo}
                  action={
                    <button
                      type="button"
                      onClick={() => disconnectRepo(repo.id)}
                      className="btn-secondary text-xs text-[var(--text-soft)] hover:text-red-500"
                    >
                      Disconnect
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4">
            <p className="faint-text text-xs font-semibold uppercase tracking-[0.18em]">
              GitHub
            </p>
            <h2 className="text-xl font-semibold text-[var(--text)]">
              Your repositories
              <span className="faint-text ml-2 text-sm font-normal">
                ({githubRepos.length})
              </span>
            </h2>
          </div>

          <div className="space-y-2">
            {githubRepos.map((repo) => {
              const isConnected = connectedIds.has(repo.github_repo_id);
              return (
                <RepositoryRow
                  key={repo.github_repo_id}
                  repo={repo}
                  action={
                    isConnected ? (
                      <span className="status-pill text-[var(--mint)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--mint)]" />
                        connected
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => connectRepo(repo.github_repo_id)}
                        disabled={connecting === repo.github_repo_id}
                        className="btn-secondary text-xs text-[var(--accent)] disabled:opacity-50"
                      >
                        {connecting === repo.github_repo_id
                          ? "Connecting..."
                          : "Connect"}
                      </button>
                    )
                  }
                />
              );
            })}
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
