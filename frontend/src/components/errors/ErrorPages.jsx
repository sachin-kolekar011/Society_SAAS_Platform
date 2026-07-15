export function NotFoundPage() {
  return <ErrorPage code="404" title="Page not found" description="This page doesn't exist, or the link is broken." />;
}

export function ForbiddenPage() {
  return <ErrorPage code="403" title="Access denied" description="You don't have permission to view this page." />;
}

export function ServerErrorPage() {
  return <ErrorPage code="500" title="Something went wrong" description="Please try again in a moment." />;
}

function ErrorPage({ code, title, description }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-sm text-gray-400 mb-2">{code}</p>
      <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">{title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}
