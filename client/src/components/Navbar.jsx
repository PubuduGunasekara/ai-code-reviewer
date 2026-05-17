import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-blue-400 font-mono text-lg">🤖</span>
          <span className="font-semibold text-white text-sm">
            AI Code Reviewer
          </span>
        </Link>

        {/* Nav links */}
        {user && (
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/repositories"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Repositories
            </Link>
          </div>
        )}

        {/* User + logout */}
        {user && (
          <div className="flex items-center gap-3">
            <img
              src={user.avatar_url}
              alt={user.github_username}
              className="w-7 h-7 rounded-full border border-gray-700 flex-shrink-0"
            />
            {/* Hide username on very small screens */}
            <span className="text-gray-400 text-sm font-mono hidden sm:inline">
              {user.github_username}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 
               rounded border border-gray-800 hover:border-red-500/30 flex-shrink-0"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
