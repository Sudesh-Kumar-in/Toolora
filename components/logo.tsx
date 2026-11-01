/**
 * Original Toolora mark: a rounded ink tile holding three stacked
 * "tool" bars, with one cobalt bar to suggest a finished, working set.
 */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" className="fill-ink" />
      <rect x="8" y="8" width="16" height="3.5" rx="1.75" className="fill-paper" />
      <rect x="8" y="14.25" width="10" height="3.5" rx="1.75" className="fill-paper/70" />
      <rect x="8" y="20.5" width="13" height="3.5" rx="1.75" fill="#2B4EFF" />
    </svg>
  );
}
