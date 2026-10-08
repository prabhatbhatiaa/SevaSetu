import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowUpRight, ClipboardList, Plus, Star } from 'lucide-react';
import { Avatar, Button, EmptyState, PageHeader, StatusBadge, UrgencyBadge } from '../../components/ui';
import { DonutChart } from '../../components/charts';
import { Panel, PanelLink } from '../../components/dashboard/Panel';
import { StatCard, StatGrid } from '../../components/dashboard/StatCard';
import { CategoryLabel } from '../../components/requests/RequestCard';
import { RequestProgress } from '../../components/requests/RequestProgress';
import { MatchResultsModal } from '../../components/requests/MatchResultsModal';
import { ReviewModal } from '../../components/reviews/ReviewModal';
import { RequestsMap } from '../../components/maps/RequestsMap';
import api from '../../lib/api';
import { firstName, greeting, pluralize, timeAgo } from '../../lib/format';
import { REQUESTS_CHANGED_EVENT, useFetch, useWindowEvent } from '../../lib/hooks';
import { DashboardSkeleton, todayLabel } from '../../components/dashboard/DashboardSkeleton';

const SHORTCUTS = [
  { label: 'Browse volunteers', to: '/dashboard/volunteers' },
  { label: 'Explore the community', to: '/requests/explore' },
  { label: 'See community impact', to: '/dashboard/impact' },
];

async function loadMemberDashboard(userId) {
  const [requests, reviews] = await Promise.all([
    api.get('/requests', { params: { mine: true, limit: 50 } }),
    api.get('/reviews', { params: { requesterId: userId, limit: 50 } }),
  ]);
  const reviewedRequestIds = new Set(reviews.data.data.map((review) => review.request?._id ?? review.request));
  return { requests: requests.data.data, reviewedRequestIds };
}

function ActiveRequestRow({ request, onFindVolunteers }) {
  const volunteer = request.assignedVolunteer;

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <CategoryLabel category={request.category} />
          <Link
            to={`/dashboard/requests/${request._id}`}
            className="mt-2 block truncate text-[15px] font-medium tracking-tight hover:underline hover:underline-offset-4"
          >
            {request.title}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={request.status} />
            <UrgencyBadge urgency={request.urgency} />
            <span className="text-xs text-subtle">{timeAgo(request.createdAt)}</span>
          </div>
        </div>
        {request.status === 'PENDING' && (
          <Button size="sm" onClick={() => onFindVolunteers(request)}>
            Find volunteers
          </Button>
        )}
      </div>

      <div className="mt-5">
        <RequestProgress status={request.status} />
      </div>

      {volunteer && (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-muted">
          <Avatar name={volunteer.name} size={22} />
          {request.status === 'ASSIGNED'
            ? `Waiting for ${firstName(volunteer.name)} to accept`
            : `${volunteer.name} is helping you`}
        </p>
      )}
    </li>
  );
}

export default function MemberDashboard({ user }) {
  const { openCreateRequest } = useOutletContext();
  const [matchingRequest, setMatchingRequest] = useState(null);
  const [reviewingRequest, setReviewingRequest] = useState(null);

  const { data, loading, reload } = useFetch(() => loadMemberDashboard(user._id), [user._id]);
  useWindowEvent(REQUESTS_CHANGED_EVENT, reload);

  if (loading && !data) return <DashboardSkeleton />;

  const requests = data?.requests ?? [];
  const countOf = (...statuses) => requests.filter((request) => statuses.includes(request.status)).length;
  const active = requests.filter((request) => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(request.status));
  const awaitingReview = requests.filter(
    (request) =>
      request.status === 'COMPLETED' && request.assignedVolunteer && !data.reviewedRequestIds.has(request._id),
  );

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
        description={
          active.length
            ? `You have ${pluralize(active.length, 'active request')}.`
            : 'Need a hand with something? Post a request and we’ll find the right person.'
        }
        actions={
          <Button variant="primary" onClick={openCreateRequest}>
            <Plus className="h-4 w-4" /> Ask for help
          </Button>
        }
      />

      <StatGrid>
        <StatCard label="Requests posted" value={requests.length} />
        <StatCard label="Waiting for a volunteer" value={countOf('PENDING', 'ASSIGNED')} />
        <StatCard label="In progress" value={countOf('IN_PROGRESS')} />
        <StatCard label="Completed" value={countOf('COMPLETED')} />
      </StatGrid>

      {awaitingReview.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border p-5">
          <Star className="h-5 w-5 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {pluralize(awaitingReview.length, 'completed request')} waiting for your review
            </p>
            <p className="mt-0.5 truncate text-[13px] text-muted">{awaitingReview[0].title}</p>
          </div>
          <Button size="sm" variant="primary" onClick={() => setReviewingRequest(awaitingReview[0])}>
            Leave a review
          </Button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title="Active requests"
          description="Each request, from posting to done."
          action={<PanelLink to="/dashboard/requests" />}
        >
          {active.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nothing in progress"
              description="Requests you post will show up here, with live progress."
              action={
                <Button variant="primary" onClick={openCreateRequest}>
                  Ask for help
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {active.slice(0, 5).map((request) => (
                <ActiveRequestRow key={request._id} request={request} onFindVolunteers={setMatchingRequest} />
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="At a glance">
            {requests.length ? (
              <DonutChart
                size={132}
                thickness={12}
                caption="requests"
                data={[
                  { label: 'Open', value: countOf('PENDING'), tone: 'open' },
                  { label: 'Offered', value: countOf('ASSIGNED'), tone: 'offered' },
                  { label: 'In progress', value: countOf('IN_PROGRESS'), tone: 'progress' },
                  { label: 'Completed', value: countOf('COMPLETED'), tone: 'done' },
                  { label: 'Cancelled', value: countOf('CANCELLED'), tone: 'muted' },
                ]}
              />
            ) : (
              <p className="text-sm text-muted">Your first request will show up here.</p>
            )}
          </Panel>

          <Panel title="Shortcuts">
            <ul className="-my-3 divide-y">
              {SHORTCUTS.map((shortcut) => (
                <li key={shortcut.to}>
                  <Link
                    to={shortcut.to}
                    className="flex items-center justify-between py-3 text-sm text-muted transition-colors hover:text-ink"
                  >
                    {shortcut.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {active.length > 0 && (
        <Panel className="mt-4" title="Where your requests are" description="Pins are coloured by urgency.">
          <RequestsMap requests={active} height={300} linkTo={(request) => `/dashboard/requests/${request._id}`} />
        </Panel>
      )}

      <MatchResultsModal
        request={matchingRequest}
        open={Boolean(matchingRequest)}
        onClose={() => setMatchingRequest(null)}
        onAssigned={reload}
      />
      <ReviewModal
        request={reviewingRequest}
        open={Boolean(reviewingRequest)}
        onClose={() => setReviewingRequest(null)}
        onSubmitted={reload}
      />
    </>
  );
}
