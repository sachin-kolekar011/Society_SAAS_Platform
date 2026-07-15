// Phase 8 §4 pattern: name the space, one-line explanation, verb-first CTA.
// Never "There is currently no data to display."
export default function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-4 text-sm font-medium text-[var(--tenant-accent)]">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
