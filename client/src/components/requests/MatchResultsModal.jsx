import { useState } from 'react';
import { Check, ChevronDown, Compass } from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, Modal, ScoreRing, SkeletonList, Stars, cn } from '../ui';
import { RadarChart } from '../charts';
import { FactorBreakdown, toRadarValues } from '../matching/FactorBreakdown';
import api, { getErrorMessage } from '../../lib/api';
import { offerRequest } from '../../lib/assignments';
import { useFetch } from '../../lib/hooks';
import { firstName, formatDistance } from '../../lib/format';
import { useToast } from '../../context/ToastContext';

function MatchRow({ match, rank, expanded, onToggle, onOffer, offering }) {
  const { user: volunteer, volunteerProfile: profile = {}, breakdown, explanation = [] } = match;

  return (
    <li className={cn('rounded-2xl border transition-colors', expanded && 'border-strong')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="index w-5">{String(rank).padStart(2, '0')}</span>
        <Avatar name={volunteer.name} src={volunteer.avatar} size={40} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 font-medium">
            {volunteer.name}
            {rank === 1 && <Badge tone="done">Best match</Badge>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Stars value={profile.rating ?? 0} size={11} />
              {(profile.rating ?? 0).toFixed(1)}
            </span>
            <span>{formatDistance(breakdown?.calculatedDistanceKm)} away</span>
            <span>{profile.completedTasks ?? 0} tasks done</span>
          </span>
        </span>
        <ScoreRing value={match.matchScore} size={48} />
        <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="grid animate-fade-in gap-8 border-t p-5 sm:grid-cols-[200px_1fr]">
          <div className="mx-auto">
            <RadarChart size={200} values={toRadarValues(breakdown)} />
          </div>
          <div>
            <FactorBreakdown breakdown={breakdown} />
            {explanation.length > 0 && (
              <ul className="mt-5 space-y-2 border-t pt-4 text-sm text-muted">
                {explanation.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-done" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="primary" className="mt-5" loading={offering} onClick={onOffer}>
              Offer this task to {firstName(volunteer.name)}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Ranked volunteer recommendations for one request, with the reasoning shown. */
export function MatchResultsModal({ request, open, onClose, onAssigned }) {
  const toast = useToast();
  const [expandedId, setExpandedId] = useState(null);
  const [offeringId, setOfferingId] = useState(null);

  const {
    data: matches,
    loading,
    error,
  } = useFetch(async () => {
    if (!open || !request) return [];
    const response = await api.get(`/requests/${request._id}/matches`);
    return response.data.matches;
  }, [open, request?._id]);

  const offer = async (match) => {
    setOfferingId(match.user._id);
    try {
      await offerRequest(
        request._id,
        match.user._id,
        `Offered from match recommendations (${Math.round(match.matchScore)}% match).`,
      );
      toast.success(`Offer sent to ${match.user.name}. They’ll be asked to accept.`);
      onAssigned?.();
      onClose();
    } catch (offerError) {
      toast.error(getErrorMessage(offerError));
    } finally {
      setOfferingId(null);
    }
  };

  const list = matches ?? [];
  const openId = expandedId ?? list[0]?.user._id;

  let content;
  if (loading) {
    content = <SkeletonList count={3} className="h-20" />;
  } else if (error) {
    content = <p className="text-sm text-danger">{getErrorMessage(error)}</p>;
  } else if (list.length === 0) {
    content = (
      <EmptyState
        icon={Compass}
        title="No volunteers in range yet"
        description="Nobody nearby scored high enough for this request. It stays open, and new volunteers will see it."
      />
    );
  } else {
    content = (
      <ul className="space-y-3">
        {list.map((match, index) => (
          <MatchRow
            key={match.user._id}
            match={match}
            rank={index + 1}
            expanded={openId === match.user._id}
            onToggle={() => setExpandedId(openId === match.user._id ? '' : match.user._id)}
            onOffer={() => offer(match)}
            offering={offeringId === match.user._id}
          />
        ))}
      </ul>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Recommended volunteers"
      description={request ? `Ranked for “${request.title}”` : undefined}
    >
      {content}
    </Modal>
  );
}
