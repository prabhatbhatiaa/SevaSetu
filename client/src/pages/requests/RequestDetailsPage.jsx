import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Mail, MapPin, Phone, SearchX } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Modal,
  Skeleton,
  Stars,
  StatusBadge,
  Textarea,
  UrgencyBadge,
  cn,
} from '../../components/ui';
import { CategoryLabel } from '../../components/requests/RequestCard';
import { RequestTimeline } from '../../components/requests/RequestProgress';
import { MatchResultsModal } from '../../components/requests/MatchResultsModal';
import { ReviewModal } from '../../components/reviews/ReviewModal';
import { LocationViewer } from '../../components/maps/LocationViewer';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { acceptOffer, cancelRequest, claimRequest, completeAssignment, declineOffer } from '../../lib/assignments';
import { TIME_SLOTS } from '../../lib/constants';
import { formatDate, timeAgo } from '../../lib/format';
import { useDocumentTitle, useFetch } from '../../lib/hooks';
import { useAction } from '../../lib/useAction';

function PersonCard({ title, person }) {
  if (!person) return null;

  return (
    <section className="rounded-2xl border p-5">
      <h2 className="eyebrow mb-4">{title}</h2>
      <div className="flex items-center gap-3">
        <Avatar name={person.name} src={person.avatar} size={40} />
        <div className="min-w-0">
          <p className="truncate font-medium">{person.name}</p>
          {person.rating != null && (
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <Stars value={person.rating} size={11} />
              {Number(person.rating).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      {(person.email || person.phone) && (
        <div className="mt-4 space-y-2 border-t pt-4 text-sm text-muted">
          {person.email && (
            <a href={`mailto:${person.email}`} className="flex items-center gap-2 transition-colors hover:text-ink">
              <Mail className="h-3.5 w-3.5" /> {person.email}
            </a>
          )}
          {person.phone && (
            <a href={`tel:${person.phone}`} className="flex items-center gap-2 transition-colors hover:text-ink">
              <Phone className="h-3.5 w-3.5" /> {person.phone}
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-sm">{value}</p>
      </div>
    </div>
  );
}

/** Explains why there is nothing to do, for people who can't act on the request. */
function statusNote(request) {
  if (request.status === 'COMPLETED') return 'This request has been completed.';
  if (request.status === 'CANCELLED') {
    return `This request was cancelled${request.cancellationReason ? ` — ${request.cancellationReason}` : ''}.`;
  }
  if (request.status === 'IN_PROGRESS') return 'A volunteer is already helping with this.';
  if (request.status === 'ASSIGNED') return 'This has been offered to a volunteer.';
  return null;
}

export default function RequestDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const insideDashboard = pathname.startsWith('/dashboard');

  const [showMatches, setShowMatches] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const { pendingKey, run } = useAction();

  const requestQuery = useFetch(async () => (await api.get(`/requests/${id}`)).data.data, [id]);
  const request = requestQuery.data;
  useDocumentTitle(request?.title ?? 'Request');

  // Only people involved in the request can see its assignments. The server
  // ignores `requestId` for community members (it returns assignments for all
  // of their requests), so always narrow the list down to this request here.
  const assignmentsQuery = useFetch(async () => {
    if (!user) return [];
    const response = await api.get('/assignments', { params: { requestId: id, limit: 50 } });
    return response.data.data.filter((assignment) => (assignment.request?._id ?? assignment.request) === id);
  }, [id, user?._id]);

  const reviewQuery = useFetch(async () => {
    if (request?.status !== 'COMPLETED') return null;
    return (await api.get(`/reviews/request/${id}`)).data.data;
  }, [id, request?.status]);

  const refresh = () => {
    requestQuery.reload();
    assignmentsQuery.reload();
    reviewQuery.reload();
  };

  const backLink = insideDashboard ? '/dashboard/requests' : '/requests/explore';
  const wrapperClass = cn('mx-auto max-w-[1180px]', !insideDashboard && 'container-page');

  if (requestQuery.loading && !request) {
    return (
      <div className={wrapperClass}>
        <Skeleton className="h-10 w-2/3" />
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (requestQuery.error || !request) {
    return (
      <div className={wrapperClass}>
        <EmptyState
          icon={SearchX}
          title="We couldn’t find that request"
          description="It may have been removed, or the link might be wrong."
          action={<Button to={backLink}>Back to requests</Button>}
        />
      </div>
    );
  }

  const isOwner = user && request.requester?._id === user._id;
  const isAdmin = user?.role === 'admin';
  const isAssignedVolunteer = user && request.assignedVolunteer?._id === user._id;
  const activeAssignment = (assignmentsQuery.data ?? []).find((assignment) =>
    ['OFFERED', 'ACCEPTED'].includes(assignment.status),
  );
  const review = reviewQuery.data;
  const isOpen = request.status === 'PENDING';
  const canManage = isOwner || isAdmin;

  const can = {
    signInToHelp: !user && isOpen,
    claim: user?.role === 'volunteer' && isOpen,
    respond: activeAssignment?.status === 'OFFERED' && (isAssignedVolunteer || isAdmin),
    complete: activeAssignment?.status === 'ACCEPTED' && (isAssignedVolunteer || canManage),
    findVolunteers: canManage && isOpen,
    review: isOwner && request.status === 'COMPLETED' && request.assignedVolunteer && !review && !reviewQuery.loading,
    cancel: canManage && ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(request.status),
  };
  const hasActions = Object.values(can).some(Boolean);
  const timeSlot = TIME_SLOTS.find((slot) => slot.value === request.preferredTime);

  const submitCancel = async () => {
    const result = await run(
      'cancel',
      () => cancelRequest(request._id, cancelReason.trim()),
      'Request cancelled.',
      refresh,
    );
    if (result) setShowCancel(false);
  };

  return (
    <div className={wrapperClass}>
      <Link
        to={backLink}
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to requests
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article>
          <CategoryLabel category={request.category} />
          <h1 className="heading mt-4 text-3xl sm:text-[44px]">{request.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <StatusBadge status={request.status} />
            <UrgencyBadge urgency={request.urgency} />
            <span className="text-xs text-subtle">Posted {timeAgo(request.createdAt)}</span>
          </div>

          <p className="mt-10 whitespace-pre-line text-[17px] leading-relaxed text-ink/90">{request.description}</p>

          {request.requiredSkills?.length > 0 && (
            <div className="mt-10">
              <h2 className="eyebrow mb-3">Skills that would help</h2>
              <div className="flex flex-wrap gap-2">
                {request.requiredSkills.map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 grid gap-6 border-y py-6 sm:grid-cols-3">
            <Fact
              icon={MapPin}
              label="Where"
              value={
                [request.location?.address, request.location?.city].filter(Boolean).join(', ') || 'Pinned on the map'
              }
            />
            <Fact
              icon={Calendar}
              label="Preferred date"
              value={request.preferredDate ? formatDate(request.preferredDate) : 'Any day'}
            />
            <Fact
              icon={Clock}
              label="Preferred time"
              value={timeSlot ? `${timeSlot.label} (${timeSlot.hours})` : request.preferredTime || 'Any time'}
            />
          </div>

          <div className="mt-10">
            <LocationViewer request={request} height={300} />
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border bg-surface p-5">
            <h2 className="eyebrow mb-4">What happens next</h2>

            <div className="space-y-2.5">
              {can.signInToHelp && (
                <>
                  <p className="text-sm text-muted">Sign in as a volunteer to take this on.</p>
                  <Button variant="primary" className="w-full" to="/login" state={{ from: { pathname } }}>
                    Sign in to help
                  </Button>
                </>
              )}

              {can.claim && (
                <Button
                  variant="primary"
                  className="w-full"
                  loading={pendingKey === 'claim'}
                  onClick={() =>
                    run('claim', () => claimRequest(request._id), 'Task accepted. It’s now in progress.', refresh)
                  }
                >
                  I can help with this
                </Button>
              )}

              {can.respond && (
                <>
                  <p className="text-sm text-muted">You’ve been offered this task.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      loading={pendingKey === 'accept'}
                      onClick={() => run('accept', () => acceptOffer(activeAssignment._id), 'Offer accepted.', refresh)}
                    >
                      Accept
                    </Button>
                    <Button
                      loading={pendingKey === 'decline'}
                      onClick={() =>
                        run('decline', () => declineOffer(activeAssignment._id), 'Offer declined.', refresh)
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </>
              )}

              {can.complete && (
                <Button
                  variant="primary"
                  className="w-full"
                  loading={pendingKey === 'complete'}
                  onClick={() =>
                    run(
                      'complete',
                      () => completeAssignment(activeAssignment._id),
                      'Marked as done. Thank you!',
                      refresh,
                    )
                  }
                >
                  Mark as done
                </Button>
              )}

              {can.findVolunteers && (
                <Button variant="primary" className="w-full" onClick={() => setShowMatches(true)}>
                  Find volunteers
                </Button>
              )}

              {can.review && (
                <Button variant="primary" className="w-full" onClick={() => setShowReview(true)}>
                  Rate your volunteer
                </Button>
              )}

              {can.cancel && (
                <Button variant="danger" className="w-full" onClick={() => setShowCancel(true)}>
                  Cancel request
                </Button>
              )}

              {!hasActions && (
                <p className="text-sm text-muted">{statusNote(request) ?? 'Nothing to do here right now.'}</p>
              )}

              {review && (
                <div className="mt-2 border-t pt-4">
                  <Stars value={review.rating} size={14} />
                  {review.feedback && <p className="mt-2 text-sm leading-relaxed">“{review.feedback}”</p>}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="eyebrow mb-5">Progress</h2>
            <RequestTimeline request={request} />
          </section>

          <PersonCard title="Requested by" person={request.requester} />
          <PersonCard title="Volunteer" person={request.assignedVolunteer} />
        </aside>
      </div>

      <MatchResultsModal
        request={request}
        open={showMatches}
        onClose={() => setShowMatches(false)}
        onAssigned={refresh}
      />
      <ReviewModal request={request} open={showReview} onClose={() => setShowReview(false)} onSubmitted={refresh} />
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel this request?"
        description="Volunteers will no longer see it, and any offer will be withdrawn."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCancel(false)}>
              Keep it
            </Button>
            <Button variant="danger" loading={pendingKey === 'cancel'} onClick={submitCancel}>
              Cancel request
            </Button>
          </>
        }
      >
        <Textarea
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          maxLength={300}
          placeholder="Reason (optional)"
          aria-label="Reason for cancelling"
        />
      </Modal>
    </div>
  );
}
