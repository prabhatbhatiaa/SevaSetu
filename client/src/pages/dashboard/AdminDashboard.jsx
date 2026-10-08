import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Avatar, PageHeader, StatusBadge } from '../../components/ui';
import { BarList, DonutChart, StackedBar } from '../../components/charts';
import { Panel, PanelLink } from '../../components/dashboard/Panel';
import { StatCard, StatGrid } from '../../components/dashboard/StatCard';
import { DashboardSkeleton, todayLabel } from '../../components/dashboard/DashboardSkeleton';
import api from '../../lib/api';
import { firstName, greeting, timeAgo } from '../../lib/format';
import { useFetch } from '../../lib/hooks';

async function loadAdminDashboard() {
  const [admin, publicStats] = await Promise.all([api.get('/impact/admin/statistics'), api.get('/public/impact')]);
  return { admin: admin.data.data, publicStats: publicStats.data.data };
}

export default function AdminDashboard({ user }) {
  const { data, loading } = useFetch(loadAdminDashboard, []);

  if (loading && !data) return <DashboardSkeleton />;

  const { overview, requestsByStatus, usersByRole, topVolunteers, recentAssignments } = data.admin;
  const { summary, categories } = data.publicStats;

  const pipeline = [
    { label: 'Open', value: requestsByStatus.PENDING, tone: 'open' },
    { label: 'Offered', value: requestsByStatus.ASSIGNED, tone: 'offered' },
    { label: 'In progress', value: requestsByStatus.IN_PROGRESS, tone: 'progress' },
    { label: 'Completed', value: requestsByStatus.COMPLETED, tone: 'done' },
    { label: 'Cancelled', value: requestsByStatus.CANCELLED, tone: 'muted' },
  ];
  const largestCategory = Math.max(1, ...categories.map((item) => item.total));

  return (
    <>
      <PageHeader
        eyebrow={todayLabel()}
        title={
          <>
            {greeting()}, <em>{firstName(user.name)}</em>.
          </>
        }
        scene
        description="Requests, people, and how quickly help is arriving across the platform."
      />

      <StatGrid>
        <StatCard
          label="Total requests"
          value={overview.totalRequests}
          hint={`${summary.activeRequests} active right now`}
        />
        <StatCard
          label="Registered users"
          value={overview.totalUsers}
          hint={`${usersByRole.volunteer} volunteers · ${usersByRole.community_member} members`}
        />
        <StatCard
          label="Average time to resolve"
          // Bad timestamps in old data can produce a zero or negative average; don't show it as real.
          value={overview.averageResolutionHours > 0 ? overview.averageResolutionHours : null}
          decimals={1}
          suffix="hrs"
          hint={
            overview.averageResolutionHours > 0 ? 'From posting to completion' : 'Not enough completed requests yet'
          }
        />
        <StatCard
          label="Completion rate"
          value={summary.completionRate}
          suffix="%"
          hint={`${summary.totalReviews} reviews`}
        />
      </StatGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Panel title="Request pipeline" description="Where every request stands today." className="lg:col-span-2">
          <StackedBar data={pipeline} />
          <div className="mt-8">
            <DonutChart data={pipeline} caption="requests" />
          </div>
        </Panel>

        <Panel title="People">
          <BarList
            rows={[
              { label: 'Community members', value: usersByRole.community_member },
              { label: 'Volunteers', value: usersByRole.volunteer },
              { label: 'Administrators', value: usersByRole.admin },
            ]}
          />
          <div className="mt-8 grid grid-cols-2 border-t pt-6 text-center">
            <div>
              <p className="text-2xl font-medium tracking-tight">{summary.activeVolunteers}</p>
              <p className="mt-1 text-xs text-muted">Active volunteers</p>
            </div>
            <div>
              <p className="text-2xl font-medium tracking-tight">{summary.averageRating}</p>
              <p className="mt-1 text-xs text-muted">Average rating</p>
            </div>
          </div>
        </Panel>

        <Panel title="Top volunteers" description="By tasks completed, then rating.">
          {topVolunteers.length === 0 ? (
            <p className="text-sm text-muted">No volunteers yet.</p>
          ) : (
            <ol className="-my-3 divide-y">
              {topVolunteers.map((volunteer, index) => (
                <li key={volunteer._id} className="flex items-center gap-3 py-3">
                  <span className="index w-5">{String(index + 1).padStart(2, '0')}</span>
                  <Avatar name={volunteer.user?.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{volunteer.user?.name}</p>
                    <p className="text-xs text-muted">{volunteer.completedTasks} tasks</p>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-xs">
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    {volunteer.rating?.toFixed(1)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Categories" description="Completed out of posted." className="lg:col-span-2">
          <BarList
            rows={categories.map((item) => ({
              label: item.category,
              value: item.completed,
              max: largestCategory,
              tone: 'done',
              detail: `${item.completed} / ${item.total}`,
            }))}
          />
        </Panel>

        <Panel
          title="Recent assignments"
          description="The latest matches made on the platform."
          action={<PanelLink to="/dashboard/assignments" />}
          className="lg:col-span-3"
        >
          <div className="scrollbar-thin -mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted">
                  <th className="pb-3 font-normal">Request</th>
                  <th className="pb-3 font-normal">Volunteer</th>
                  <th className="pb-3 font-normal">Match</th>
                  <th className="pb-3 font-normal">Status</th>
                  <th className="pb-3 text-right font-normal">When</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentAssignments.map((assignment) => (
                  <tr key={assignment._id}>
                    <td className="max-w-[280px] py-3.5 pr-4">
                      <Link
                        to={`/dashboard/requests/${assignment.request?._id}`}
                        className="block truncate hover:underline hover:underline-offset-4"
                      >
                        {assignment.request?.title ?? '—'}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="flex items-center gap-2">
                        <Avatar name={assignment.volunteer?.name} size={22} />
                        {assignment.volunteer?.name}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs">{Math.round(assignment.matchScore)}%</td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge status={assignment.status} />
                    </td>
                    <td className="py-3.5 text-right text-xs text-muted">{timeAgo(assignment.createdAt)}</td>
                  </tr>
                ))}
                {recentAssignments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted">
                      No assignments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
