import { Link } from 'react-router-dom';
import { Check, Compass } from 'lucide-react';
import { Badge, Button, EmptyState, PageHeader, ScoreRing, Switch, UrgencyBadge } from '../../components/ui';
import { Panel, PanelLink } from '../../components/dashboard/Panel';
import { StatCard, StatGrid } from '../../components/dashboard/StatCard';
import { DashboardSkeleton, todayLabel } from '../../components/dashboard/DashboardSkeleton';
import { CategoryLabel } from '../../components/requests/RequestCard';
import { FactorBreakdown } from '../../components/matching/FactorBreakdown';
import { AvailabilityGrid } from '../../components/volunteers/AvailabilityGrid';
import { RequestsMap } from '../../components/maps/RequestsMap';
import api, { getErrorMessage } from '../../lib/api';
import { acceptOffer, claimRequest, completeAssignment, declineOffer } from '../../lib/assignments';
import { firstName, formatDistance, greeting, pluralize, timeAgo } from '../../lib/format';
import { useFetch } from '../../lib/hooks';
import { useAction } from '../../lib/useAction';
import { useToast } from '../../context/ToastContext';

async function loadVolunteerDashboard() {
  const [profile, matches, assignments] = await Promise.all([
    api.get('/volunteers/me'),
    api.get('/volunteers/matched-requests', { params: { limit: 6 } }),
    api.get('/assignments', { params: { limit: 50 } }),
  ]);
  return { profile: profile.data.data, matches: matches.data.data, assignments: assignments.data.data };
}

function TaskRow({ assignment, children, detail }) {
  const request = assignment.request ?? {};
  return (
    <li className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <Link
          to={`/dashboard/requests/${request._id}`}
          className="block truncate text-[15px] font-medium tracking-tight hover:underline hover:underline-offset-4"
        >
          {request.title}
        </Link>
        <p className="mt-1 text-xs text-muted">{detail}</p>
      </div>
      <div className="flex gap-2">{children}</div>
    </li>
  );
}

function MatchRow({ match, onAccept, accepting }) {
  const { request, breakdown, explanation = [] } = match;

  return (
    <li className="py-6 first:pt-0 last:pb-0">
      <div className="flex items-start gap-5">
        <ScoreRing value={match.matchScore} size={56} label="match" />
        <div className="min-w-0 flex-1">
          <CategoryLabel category={request.category} />
          <Link
            to={`/dashboard/requests/${request._id}`}
            className="mt-1.5 block text-[15px] font-medium leading-snug tracking-tight hover:underline hover:underline-offset-4"
          >
            {request.title}
          </Link>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <UrgencyBadge urgency={request.urgency} />
            <span>{formatDistance(breakdown?.calculatedDistanceKm)} away</span>
          </div>
        </div>
        <Button size="sm" variant="primary" loading={accepting} onClick={onAccept} className="hidden sm:inline-flex">
          Accept
        </Button>
      </div>

      <div className="mt-5 sm:pl-[76px]">
        <FactorBreakdown breakdown={breakdown} compact />
        {explanation[0] && (
          <p className="mt-4 flex gap-2 text-[13px] text-muted">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-done" />
            {explanation[0]}
          </p>
        )}
        <Button size="sm" variant="primary" loading={accepting} onClick={onAccept} className="mt-4 sm:hidden">
          Accept task
        </Button>
      </div>
    </li>
  );
}

