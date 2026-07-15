import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ForbiddenPage } from '../components/errors/ErrorPages';

// Wraps a route element: redirects unauthenticated users to /login, and
// renders 403 (not a redirect) for an authenticated user hitting a route
// their role doesn't cover -- e.g. a resident navigating straight to
// /dashboard by URL. A redirect there would be confusing; a clear 403
// tells them plainly this isn't for their role.
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // AuthProvider's silent refresh is still resolving

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <ForbiddenPage />;
  }

  return children;
}
