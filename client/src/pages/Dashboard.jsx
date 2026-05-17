import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { reviewsApi } from "../api/client";
import Navbar from "../components/Navbar";
import SeverityBadge from "../components/SeverityBadge";

export default function Dashboard() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      const response = await reviewsApi.getAll();
      setReviews(response.data.data || []);
    } catch (err) {
      setError("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  // Stat counts
  const completed = reviews.filter((r) => r.status === "completed").length;
  const pending = reviews.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            Welcome back, {user?.github_username}
          </h1>
          <p className="text-gray-400 text-sm">
            Your AI-powered code review dashboard
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Total Reviews",
              value: reviews.length,
              color: "text-blue-400",
            },
            { label: "Completed", value: completed, color: "text-green-400" },
            { label: "Pending", value: pending, color: "text-yellow-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            >
              <div
                className={`text-3xl font-bold font-mono ${stat.color} mb-1`}
              >
                {stat.value}
              </div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Reviews list */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Reviews</h2>
          <Link
            to="/repositories"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            + New Review
          </Link>
        </div>

        {loading && (
          <div className="text-gray-500 text-sm font-mono py-8 text-center">
            Loading reviews...
          </div>
        )}

        {error && (
          <div
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 
                          text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        {!loading && reviews.length === 0 && (
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-10 
                          text-center"
          >
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400 mb-4">No reviews yet</p>
            <Link
              to="/repositories"
              className="text-blue-400 text-sm hover:text-blue-300"
            >
              Connect a repo to get started →
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {reviews.map((review) => (
            <Link
              key={review.id}
              to={`/reviews/${review.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-2xl p-5 
                         hover:border-gray-600 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {" "}
                  {/* min-w-0 prevents overflow */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-blue-400 text-sm">
                      PR #{review.pr_number}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono
        ${
          review.status === "completed"
            ? "bg-green-500/20 text-green-400"
            : "bg-yellow-500/20 text-yellow-400"
        }`}
                    >
                      {review.status}
                    </span>
                    {review.cached && (
                      <span
                        className="text-xs px-2 py-0.5 rounded font-mono 
                         bg-purple-500/20 text-purple-400"
                      >
                        cached
                      </span>
                    )}
                  </div>
                  {/* truncate prevents long titles breaking layout */}
                  <p className="text-white font-medium truncate">
                    {review.pr_title || "Untitled PR"}
                  </p>
                  <p className="text-gray-500 text-xs mt-1 font-mono">
                    {new Date(review.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {review.status === "completed" && (
                    <div className="text-2xl font-bold font-mono text-white">
                      {review.issues_count}
                    </div>
                  )}
                  <div className="text-gray-500 text-xs">issues</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
