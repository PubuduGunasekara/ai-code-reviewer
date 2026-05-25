import BrandMark from "./BrandMark";

const stackGroups = [
  {
    label: "AI / backend",
    colorClass: "text-[var(--violet)]",
    bgClass: "bg-violet-50 dark:bg-violet-950/40",
    borderClass: "border-violet-200 dark:border-violet-800",
    chips: ["GPT-4o mini", "OpenAI SDK", "Node.js", "Express"],
  },
  {
    label: "Data",
    colorClass: "text-[var(--mint)]",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    chips: ["PostgreSQL", "Redis", "GitHub OAuth"],
  },
  {
    label: "Frontend",
    colorClass: "text-[var(--accent)]",
    bgClass: "bg-blue-50 dark:bg-blue-950/40",
    borderClass: "border-blue-200 dark:border-blue-800",
    chips: ["React 18", "Vite", "Tailwind CSS"],
  },
  {
    label: "Infrastructure",
    colorClass: "text-[var(--amber)]",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    borderClass: "border-amber-200 dark:border-amber-800",
    chips: ["Docker", "AWS EC2", "AWS Amplify", "GitHub Actions"],
  },
];

const contactLinks = [
  {
    label: "LinkedIn",
    value: "linkedin.com/in/pubudugunasekera",
    href: "https://www.linkedin.com/in/pubudugunasekera/",
    iconBg: "bg-[#0A66C2]",
    icon: (
      <span className="text-xs font-bold text-white leading-none">in</span>
    ),
  },
  {
    label: "GitHub",
    value: "PubuduGunasekara",
    href: "https://github.com/PubuduGunasekara",
    iconBg: "bg-[#1b1f24]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
        <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.34-3.79-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63.71 3.27-.45.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.7 10.7 0 0 1 5.64 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.69.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.04.76 2.1v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
      </svg>
    ),
  },
  {
    label: "Email",
    value: "pubudupguna@gmail.com",
    href: "mailto:pubudupguna@gmail.com",
    iconBg: "bg-[#EA4335]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
        <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
      </svg>
    ),
  },
];

export default function AppFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <div className="footer-shell overflow-hidden">
        <div className="p-5 sm:p-6 lg:p-8">

          {/* ── THREE-COLUMN GRID ── */}
          <div className="grid gap-8 lg:grid-cols-3">

            {/* COL 1 — Identity */}
            <div className="min-w-0">
              {/* Brand + availability status */}
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <BrandMark />
                <span className="flex items-center gap-2 rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/10 px-3 py-1 text-xs font-semibold text-[var(--mint)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--mint)] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--mint)]" />
                  </span>
                  Seeking co-op · Jan 2027
                </span>
              </div>

              {/* Name */}
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
                Pubudu Gunasekara
              </h2>

              {/* University */}
              <p className="mt-2 text-sm font-medium text-[var(--text-soft)]">
                MS Computer Science · Northeastern University
              </p>
              <p className="text-xs text-[var(--text-faint)]">
                Khoury College · Silicon Valley · Expected 2028
              </p>

              {/* Brief positioning */}
              <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--text-soft)]">
                Full-stack engineer focused on AI-integrated systems, practical
                engineering workflows, and thoughtful interface design.
              </p>
            </div>

            {/* COL 2 — Contact */}
            <div className="min-w-0">
              <p className="faint-text mb-3 text-xs font-semibold uppercase tracking-[0.18em]">
                Get in touch
              </p>
              <div className="flex flex-col gap-2">
                {contactLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith("mailto") ? "_self" : "_blank"}
                    rel="noreferrer"
                    className="group flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5 transition hover:border-[var(--line-strong)]"
                  >
                    {/* Icon */}
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${link.iconBg}`}
                    >
                      {link.icon}
                    </span>
                    {/* Text */}
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-[var(--text-faint)]">
                        {link.label}
                      </span>
                      <span className="block truncate text-xs font-semibold text-[var(--text)]">
                        {link.value}
                      </span>
                    </span>
                    {/* Arrow */}
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-faint)] transition group-hover:text-[var(--text-soft)]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* COL 3 — Tech stack grouped */}
            <div className="min-w-0">
              <p className="faint-text mb-3 text-xs font-semibold uppercase tracking-[0.18em]">
                Built with
              </p>
              <div className="flex flex-col gap-4">
                {stackGroups.map((group) => (
                  <div key={group.label}>
                    <p
                      className={`mb-2 text-xs font-semibold uppercase tracking-[0.12em] ${group.colorClass}`}
                    >
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.chips.map((chip) => (
                        <span
                          key={chip}
                          className={`rounded-md border px-2 py-0.5 text-xs font-medium ${group.bgClass} ${group.borderClass} ${group.colorClass}`}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── BOTTOM BAR ── */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
            <p className="text-xs text-[var(--text-faint)]">
              AI Code Reviewer · Portfolio project · MIT License ·{" "}
              <span className="text-[var(--text-soft)]">
                Available for co-op January – July 2027 · San Jose, CA
              </span>
            </p>
            <a
              href="https://pubudugunasekara.github.io"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--text-faint)] underline-offset-2 hover:text-[var(--text-soft)] hover:underline"
            >
              pubudugunasekara.github.io ↗
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
