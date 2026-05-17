import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { reviewsApi } from "../api/client";
import AppFooter from "../components/AppFooter";
import Navbar from "../components/Navbar";
import RepositoryBadge from "../components/RepositoryBadge";
import {
  getOwnerGroupKey,
  getRepositoryGroupKey,
  getRepositoryIdentity,
} from "../utils/repository";

function ReviewStatus({ status }) {
  const isCompleted = status === "completed";

  return (
    <span
      className={`status-pill ${
        isCompleted ? "text-[var(--mint)]" : "text-[var(--amber)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isCompleted ? "bg-[var(--mint)]" : "bg-[var(--amber)]"
        }`}
      />
      {status}
    </span>
  );
}

function OwnerMark({ owner }) {
  const initial = owner?.charAt(0)?.toUpperCase() || "?";

  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-violet-400 to-rose-400 text-sm font-bold text-white shadow-lg shadow-sky-500/15">
      {initial}
    </span>
  );
}

function groupReviewsByOwnerAndRepo(reviews) {
  const ownerMap = new Map();

  reviews.forEach((review) => {
    const ownerKey = getOwnerGroupKey(review);
    const repoKey = getRepositoryGroupKey(review);
    const repository = getRepositoryIdentity(review);

    if (!ownerMap.has(ownerKey)) {
      ownerMap.set(ownerKey, {
        owner: ownerKey,
        reviewCount: 0,
        repos: new Map(),
      });
    }

    const ownerGroup = ownerMap.get(ownerKey);
    ownerGroup.reviewCount += 1;

    if (!ownerGroup.repos.has(repoKey)) {
      ownerGroup.repos.set(repoKey, {
        repository,
        reviewCount: 0,
        reviews: [],
      });
    }

    const repoGroup = ownerGroup.repos.get(repoKey);
    repoGroup.reviewCount += 1;
    repoGroup.reviews.push(review);
  });

  return Array.from(ownerMap.values()).map((ownerGroup) => ({
    ...ownerGroup,
    repos: Array.from(ownerGroup.repos.values()),
  }));
}

export default function Dashboard() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReviews() {
      try {
        const response = await reviewsApi.getAll();
        setReviews(response.data.data || []);
      } catch {
        setError("Failed to load reviews");
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, []);

  const completed = reviews.filter((r) => r.status === "completed").length;
  const pending = reviews.filter((r) => r.status === "pending").length;
  const stats = [
    { label: "Total reviews", value: reviews.length, color: "text-[var(--accent)]" },
    { label: "Completed", value: completed, color: "text-[var(--mint)]" },
    { label: "Pending", value: pending, color: "text-[var(--amber)]" },
  ];
  const groupedReviews = groupReviewsByOwnerAndRepo(reviews);

  return (
    <div className="app-bg">
      <Navbar />

      <main className="page-shell">
        <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="faint-text text-xs font-semibold uppercase tracking-[0.18em]">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
              Welcome back, {user?.github_username}
            </h1>
            <p className="muted-text mt-2 text-sm">
              Review activity, status, and findings in one quiet workspace.
            </p>
          </div>

          <Link to="/repositories" className="btn-primary w-full sm:w-auto">
            New review
          </Link>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="surface-panel p-5">
              <div className={`text-4xl font-semibold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="faint-text mt-2 text-sm">{stat.label}</div>
            </div>
          ))}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="faint-text text-xs font-semibold uppercase tracking-[0.18em]">
                Recent
              </p>
              <h2 className="text-xl font-semibold text-[var(--text)]">
                Reviews
              </h2>
            </div>
          </div>

          {loading && (
            <div className="surface-panel muted-text py-10 text-center text-sm">
              Loading reviews...
            </div>
          )}

          {error && (
            <div className="surface-panel border-red-400/35 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          {!loading && reviews.length === 0 && (
            <div className="surface-card px-6 py-12 text-center">
              <p className="text-lg font-semibold text-[var(--text)]">
                No reviews yet
              </p>
              <p className="muted-text mx-auto mt-2 max-w-md text-sm leading-6">
                Connect a repository and run your first pull request review.
              </p>
              <Link to="/repositories" className="btn-primary mt-6">
                Connect repository
              </Link>
            </div>
          )}

          <div className="space-y-5">
            {groupedReviews.map((ownerGroup) => (
              <div key={ownerGroup.owner} className="surface-panel p-4 sm:p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <OwnerMark owner={ownerGroup.owner} />
                    <div className="min-w-0">
                      <p className="faint-text text-xs font-semibold uppercase tracking-[0.16em]">
                        Owner
                      </p>
                      <h3 className="truncate text-lg font-semibold text-[var(--text)]">
                        {ownerGroup.owner}
                      </h3>
                    </div>
                  </div>
                  <span className="status-pill text-[var(--text-soft)]">
                    {ownerGroup.reviewCount} review
                    {ownerGroup.reviewCount === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-4">
                  {ownerGroup.repos.map((repoGroup) => (
                    <div
                      key={repoGroup.repository.fullName || "Uncategorized"}
                      className="border-l-2 border-[var(--line-strong)] pl-3 sm:pl-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <RepositoryBadge
                          review={repoGroup.reviews[0]}
                          compact
                        />
                        <span className="faint-text text-xs">
                          {repoGroup.reviewCount} PR review
                          {repoGroup.reviewCount === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {repoGroup.reviews.map((review) => (
                          <Link
                            key={review.id}
                            to={`/reviews/${review.id}`}
                            className="interactive-card block p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <RepositoryBadge review={review} compact />
                                  <span className="status-pill text-[var(--accent)]">
                                    PR #{review.pr_number}
                                  </span>
                                  <ReviewStatus status={review.status} />
                                  {review.cached && (
                                    <span className="status-pill text-[var(--violet)]">
                                      cached
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-base font-semibold text-[var(--text)]">
                                  {review.pr_title || "Untitled PR"}
                                </p>
                                <p className="faint-text mt-2 text-xs">
                                  {new Date(review.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <div className="surface-soft min-w-20 px-3 py-2 text-center">
                                {review.status === "completed" && (
                                  <div className="text-2xl font-semibold text-[var(--text)]">
                                    {review.issues_count}
                                  </div>
                                )}
                                <div className="faint-text text-xs">issues</div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
