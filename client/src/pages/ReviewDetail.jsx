import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reviewsApi } from '../api/client';
import Navbar from '../components/Navbar';
import SeverityBadge from '../components/SeverityBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ReviewDetail() {
  const { id }               = useParams(); // gets :id from URL
  const [review, setReview]   = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [filter, setFilter]    = useState('all');

  useEffect(() => {
    loadReview();
  }, [id]);

  async function loadReview() {
    try {
      const response = await reviewsApi.getOne(id);
      setReview(response.data.review);
      setComments(response.data.comments || []);
    } catch (err) {
      console.error('Failed to load review:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading review..." />;
  if (!review) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center 
                    justify-center">
      <div className="text-center">
        <p className="text-gray-400 mb-4">Review not found</p>
        <Link to="/dashboard" className="text-blue-400">← Back to dashboard</Link>
      </div>
    </div>
  );

  // Score colour
  const scoreColour = review.score >= 8 ? 'text-green-400'
                    : review.score >= 5 ? 'text-yellow-400'
                    : 'text-red-400';

  // Filter comments by severity
  const filteredComments = filter === 'all'
    ? comments
    : comments.filter(c => c.severity === filter);

  // Count by severity
  const counts = comments.reduce((acc, c) => {
    acc[c.severity] = (acc[c.severity] || 0) + 1;
    return acc;
  }, {});

  const result = review.review_result
    ? (typeof review.review_result === 'string'
        ? JSON.parse(review.review_result)
        : review.review_result)
    : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Back link */}
        <Link to="/dashboard"
          className="text-gray-500 hover:text-gray-300 text-sm mb-6 
                     inline-flex items-center gap-1 transition-colors">
          ← Back to Dashboard
        </Link>

        {/* Review header */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-blue-400">PR #{review.pr_number}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono
                  ${review.status === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {review.status}
                </span>
                {review.cached && (
                  <span className="text-xs px-2 py-0.5 rounded font-mono 
                                   bg-purple-500/20 text-purple-400">
                    ⚡ cached
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white">
                {review.pr_title || 'Untitled PR'}
              </h1>
              <p className="text-gray-500 text-xs font-mono mt-1">
                Reviewed by {review.model_used} · {' '}
                {review.processing_time_ms === 0
                  ? 'instant (cached)'
                  : `${(review.processing_time_ms / 1000).toFixed(1)}s`}
              </p>
            </div>

            {/* Score */}
            <div className="text-center">
              <div className={`text-4xl font-bold font-mono ${scoreColour}`}>
                {review.score ?? '—'}
              </div>
              <div className="text-gray-500 text-xs">/ 10</div>
            </div>
          </div>

          {/* Summary */}
          {result?.summary && (
            <div className="bg-gray-800/50 rounded-xl p-4 text-sm 
                            text-gray-300 leading-relaxed">
              {result.summary}
            </div>
          )}

          {/* Severity counts */}
          <div className="flex gap-3 mt-4 flex-wrap">
            {['critical','high','medium','low','info'].map(sev => (
              counts[sev] ? (
                <div key={sev}
                  className="flex items-center gap-1.5">
                  <SeverityBadge severity={sev} />
                  <span className="text-gray-400 text-sm">{counts[sev]}</span>
                </div>
              ) : null
            ))}
          </div>
        </div>

        {/* Positives */}
        {result?.positives?.length > 0 && (
          <div className="bg-green-500/5 border border-green-500/20 
                          rounded-2xl p-5 mb-6">
            <h3 className="text-green-400 font-medium text-sm mb-3 flex items-center gap-2">
              ✓ What was done well
            </h3>
            <ul className="space-y-1">
              {result.positives.map((p, i) => (
                <li key={i} className="text-gray-300 text-sm flex gap-2">
                  <span className="text-green-500 mt-0.5">·</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues */}
        {comments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Issues
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredComments.length})
                </span>
              </h2>

              {/* Filter buttons */}
              <div className="flex gap-1">
                {['all', 'critical', 'high', 'medium', 'low', 'info'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1 rounded-full font-mono transition-colors
                      ${filter === f
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 hover:text-gray-300 border border-gray-800'}`}>
                    {f}
                    {f !== 'all' && counts[f] ? ` (${counts[f]})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredComments.map((comment, i) => (
                <div key={comment.id || i}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5
                             hover:border-gray-700 transition-colors">

                  {/* Issue header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={comment.severity} />
                      {comment.category && (
                        <span className="text-xs font-mono text-gray-500 
                                         bg-gray-800 px-2 py-0.5 rounded">
                          {comment.category}
                        </span>
                      )}
                      {comment.cwe_reference && (
                        <span className="text-xs font-mono text-orange-400 
                                         bg-orange-500/10 px-2 py-0.5 rounded 
                                         border border-orange-500/20">
                          {comment.cwe_reference}
                        </span>
                      )}
                    </div>
                    {comment.file_path && (
                      <span className="text-xs font-mono text-gray-500 shrink-0">
                        {comment.file_path}
                        {comment.line_number && `:${comment.line_number}`}
                      </span>
                    )}
                  </div>

                  {/* Comment */}
                  <p className="text-gray-200 text-sm leading-relaxed mb-3">
                    {comment.comment}
                  </p>

                  {/* Suggestion */}
                  {comment.suggestion && (
                    <div className="bg-blue-500/5 border border-blue-500/20 
                                    rounded-xl p-3">
                      <p className="text-xs font-mono text-blue-400 mb-1">
                        Suggestion
                      </p>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {comment.suggestion}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {comments.length === 0 && review.status === 'completed' && (
          <div className="bg-green-500/5 border border-green-500/20 
                          rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-400 font-medium">No issues found</p>
            <p className="text-gray-500 text-sm mt-1">
              This PR looks clean to the AI reviewer
            </p>
          </div>
        )}
      </div>
    </div>
  );
}