import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import ComplaintListPage from '../features/complaints/pages/ComplaintListPage';
import RaiseComplaintPage from '../features/complaints/pages/RaiseComplaintPage';
import ComplaintDetailPage from '../features/complaints/pages/ComplaintDetailPage';
import NoticeBoardPage from '../features/notices/pages/NoticeBoardPage';
import SosPage from '../features/sos/pages/SosPage';
import SosAlertsPage from '../features/sos/pages/SosAlertsPage';
import VisitorPassPage from '../features/gate/pages/VisitorPassPage';
import WatchmanGatePage from '../features/gate/pages/WatchmanGatePage';
import GateLogPage from '../features/gate/pages/GateLogPage';
import PollsPage from '../features/polls/pages/PollsPage';
import BillingPage from '../features/billing/pages/BillingPage';
import { NotFoundPage } from '../components/errors/ErrorPages';
import { ROLES } from '../constants/roles';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route
          path="/dashboard"
          element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><DashboardPage /></ProtectedRoute>}
        />
        <Route
          path="/complaints"
          element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.RESIDENT]}><ComplaintListPage /></ProtectedRoute>}
        />
        <Route
          path="/complaints/new"
          element={<ProtectedRoute allowedRoles={[ROLES.RESIDENT]}><RaiseComplaintPage /></ProtectedRoute>}
        />
        <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        <Route path="/notices" element={<NoticeBoardPage />} />
        <Route path="/polls" element={<PollsPage />} />
        <Route
          path="/billing"
          element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.RESIDENT]}><BillingPage /></ProtectedRoute>}
        />
        <Route
          path="/sos"
          element={<ProtectedRoute allowedRoles={[ROLES.RESIDENT]}><SosPage /></ProtectedRoute>}
        />
        <Route
          path="/sos/alerts"
          element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.WATCHMAN]}><SosAlertsPage /></ProtectedRoute>}
        />
        <Route
          path="/gate/passes"
          element={<ProtectedRoute allowedRoles={[ROLES.RESIDENT]}><VisitorPassPage /></ProtectedRoute>}
        />
        <Route
          path="/gate/scan"
          element={<ProtectedRoute allowedRoles={[ROLES.WATCHMAN, ROLES.ADMIN]}><WatchmanGatePage /></ProtectedRoute>}
        />
        <Route
          path="/gate/log"
          element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><GateLogPage /></ProtectedRoute>}
        />
      </Route>

      <Route path="/" element={<Navigate to="/complaints" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
