import BrandMark from "./BrandMark";

const technologies = [
  "React",
  "Node.js",
  "Express",
  "PostgreSQL",
  "Redis",
  "OpenAI",
  "GitHub OAuth",
];

export default function AppFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <div className="footer-shell overflow-hidden">
        <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[1.08fr_0.92fr] lg:p-8">
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="faint-text text-xs font-semibold uppercase tracking-[0.18em]">
                  Project signature
                </p>
                <p className="text-sm font-semibold text-[var(--text)]">
                  Co-op preparation build
                </p>
              </div>
            </div>

            <p className="faint-text text-xs font-semibold uppercase tracking-[0.18em]">
              Designed and built by
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
              Pubudu Gunasekara
            </h2>
            <p className="muted-text mt-3 max-w-2xl text-sm leading-6">
              A full-stack AI code review workspace created as part of my co-op
              prep, focused on practical engineering workflows, clean product
              thinking, and thoughtful interface design.
            </p>
          </div>

          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="faint-text mb-3 text-xs font-semibold uppercase tracking-[0.18em]">
                Built with
              </p>
              <div className="flex flex-wrap gap-2">
                {technologies.map((technology) => (
                  <span
                    key={technology}
                    className="status-pill text-[var(--text-soft)]"
                  >
                    {technology}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-start">
              <a
                href="https://www.linkedin.com/in/pubudugunasekera/"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary w-full sm:w-auto"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-xs font-bold text-white">
                  in
                </span>
                Connect on LinkedIn
              </a>
              <p className="faint-text text-xs">
                AI Code Reviewer | Portfolio project
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
