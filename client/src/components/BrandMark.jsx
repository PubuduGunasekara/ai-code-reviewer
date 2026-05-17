export default function BrandMark({ size = "md" }) {
  const dimensions = size === "lg" ? "h-14 w-14" : "h-9 w-9";

  return (
    <span
      className={`${dimensions} logo-mark flex items-center justify-center`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="h-full w-full">
        <defs>
          <linearGradient id="markGradient" x1="6" x2="42" y1="7" y2="41">
            <stop offset="0" stopColor="#13c8ff" />
            <stop offset="0.48" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#ff6b6b" />
          </linearGradient>
        </defs>
        <rect
          x="5"
          y="5"
          width="38"
          height="38"
          rx="12"
          fill="url(#markGradient)"
        />
        <path
          d="M19 16L12 24L19 32"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="M29 16L36 24L29 32"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="M21.5 25.5L24.5 28.5L31 20.5"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
    </span>
  );
}
