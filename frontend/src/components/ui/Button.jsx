const VARIANT_CLASSES = {
  primary: 'bg-[var(--tenant-accent)] text-white hover:opacity-90',
  secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export default function Button({ variant = 'primary', isLoading, children, className = '', ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? 'Please wait…' : children}
    </button>
  );
}
