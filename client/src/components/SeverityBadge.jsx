const COLOURS = {
  critical:
    "border-red-400/50 bg-red-500/10 text-red-600 dark:text-red-300",
  high:
    "border-orange-400/45 bg-orange-400/10 text-orange-600 dark:text-orange-300",
  medium:
    "border-yellow-400/45 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300",
  low:
    "border-sky-400/45 bg-sky-400/10 text-sky-700 dark:text-sky-300",
  info:
    "border-[var(--line-strong)] bg-[var(--surface-soft)] text-[var(--text-soft)]",
};

export default function SeverityBadge({ severity }) {
  const classes = COLOURS[severity] || COLOURS.info;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${classes}`}
    >
      {severity}
    </span>
  );
}
