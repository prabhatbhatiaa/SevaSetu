import { Link } from 'react-router-dom';
import { Clock, MapPin, UserRound } from 'lucide-react';
import { StatusBadge, UrgencyBadge, cn } from '../ui';
import { getCategory } from '../../lib/constants';
import { formatDistance, timeAgo } from '../../lib/format';

export function CategoryLabel({ category, className }) {
  const { icon: Icon } = getCategory(category);
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs text-muted', className)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {category}
    </span>
  );
}

/**
 * Summary card for a service request. The whole card is a link; anything in
 * `actions` sits above that link so it stays clickable.
 */
export function RequestCard({ request, to, distanceKm, aside, actions }) {
  const href = to ?? `/requests/${request._id}`;

  return (
    <article className="group relative flex flex-col rounded-2xl border bg-surface p-5 transition-colors hover:border-strong">
      <Link to={href} className="absolute inset-0 rounded-2xl" aria-label={request.title} />

      <div className="pointer-events-none relative flex items-start justify-between gap-3">
        <CategoryLabel category={request.category} />
        {aside ?? <StatusBadge status={request.status} />}
      </div>

      <h3 className="pointer-events-none relative mt-4 line-clamp-2 text-[17px] font-medium leading-snug tracking-tight">
        {request.title}
      </h3>
      <p className="pointer-events-none relative mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
        {request.description}
      </p>

      <div className="pointer-events-none relative mt-auto pt-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted">
          <UrgencyBadge urgency={request.urgency} />
          {(request.location?.city || distanceKm != null) && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {[request.location?.city, distanceKm != null && formatDistance(distanceKm)].filter(Boolean).join(' · ')}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {timeAgo(request.createdAt)}
          </span>
          {request.assignedVolunteer?.name && (
            <span className="inline-flex items-center gap-1.5 text-ink/80">
              <UserRound className="h-3.5 w-3.5" />
              {request.assignedVolunteer.name}
            </span>
          )}
        </div>
      </div>

      {actions && <div className="relative mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}
