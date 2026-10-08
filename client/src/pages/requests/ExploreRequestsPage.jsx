import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, LocateFixed, Map as MapIcon, Search, SearchX } from 'lucide-react';
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  SegmentedControl,
  Select,
  Skeleton,
} from '../../components/ui';
import { RequestCard } from '../../components/requests/RequestCard';
import { RequestsMap } from '../../components/maps/RequestsMap';
import api from '../../lib/api';
import { CATEGORY_NAMES, URGENCIES } from '../../lib/constants';
import { pluralize } from '../../lib/format';
import { useDebouncedValue, useDocumentTitle, useFetch } from '../../lib/hooks';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: '', label: 'Any status' },
];

export default function ExploreRequestsPage() {
  useDocumentTitle('Explore requests');
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [urgency, setUrgency] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [view, setView] = useState('grid');
  const [page, setPage] = useState(1);
  const [nearMe, setNearMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const search = useDebouncedValue(query);

  useEffect(() => setPage(1), [search, category, urgency, status, view, nearMe]);

  const { data, loading } = useFetch(async () => {
    // The map shows everything at once; the grid pages through results.
    const params = { page, limit: view === 'map' ? 50 : 12 };
    if (status) params.status = status;
    if (search) params.search = search;
    if (category) params.category = category;
    if (urgency) params.urgency = urgency;
    if (nearMe) {
      params.near = nearMe.join(',');
      params.maxDistance = 30;
    }
    return (await api.get('/requests', { params })).data;
  }, [search, category, urgency, status, page, view, nearMe]);

  const toggleNearMe = () => {
    if (nearMe) {
      setNearMe(null);
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('Your browser doesn’t share location.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearMe([position.coords.longitude, position.coords.latitude]);
        setLocating(false);
      },
      () => {
        setLocationError('Location permission was denied.');
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('');
    setUrgency('');
    setStatus('');
    setNearMe(null);
  };

  const requests = data?.data ?? [];

  let results;
  if (loading && !data) {
    results = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-60" />
        ))}
      </div>
    );
  } else if (requests.length === 0) {
    results = (
      <EmptyState
        icon={SearchX}
        title="Nothing matches those filters"
        description="Try a wider search, or clear the filters to see everything."
        action={<Button onClick={clearFilters}>Clear filters</Button>}
      />
    );
  } else if (view === 'map') {
    results = <RequestsMap requests={requests} height={580} />;
  } else {
    results = (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <RequestCard key={request._id} request={request} />
          ))}
        </div>
        <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
      </>
    );
  }

  return (
    <div className="container-page">
      <PageHeader
        eyebrow="Open to everyone"
        title={
          <>
            Explore <em>requests</em>
          </>
        }
        scene
        description="See what your community needs right now. Sign in as a volunteer to take one on."
      />

      <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        <Input
          icon={Search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search requests or skills"
        />
        <Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORY_NAMES.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </Select>
        <Select value={urgency} onChange={(event) => setUrgency(event.target.value)} aria-label="Urgency">
          <option value="">Any urgency</option>
          {URGENCIES.map((level) => (
            <option key={level} value={level}>
              {level[0].toUpperCase() + level.slice(1)}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
          {STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button variant={nearMe ? 'primary' : 'secondary'} loading={locating} onClick={toggleNearMe} className="h-11">
          {!locating && <LocateFixed className="h-4 w-4" />}
          Near me
        </Button>
      </div>
      {locationError && <p className="mt-2 text-xs text-danger">{locationError}</p>}

      <div className="mb-6 mt-10 flex items-center justify-between gap-4 border-t pt-6">
        <p className="text-sm text-muted">{data ? pluralize(data.total, 'request') : 'Loading…'}</p>
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'grid', label: 'Grid', icon: LayoutGrid },
            { value: 'map', label: 'Map', icon: MapIcon },
          ]}
        />
      </div>

      {results}
    </div>
  );
}
