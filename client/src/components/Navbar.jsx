import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandMark from "./BrandMark";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav className="nav-shell sticky top-0 z-20">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-3">
          <BrandMark />
          <div>
            <span className="block text-sm font-semibold tracking-tight text-[var(--text)]">
              AI Code Reviewer
            </span>
            <span className="faint-text block text-xs">Review workspace</span>
          </div>
        </Link>

        {user && (
          <div className="order-3 flex w-full items-center gap-2 sm:order-none sm:w-auto">
            <Link
              to="/dashboard"
              className="btn-secondary flex-1 px-3 py-2 sm:flex-none"
            >
              Dashboard
            </Link>
            <Link
              to="/repositories"
              className="btn-secondary flex-1 px-3 py-2 sm:flex-none"
            >
              Repositories
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <>
              <img
                src={user.avatar_url}
                alt={user.github_username}
                className="h-9 w-9 flex-shrink-0 rounded-full border border-[var(--line)]"
              />
              <span className="faint-text hidden text-sm font-medium sm:inline">
                {user.github_username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary px-3 py-2 text-xs"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
