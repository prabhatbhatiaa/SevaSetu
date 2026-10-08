import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../lib/hooks';
import AdminDashboard from './AdminDashboard';
import MemberDashboard from './MemberDashboard';
import VolunteerDashboard from './VolunteerDashboard';

/** /dashboard — shows the overview for the signed-in person's role. */
export default function DashboardRouter() {
  const { user } = useAuth();
  useDocumentTitle('Dashboard');

  if (user.role === 'admin') return <AdminDashboard user={user} />;
  if (user.role === 'volunteer') return <VolunteerDashboard user={user} />;
  return <MemberDashboard user={user} />;
}
