import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import PublicLayout from '../components/layout/PublicLayout';
import AppShell from '../components/layout/AppShell';
import ProtectedRoute, { FullPageLoader } from './ProtectedRoute';

// Every page is its own chunk, so the landing page doesn't ship the dashboard.
const LandingPage = lazy(() => import('../pages/LandingPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ExploreRequestsPage = lazy(() => import('../pages/requests/ExploreRequestsPage'));
const RequestDetailsPage = lazy(() => import('../pages/requests/RequestDetailsPage'));
const ImpactAnalyticsPage = lazy(() => import('../pages/impact/ImpactAnalyticsPage'));
const DashboardRouter = lazy(() => import('../pages/dashboard/DashboardRouter'));
const RequestsPage = lazy(() => import('../pages/dashboard/RequestsPage'));
const AssignmentsPage = lazy(() => import('../pages/dashboard/AssignmentsPage'));
const VolunteersPage = lazy(() => import('../pages/dashboard/VolunteersPage'));
const ImpactPage = lazy(() => import('../pages/dashboard/ImpactPage'));
const SettingsPage = lazy(() => import('../pages/dashboard/SettingsPage'));

export function AppRoutes() {
  const { pathname } = useLocation();

  return (
    // Resets on navigation, so a page that failed to load can be left normally.
    <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<PublicLayout />}>
            <Route path="/requests/explore" element={<ExploreRequestsPage />} />
            <Route path="/requests/:id" element={<RequestDetailsPage />} />
            <Route path="/impact" element={<ImpactAnalyticsPage />} />
          </Route>

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardRouter />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="requests/:id" element={<RequestDetailsPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route
              path="volunteers"
              element={
                <ProtectedRoute roles={['community_member', 'admin']}>
                  <VolunteersPage />
                </ProtectedRoute>
              }
            />
            <Route path="impact" element={<ImpactPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="/requests/create" element={<Navigate to="/dashboard/requests?new=1" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
