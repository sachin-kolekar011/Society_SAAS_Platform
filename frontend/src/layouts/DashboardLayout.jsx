import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ROLES } from '../constants/roles';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: [ROLES.ADMIN] },
  { to: '/complaints', label: 'Complaints', roles: [ROLES.ADMIN, ROLES.RESIDENT] },
  { to: '/notices', label: 'Notices', roles: [ROLES.ADMIN, ROLES.RESIDENT, ROLES.WATCHMAN, ROLES.MAINTENANCE_STAFF] },
  { to: '/polls', label: 'Polls', roles: [ROLES.ADMIN, ROLES.RESIDENT, ROLES.WATCHMAN, ROLES.MAINTENANCE_STAFF] },
  { to: '/billing', label: 'Billing', roles: [ROLES.ADMIN, ROLES.RESIDENT] },
  { to: '/gate/passes', label: 'Visitor passes', roles: [ROLES.RESIDENT] },
  { to: '/gate/scan', label: 'Gate scan', roles: [ROLES.WATCHMAN, ROLES.ADMIN] },
  { to: '/gate/log', label: 'Gate log', roles: [ROLES.ADMIN] },
  { to: '/sos', label: 'SOS', roles: [ROLES.RESIDENT] },
  { to: '/sos/alerts', label: 'Emergency alerts', roles: [ROLES.ADMIN, ROLES.WATCHMAN] },
  { to: '/flats', label: 'Flats', roles: [ROLES.ADMIN] },
];

export default function DashboardLayout() {
  const { user, tenant, logout } = useAuth();
  const { mode, toggle } = useTheme();

  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      <aside className="w-56 border-r border-gray-200 dark:border-gray-800 flex flex-col p-3">
        <div className="flex items-center gap-2 mb-6 px-1">
          {tenant?.logoUrl ? (
            <img src={tenant.logoUrl} alt="" className="w-6 h-6 rounded" />
          ) : (
            <div className="w-6 h-6 rounded" style={{ background: 'var(--tenant-accent, #1D9E75)' }} />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tenant?.name}</span>
        </div>

        <nav className="flex flex-col gap-0.5">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm px-3 py-2 rounded-lg ${
                  isActive
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <button onClick={toggle} className="text-xs text-left text-gray-500 dark:text-gray-400 px-3 py-2">
            {mode === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button onClick={logout} className="text-xs text-left text-gray-500 dark:text-gray-400 px-3 py-2">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
