import { getRepositoryIdentity } from "../utils/repository";

export default function RepositoryBadge({ review, compact = false }) {
  const repository = getRepositoryIdentity(review);

  if (!repository.fullName) return null;

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--text)] ${
        compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
      title={repository.fullName}
    >
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-gradient-to-br from-sky-400 via-violet-400 to-rose-400" />
      <span className="truncate font-semibold">
        {repository.owner && repository.name ? (
          <>
            <span className="faint-text font-medium">{repository.owner}</span>
            <span className="faint-text font-medium"> / </span>
            <span>{repository.name}</span>
          </>
        ) : (
          repository.fullName
        )}
      </span>
      {repository.isPrivate && (
        <span className="faint-text flex-shrink-0 font-normal">private</span>
      )}
    </span>
  );
}
