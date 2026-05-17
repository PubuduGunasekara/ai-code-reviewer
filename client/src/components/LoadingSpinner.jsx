import BrandMark from "./BrandMark";

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="app-bg flex min-h-screen flex-col items-center justify-center px-4">
      <div className="relative mb-5">
        <div className="absolute inset-[-10px] rounded-full border border-[var(--line)]" />
        <div className="absolute inset-[-10px] rounded-full border border-transparent border-t-[var(--accent)] animate-spin" />
        <BrandMark size="lg" />
      </div>
      <p className="muted-text text-sm font-medium">{message}</p>
    </div>
  );
}
