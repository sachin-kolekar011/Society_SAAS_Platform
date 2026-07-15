export default function Input({ label, error, id, ...props }) {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-[var(--tenant-accent)]
          ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
