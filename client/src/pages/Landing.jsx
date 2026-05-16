import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Landing() {
  const { user, loading, login } = useAuth();

  // Already logged in → skip landing, go straight to dashboard
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center 
                    justify-center px-4">

      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),
                      linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]
                      bg-[size:48px_48px] pointer-events-none" />

      <div className="relative text-center max-w-2xl">
        {/* Icon */}
        <div className="text-6xl mb-6">🤖</div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white 
                       tracking-tight mb-4">
          AI Code Reviewer
        </h1>

        <p className="text-gray-400 text-lg mb-3 leading-relaxed">
          GPT-4o powered pull request reviews.
        </p>
        <p className="text-gray-500 text-sm mb-10 font-mono">
          Inline comments · Severity scores · Security analysis · Redis caching
        </p>

        {/* Login button */}
        <button
          onClick={login}
          className="inline-flex items-center gap-3 bg-white text-gray-900 
                     px-6 py-3 rounded-full font-semibold text-sm 
                     hover:bg-gray-100 transition-colors shadow-lg
                     hover:shadow-xl hover:-translate-y-0.5 transform transition-all">
          {/* GitHub logo */}
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.34-3.79-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 .1 2.63.71 3.27-.45.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.7 10.7 0 0 1 5.64 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.69.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.04.76 2.1v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
          </svg>
          Continue with GitHub
        </button>

        {/* Tech stack pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-10">
          {['Node.js', 'PostgreSQL', 'Redis', 'GPT-4o', 'OAuth 2.0'].map(tech => (
            <span key={tech}
              className="text-xs font-mono px-3 py-1 rounded-full 
                         border border-gray-800 text-gray-500">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}