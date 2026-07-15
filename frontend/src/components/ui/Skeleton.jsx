// Phase 8 §4: skeletons over spinners for list/card content -- reduces
// layout shift and reads as faster than a spinner at equal load time.
export default function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );
}