export default function VolunteerDashboard({ user }) {
  const toast = useToast();
  const { pendingKey, run } = useAction();
  const { data, loading, reload, setData } = useFetch(loadVolunteerDashboard, [user._id]);

  if (loading && !data) return <DashboardSkeleton />;

  const { profile, matches, assignments } = data;
  const offers = assignments.filter((assignment) => assignment.status === 'OFFERED');
  const inProgress = assignments.filter((assignment) => assignment.status === 'ACCEPTED');

  const toggleAvailability = async (isActive) => {
    setData({ ...data, profile: { ...profile, isActive } }); // optimistic
    try {
      await api.put('/volunteers/profile', { isActive });
      toast.info(isActive ? 'You’re visible for new matches again.' : 'Paused. You won’t be matched to new requests.');
    } catch (error) {
      toast.error(getErrorMessage(error));
      reload();
    }
  };

  let subtitle = 'You’re all caught up. New matches will appear here.';
  if (offers.length) subtitle = `${pluralize(offers.length, 'offer')} waiting for your answer.`;
  else if (matches.length) subtitle = `${pluralize(matches.length, 'open request')} near you match your skills.`;

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
        description={subtitle}
        actions={
          <div className="rounded-full border px-4 py-2">
            <Switch
              checked={Boolean(profile.isActive)}
              onChange={toggleAvailability}
              label={profile.isActive ? 'Accepting new tasks' : 'Paused'}
            />
          </div>
        }
      />

      <StatGrid>
        <StatCard
          label="Your rating"
          value={profile.rating ?? 5}
          decimals={1}
          suffix="/ 5"
          hint={pluralize(profile.ratingCount ?? 0, 'review')}
        />
        <StatCard label="Tasks completed" value={profile.completedTasks ?? 0} />
        <StatCard label="In progress" value={inProgress.length} />
        <StatCard label="Offers waiting" value={offers.length} />
      </StatGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {(offers.length > 0 || inProgress.length > 0) && (
            <Panel title="Needs your attention" description="Answer offers, and close tasks you’ve finished.">
              <ul className="divide-y">
                {offers.map((assignment) => (
                  <TaskRow
                    key={assignment._id}
                    assignment={assignment}
                    detail={`Offered ${timeAgo(assignment.offeredAt)} · ${Math.round(assignment.matchScore)}% match`}
                  >
                    <Button
                      size="sm"
                      variant="primary"
                      loading={pendingKey === `accept-${assignment._id}`}
                      onClick={() =>
                        run(`accept-${assignment._id}`, () => acceptOffer(assignment._id), 'Offer accepted.', reload)
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      loading={pendingKey === `decline-${assignment._id}`}
                      onClick={() =>
                        run(`decline-${assignment._id}`, () => declineOffer(assignment._id), 'Offer declined.', reload)
                      }
                    >
                      Decline
                    </Button>
                  </TaskRow>
                ))}

                {inProgress.map((assignment) => (
                  <TaskRow
                    key={assignment._id}
                    assignment={assignment}
                    detail={[assignment.request?.requester?.name, assignment.request?.location?.city]
                      .filter(Boolean)
                      .join(' · ')}
                  >
                    <Button
                      size="sm"
                      variant="primary"
                      loading={pendingKey === `complete-${assignment._id}`}
                      onClick={() =>
                        run(
                          `complete-${assignment._id}`,
                          () => completeAssignment(assignment._id),
                          'Marked as done. Thank you!',
                          reload,
                        )
                      }
                    >
                      Mark as done
                    </Button>
                  </TaskRow>
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            title="Best matches near you"
            description="Ranked on skills, distance, availability, category and reputation."
            action={<PanelLink to="/dashboard/requests">All opportunities</PanelLink>}
          >
            {matches.length === 0 ? (
              <EmptyState
                icon={Compass}
                title="No matches right now"
                description="Add skills or widen your service radius to see more requests."
                action={<Button to="/dashboard/settings">Update your profile</Button>}
              />
            ) : (
              <ul className="divide-y">
                {matches.map((match) => (
                  <MatchRow
                    key={match.request._id}
                    match={match}
                    accepting={pendingKey === `claim-${match.request._id}`}
                    onAccept={() =>
                      run(
                        `claim-${match.request._id}`,
                        () => claimRequest(match.request._id),
                        'Task accepted. It’s now in progress.',
                        reload,
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Your week" action={<PanelLink to="/dashboard/settings">Edit</PanelLink>}>
            <AvailabilityGrid availability={profile.availability} />
          </Panel>

          <Panel title="Skills and reach">
            <div className="flex flex-wrap gap-1.5">
              {profile.skills?.length ? (
                profile.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)
              ) : (
                <p className="text-sm text-muted">No skills added yet.</p>
              )}
            </div>
            <dl className="mt-6 divide-y border-t text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-muted">Service radius</dt>
                <dd>{profile.serviceRadius} km</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-muted">Based in</dt>
                <dd>{profile.location?.city || 'Not set'}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted">Categories</dt>
                <dd className="text-right">{profile.categories?.length ?? 0}</dd>
              </div>
            </dl>
          </Panel>

          {matches.length > 0 && (
            <Panel title="Nearby">
              <RequestsMap
                requests={matches.map((match) => match.request)}
                height={240}
                linkTo={(request) => `/dashboard/requests/${request._id}`}
              />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
