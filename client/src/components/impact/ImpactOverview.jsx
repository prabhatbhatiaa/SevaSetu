import { BarList, DonutChart } from '../charts';
import { ScoreRing, Skeleton } from '../ui';
import { CategoryLabel } from '../requests/RequestCard';
import { StatCard, StatGrid } from '../dashboard/StatCard';
import { Panel } from '../dashboard/Panel';
import { timeAgo } from '../../lib/format';

const URGENCY_ROWS = [
  { key: 'critical', label: 'Critical', tone: 'danger' },
  { key: 'high', label: 'High', tone: 'open' },
  { key: 'medium', label: 'Medium', tone: 'progress' },
  { key: 'low', label: 'Low', tone: 'muted' },
];

const SDGS = [
  { goal: 'SDG 11', title: 'Sustainable communities', text: 'Hyper-local help, organised so nobody slips through.' },
  {
    goal: 'SDG 17',
    title: 'Partnerships for the goals',
    text: 'Neighbours, volunteers and institutions on one platform.',
  },
  { goal: 'SDG 10', title: 'Reduced inequalities', text: 'Elders and differently-abled residents reached first.' },
];

/** Renders the payload from GET /public/impact. */
export function ImpactOverview({ data, loading }) {
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const { summary, categories, urgencyDistribution, recentImpactFeed } = data;

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatCard
          label="Services completed"
          value={summary.completedServices}
          hint={`${summary.totalRequests} requests posted`}
        />
        <StatCard
          label="Active volunteers"
          value={summary.activeVolunteers}
          hint={`${summary.totalVolunteers} registered`}
        />
        <StatCard label="Community members" value={summary.communityMembers} />
        <StatCard
          label="Average rating"
          value={summary.averageRating}
          decimals={1}
          suffix="/ 5"
          hint={`From ${summary.totalReviews} reviews`}
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Requests by category"
          description="Posted, and how many were completed."
          className="lg:col-span-2"
        >
          <BarList
            rows={categories.map((item) => ({
              label: item.category,
              value: item.total,
              detail: `${item.completed} of ${item.total} completed`,
            }))}
            emptyText="No requests yet."
          />
        </Panel>

        <Panel title="Completion rate">
          <div className="flex flex-col items-center py-4 text-center">
            <ScoreRing value={summary.completionRate} size={150} stroke={6} label="complete" />
            <p className="mt-6 text-sm text-muted">{summary.activeRequests} requests open or in progress right now</p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Urgency">
          <DonutChart
            caption="requests"
            data={URGENCY_ROWS.map((row) => ({
              label: row.label,
              value: urgencyDistribution[row.key] ?? 0,
              tone: row.tone,
            }))}
          />
        </Panel>

        <Panel title="Recently completed">
          {recentImpactFeed?.length ? (
            <ul className="divide-y">
              {recentImpactFeed.map((item) => (
                <li key={item._id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="truncate text-sm">{item.title}</p>
                    <span className="shrink-0 text-xs text-subtle">{timeAgo(item.completedAt)}</span>
                  </div>
                  <CategoryLabel category={item.category} className="mt-1" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Completed requests will appear here.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {SDGS.map((sdg) => (
          <div key={sdg.goal} className="rounded-2xl border p-6">
            <p className="index">{sdg.goal}</p>
            <h3 className="mt-3 text-base font-medium tracking-tight">{sdg.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{sdg.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
