import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { reviewsApi } from "../api/client";
import AppFooter from "../components/AppFooter";
import Navbar from "../components/Navbar";
import RepositoryBadge from "../components/RepositoryBadge";
import SeverityBadge from "../components/SeverityBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import { getRepositoryIdentity } from "../utils/repository";

function StatusPill({ status }) {
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

function RepositoryIdentityStrip({ review }) {
  const repository = getRepositoryIdentity(review);

  if (!repository.fullName) return null;

  return (
    <div className="surface-soft mb-5 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-violet-400 to-rose-400 text-sm font-bold text-white shadow-lg shadow-sky-500/15">
          {repository.owner?.charAt(0)?.toUpperCase() || "R"}
        </span>
        <div className="min-w-0">
          <p className="faint-text text-xs font-semibold uppercase tracking-[0.16em]">
            Repository
          </p>
          <div className="mt-1">
            <RepositoryBadge review={review} />
          </div>
        </div>
      </div>

      {repository.owner && (
        <div className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs">
          <span className="faint-text mr-2 uppercase tracking-[0.14em]">
            Owner
          </span>
          <span className="font-semibold text-[var(--text)]">
            {repository.owner}
          </span>
        </div>
      )}
    </div>
  );
}

function groupCommentsByCategory(comments) {
  const categoryMap = new Map();

  comments.forEach((comment) => {
    const category = comment.category || "General";

    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }

    categoryMap.get(category).push(comment);
  });

  return Array.from(categoryMap.entries()).map(([category, items]) => ({
    category,
    comments: items,
  }));
}

export default function ReviewDetail() {
  const { id } = useParams();
  const [review, setReview] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function loadReview() {
      try {
        const response = await reviewsApi.getOne(id);
        setReview(response.data.review);
        setComments(response.data.comments || []);
      } catch (err) {
        console.error("Failed to load review:", err);
      } finally {
        setLoading(false);
      }
    }

    loadReview();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading review..." />;
  if (!review)
    return (
      <div className="app-bg flex min-h-screen items-center justify-center px-4">
        <div className="surface-card max-w-sm p-8 text-center">
          <p className="text-lg font-semibold text-[var(--text)]">
            Review not found
          </p>
          <Link to="/dashboard" className="btn-primary mt-5">
            Back to dashboard
          </Link>
        </div>
      </div>
    );

  const result = review.review_result
    ? typeof review.review_result === "string"
      ? JSON.parse(review.review_result)
      : review.review_result
    : null;

  const score = result?.score ?? null;
  const scoreColour =
    score >= 8
      ? "text-[var(--mint)]"
      : score >= 5
        ? "text-[var(--amber)]"
        : score !== null
          ? "text-[var(--rose)]"
          : "text-[var(--text-faint)]";

  const filteredComments =
    filter === "all" ? comments : comments.filter((c) => c.severity === filter);
  const categorizedComments = groupCommentsByCategory(filteredComments);

  const counts = comments.reduce((acc, c) => {
    acc[c.severity] = (acc[c.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="app-bg">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <Link to="/dashboard" className="btn-secondary mb-6">
          Back to dashboard
        </Link>

        <section className="surface-card mb-6 p-5 sm:p-6">
          <RepositoryIdentityStrip review={review} />

          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="status-pill text-[var(--accent)]">
                  PR #{review.pr_number}
                </span>
                <StatusPill status={review.status} />
                {review.cached && (
                  <span className="status-pill text-[var(--violet)]">
                    cached
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
                {review.pr_title || "Untitled PR"}
              </h1>
              <p className="faint-text mt-2 text-sm">
                Model: {review.model_used} | Time:{" "}
                {review.processing_time_ms === 0
                  ? "instant cached result"
                  : `${(review.processing_time_ms / 1000).toFixed(1)}s`}
              </p>
            </div>

            <div className="surface-soft flex min-w-28 items-center justify-center p-4 text-center">
              <div>
                <div className={`text-5xl font-semibold ${scoreColour}`}>
                  {score ?? "-"}
                </div>
                <div className="faint-text text-xs">out of 10</div>
              </div>
            </div>
          </div>

          {result?.summary && (
            <div className="surface-soft muted-text mt-5 p-4 text-sm leading-7">
              {result.summary}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {["critical", "high", "medium", "low", "info"].map((sev) =>
              counts[sev] ? (
                <div key={sev} className="flex items-center gap-2">
                  <SeverityBadge severity={sev} />
                  <span className="faint-text text-sm">{counts[sev]}</span>
                </div>
              ) : null,
            )}
          </div>
        </section>

        {result?.positives?.length > 0 && (
          <section className="surface-panel mb-6 border-emerald-400/35 bg-emerald-500/10 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
              What worked
            </h2>
            <ul className="space-y-2">
              {result.positives.map((p, i) => (
                <li
                  key={i}
                  className="muted-text grid grid-cols-[10px_1fr] gap-3 text-sm leading-6"
                >
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {comments.length > 0 && (
          <section>
            <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="faint-text text-xs font-semibold uppercase tracking-[0.18em]">
                  Findings
                </p>
                <h2 className="text-xl font-semibold text-[var(--text)]">
                  Issues
                  <span className="faint-text ml-2 text-sm font-normal">
                    ({filteredComments.length})
                  </span>
                </h2>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {["all", "critical", "high", "medium", "low", "info"].map(
                  (f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                        filter === f
                          ? "border-transparent bg-[var(--text)] text-[var(--app-bg)]"
                          : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--line-strong)]"
                      }`}
                    >
                      {f}
                      {f !== "all" && counts[f] ? ` (${counts[f]})` : ""}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-5">
              {categorizedComments.map((categoryGroup) => (
                <div key={categoryGroup.category}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="faint-text text-xs font-semibold uppercase tracking-[0.16em]">
                        Category
                      </p>
                      <h3 className="text-base font-semibold text-[var(--text)]">
                        {categoryGroup.category}
                      </h3>
                    </div>
                    <span className="status-pill text-[var(--text-soft)]">
                      {categoryGroup.comments.length} finding
                      {categoryGroup.comments.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {categoryGroup.comments.map((comment, i) => (
                      <article
                        key={comment.id || `${categoryGroup.category}-${i}`}
                        className="interactive-card p-5"
                      >
                        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="flex flex-wrap items-center gap-2">
                            <SeverityBadge severity={comment.severity} />
                            {comment.cwe_reference && (
                              <span className="status-pill text-[var(--amber)]">
                                {comment.cwe_reference}
                              </span>
                            )}
                          </div>
                          {comment.file_path && (
                            <span className="faint-text max-w-full truncate text-xs sm:max-w-xs">
                              {comment.file_path}
                              {comment.line_number && `:${comment.line_number}`}
                            </span>
                          )}
                        </div>

                        <p className="muted-text text-sm leading-7">
                          {comment.comment}
                        </p>

                        {comment.suggestion && (
                          <div className="surface-soft mt-4 p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                              Suggestion
                            </p>
                            <p className="muted-text text-sm leading-7">
                              {comment.suggestion}
                            </p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {comments.length === 0 && review.status === "completed" && (
          <section className="surface-card px-6 py-12 text-center">
            <p className="text-lg font-semibold text-[var(--mint)]">
              No issues found
            </p>
            <p className="muted-text mt-2 text-sm">
              This pull request finished with a clean review.
            </p>
          </section>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
