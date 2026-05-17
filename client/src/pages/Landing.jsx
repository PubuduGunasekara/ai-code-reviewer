import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppFooter from "../components/AppFooter";
import BrandMark from "../components/BrandMark";
import ThemeToggle from "../components/ThemeToggle";

const reviewSignals = [
  { label: "Security", value: "2 findings", tone: "bg-[var(--rose)]" },
  { label: "Maintainability", value: "4 notes", tone: "bg-[var(--accent)]" },
  { label: "Performance", value: "1 note", tone: "bg-[var(--mint)]" },
];

export default function Landing() {
  const { user, loading, login } = useAuth();

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <main className="app-bg relative overflow-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-sm font-semibold tracking-tight">
              AI Code Reviewer
            </p>
            <p className="faint-text text-xs">Pull request signal</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-6xl items-center gap-10 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="max-w-2xl">
          <div className="mb-6 flex items-center gap-3">
            <BrandMark size="lg" />
            <span className="status-pill text-[var(--text-soft)]">
              Review workspace
            </span>
          </div>

          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-6xl">
            Cleaner pull request reviews.
          </h1>
          <p className="muted-text mt-5 max-w-xl text-base leading-7 sm:text-lg">
            A focused review desk for pull request summaries, severity signals,
            security notes, and cached results.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={login} className="btn-primary">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.34-3.79-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 .1 2.63.71 3.27-.45.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.7 10.7 0 0 1 5.64 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.69.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.04.76 2.1v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
              </svg>
              Continue with GitHub
            </button>
          </div>
        </div>

        <div className="code-window overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--rose)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--amber)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--mint)]" />
            </div>
            <span className="faint-text text-xs font-medium uppercase tracking-[0.16em]">
              PR review
            </span>
          </div>

          <div className="p-4 sm:p-6">
            <div className="mb-6 grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--line)] pb-5">
              <div>
                <p className="faint-text text-xs uppercase tracking-[0.16em]">
                  Request
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">
                  Refactor authentication flow
                </h2>
              </div>
              <div className="text-right">
                <p className="text-4xl font-semibold text-[var(--accent)]">
                  8.7
                </p>
                <p className="faint-text text-xs">score</p>
              </div>
            </div>

            <div className="space-y-3">
              {reviewSignals.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} />
                  <span className="text-sm font-medium text-[var(--text)]">
                    {item.label}
                  </span>
                  <span className="faint-text text-sm">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="surface-soft mt-6 p-4">
              <p className="faint-text mb-2 text-xs uppercase tracking-[0.16em]">
                Summary
              </p>
              <p className="muted-text text-sm leading-6">
                Clear direction, a few guardrail fixes, and one high impact
                security note before merge.
              </p>
            </div>
          </div>
        </div>
      </section>
      <AppFooter />
    </main>
  );
}
