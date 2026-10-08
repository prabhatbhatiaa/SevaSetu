import { useEffect, useState } from 'react';
import { MapPin, Search, UserX } from 'lucide-react';
import {
  Avatar,
  Badge,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  Stars,
} from '../../components/ui';
import { AvailabilityGrid } from '../../components/volunteers/AvailabilityGrid';
import api from '../../lib/api';
import { CATEGORY_NAMES } from '../../lib/constants';
import { pluralize, timeAgo } from '../../lib/format';
import { useDebouncedValue, useDocumentTitle, useFetch } from '../../lib/hooks';

function VolunteerProfileModal({ volunteer, onClose }) {
  const { data: reviews, loading } = useFetch(async () => {
    if (!volunteer) return null;
    return (await api.get(`/reviews/volunteer/${volunteer._id}`, { params: { limit: 5 } })).data;
  }, [volunteer?._id]);

  if (!volunteer) return null;

  const distribution = reviews?.ratingSummary?.distribution ?? {};
  const totalReviews = reviews?.ratingSummary?.totalReviews ?? 0;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={volunteer.user?.name}
      description={[
        volunteer.location?.city,
        pluralize(volunteer.completedTasks, 'task'),
        `${volunteer.serviceRadius} km radius`,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Avatar name={volunteer.user?.name} size={56} />
            <div>
              <div className="flex items-center gap-2">
                <Stars value={volunteer.rating} size={15} />
                <span className="text-lg font-medium">{volunteer.rating?.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted">{pluralize(volunteer.ratingCount, 'review')}</p>
            </div>
          </div>

          {volunteer.bio && <p className="text-[15px] leading-relaxed text-muted">“{volunteer.bio}”</p>}

          <section>
            <h3 className="label">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {volunteer.skills?.length ? (
                volunteer.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)
              ) : (
                <span className="text-sm text-subtle">None listed</span>
              )}
            </div>
          </section>

          <section>
            <h3 className="label">Helps with</h3>
            <p className="text-sm leading-relaxed">{volunteer.categories?.join(', ')}</p>
          </section>

          <section>
            <h3 className="label">Usually available</h3>
            <AvailabilityGrid availability={volunteer.availability} />
          </section>
        </div>

        <div>
          <h3 className="label">Ratings</h3>
          <ul className="mb-8 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <li key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-3 font-mono text-muted">{stars}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: totalReviews ? `${((distribution[stars] ?? 0) / totalReviews) * 100}%` : 0 }}
                  />
                </div>
                <span className="w-5 text-right font-mono text-muted">{distribution[stars] ?? 0}</span>
              </li>
            ))}
          </ul>

          <h3 className="label">Recent reviews</h3>
          {loading ? (
            <Skeleton className="h-24" />
          ) : reviews?.data?.length ? (
            <ul className="divide-y border-y">
              {reviews.data.map((review) => (
                <li key={review._id} className="py-4">
                  <div className="flex items-center justify-between">
                    <Stars value={review.rating} size={12} />
                    <span className="text-[11px] text-subtle">{timeAgo(review.createdAt)}</span>
                  </div>
                  {review.feedback && <p className="mt-2 text-sm leading-relaxed">“{review.feedback}”</p>}
                  <p className="mt-2 text-xs text-muted">
                    {review.requester?.name} · {review.request?.title}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No reviews yet.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function VolunteerCard({ volunteer, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col rounded-2xl border bg-surface p-5 text-left transition-colors hover:border-strong"
    >
      <div className="flex items-center gap-3.5">
        <Avatar name={volunteer.user?.name} size={44} />
        <div className="min-w-0">
          <p className="truncate font-medium tracking-tight">{volunteer.user?.name}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <MapPin className="h-3 w-3" />
            {volunteer.location?.city || 'Location not set'}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs text-muted">
        <Stars value={volunteer.rating} size={12} />
        <span className="text-ink">{volunteer.rating?.toFixed(1)}</span>
        <span>· {pluralize(volunteer.completedTasks, 'task')} done</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {volunteer.skills?.slice(0, 3).map((skill) => (
          <Badge key={skill}>{skill}</Badge>
        ))}
        {volunteer.skills?.length > 3 && <Badge>+{volunteer.skills.length - 3}</Badge>}
      </div>
    </button>
  );
}

export default function VolunteersPage() {
  useDocumentTitle('Volunteers');
  const [skill, setSkill] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [minRating, setMinRating] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const skillQuery = useDebouncedValue(skill);
  const cityQuery = useDebouncedValue(city);

  useEffect(() => setPage(1), [skillQuery, cityQuery, category, minRating]);

  const { data, loading } = useFetch(async () => {
    const params = { page, limit: 12 };
    if (skillQuery) params.skill = skillQuery;
    if (cityQuery) params.city = cityQuery;
    if (category) params.category = category;
    if (minRating) params.minRating = minRating;
    return (await api.get('/volunteers', { params })).data;
  }, [skillQuery, cityQuery, category, minRating, page]);

  const volunteers = data?.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="The people behind the bridge"
        title={
          <>
            Our <em>volunteers</em>
          </>
        }
        description={
          data ? `${pluralize(data.total, 'active volunteer')}. Filter by skill, area and rating.` : undefined
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          icon={Search}
          value={skill}
          onChange={(event) => setSkill(event.target.value)}
          placeholder="Skill, e.g. Hindi"
        />
        <Input icon={MapPin} value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" />
        <Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORY_NAMES.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </Select>
        <Select value={minRating} onChange={(event) => setMinRating(event.target.value)} aria-label="Minimum rating">
          <option value="">Any rating</option>
          <option value="4.5">4.5 and above</option>
          <option value="4">4.0 and above</option>
          <option value="3">3.0 and above</option>
        </Select>
      </div>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-48" />
          ))}
        </div>
      ) : volunteers.length === 0 ? (
        <EmptyState icon={UserX} title="No volunteers found" description="Try loosening your filters." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {volunteers.map((volunteer) => (
              <VolunteerCard key={volunteer._id} volunteer={volunteer} onOpen={() => setSelected(volunteer)} />
            ))}
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

      <VolunteerProfileModal volunteer={selected} onClose={() => setSelected(null)} />
    </>
  );
}
