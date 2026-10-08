import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ListChecks } from 'lucide-react';
import {
  Avatar,
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  ScoreRing,
  SkeletonList,
  StatusBadge,
  Tabs,
  cn,
} from '../../components/ui';
import { CategoryLabel } from '../../components/requests/RequestCard';
import { FactorBreakdown } from '../../components/matching/FactorBreakdown';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { acceptOffer, completeAssignment, declineOffer } from '../../lib/assignments';
import { formatDate, formatDistance, timeAgo } from '../../lib/format';
import { useDocumentTitle, useFetch } from '../../lib/hooks';
import { useAction } from '../../lib/useAction';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'OFFERED', label: 'Offered' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DECLINED', label: 'Declined' },
];

function AssignmentRow({ assignment, isVolunteer, expanded, onToggle, pendingKey, run, reload }) {
  const request = assignment.request ?? {};
  const counterpart = isVolunteer ? request.requester : assignment.volunteer;
  const key = (action) => `${action}-${assignment._id}`;

  return (
    <li className={cn('rounded-2xl border bg-surface transition-colors', expanded && 'border-strong')}>
      <div className="flex flex-wrap items-center gap-5 p-5">
        <ScoreRing value={assignment.matchScore} size={48} />

        <div className="min-w-[220px] flex-1">
          <CategoryLabel category={request.category} />
          <Link
            to={`/dashboard/requests/${request._id}`}
            className="mt-1.5 block truncate text-[15px] font-medium tracking-tight hover:underline hover:underline-offset-4"
          >
            {request.title ?? 'Request no longer available'}
          </Link>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <StatusBadge status={assignment.status} />
            {counterpart && (
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={counterpart.name} size={18} />
                {isVolunteer ? 'For' : 'With'} {counterpart.name}
              </span>
            )}
            <span>
              {assignment.completedAt
                ? `Completed ${formatDate(assignment.completedAt)}`
                : `Offered ${timeAgo(assignment.offeredAt)}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isVolunteer && assignment.status === 'OFFERED' && (
            <>
              <Button
                size="sm"
                variant="primary"
                loading={pendingKey === key('accept')}
                onClick={() => run(key('accept'), () => acceptOffer(assignment._id), 'Offer accepted.', reload)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                loading={pendingKey === key('decline')}
                onClick={() => run(key('decline'), () => declineOffer(assignment._id), 'Offer declined.', reload)}
              >
                Decline
              </Button>
            </>
          )}
          {assignment.status === 'ACCEPTED' && (
            <Button
              size="sm"
              variant="primary"
              loading={pendingKey === key('complete')}
              onClick={() => run(key('complete'), () => completeAssignment(assignment._id), 'Marked as done.', reload)}
            >
              Mark as done
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label="Show match details"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="animate-fade-in border-t px-5 py-5">
          <p className="mb-4 text-xs text-muted">
            Why this match · {formatDistance(assignment.scoreBreakdown?.calculatedDistanceKm)} apart
          </p>
          <div className="max-w-xl">
            <FactorBreakdown breakdown={assignment.scoreBreakdown} />
          </div>
          {assignment.notes && <p className="mt-5 text-sm text-muted">“{assignment.notes}”</p>}
        </div>
      )}
    </li>
  );
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const isVolunteer = user.role === 'volunteer';
  useDocumentTitle(isVolunteer ? 'My tasks' : 'Assignments');

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const { pendingKey, run } = useAction();

  useEffect(() => setPage(1), [status]);

  const { data, loading, reload } = useFetch(async () => {
    const params = { page, limit: 10 };
    if (status) params.status = status;
    return (await api.get('/assignments', { params })).data;
  }, [status, page]);

  const assignments = data?.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow={isVolunteer ? 'Your commitments' : 'Matches and offers'}
        title={
          isVolunteer ? (
            <>
              My <em>tasks</em>
            </>
          ) : (
            <>
              Your <em>assignments</em>
            </>
          )
        }
        description={
          isVolunteer
            ? 'Offers to answer, tasks in progress, and everything you’ve completed.'
            : 'Every volunteer assignment connected to your requests.'
        }
      />
      <Tabs options={STATUS_TABS} value={status} onChange={setStatus} className="mb-8" />

      {loading && !data ? (
        <SkeletonList count={4} className="h-28" />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing here yet"
          description={
            isVolunteer
              ? 'Accept a task from Opportunities and it will appear here.'
              : 'When a request is offered to a volunteer, it’s tracked here.'
          }
          action={<Button to="/dashboard/requests">{isVolunteer ? 'Browse opportunities' : 'Go to requests'}</Button>}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {assignments.map((assignment) => (
              <AssignmentRow
                key={assignment._id}
                assignment={assignment}
                isVolunteer={isVolunteer}
                expanded={expandedId === assignment._id}
                onToggle={() => setExpandedId(expandedId === assignment._id ? null : assignment._id)}
                pendingKey={pendingKey}
                run={run}
                reload={reload}
              />
            ))}
          </ul>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}
