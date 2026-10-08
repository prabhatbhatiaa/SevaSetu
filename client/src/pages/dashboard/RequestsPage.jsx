import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ClipboardList, Compass, Plus, Search } from 'lucide-react';
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  ScoreRing,
  Select,
  Skeleton,
  Tabs,
} from '../../components/ui';
import { RequestCard } from '../../components/requests/RequestCard';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { claimRequest } from '../../lib/assignments';
import { CATEGORY_NAMES } from '../../lib/constants';
import { REQUESTS_CHANGED_EVENT, useDebouncedValue, useDocumentTitle, useFetch, useWindowEvent } from '../../lib/hooks';
import { useAction } from '../../lib/useAction';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Open' },
  { value: 'ASSIGNED', label: 'Offered' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const detailsLink = (request) => `/dashboard/requests/${request._id}`;

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-60" />
      ))}
    </div>
  );
}

function CategoryFilter({ value, onChange }) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Filter by category">
      <option value="">All categories</option>
      {CATEGORY_NAMES.map((name) => (
        <option key={name}>{name}</option>
      ))}
    </Select>
  );
}

/** Community members see their own requests; admins see everyone's. */
function ManageRequests({ isAdmin }) {
  const { openCreateRequest } = useOutletContext();
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(query);

  useEffect(() => setPage(1), [status, category, search]);

  const { data, loading, reload } = useFetch(async () => {
    const params = { page, limit: 9 };
    if (!isAdmin) params.mine = true;
    if (status) params.status = status;
    if (category) params.category = category;
    if (search) params.search = search;
    return (await api.get('/requests', { params })).data;
  }, [isAdmin, status, category, search, page]);

  useWindowEvent(REQUESTS_CHANGED_EVENT, reload);

  const requests = data?.data ?? [];
  const filtered = Boolean(status || category || search);

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? 'Moderation' : 'Your requests'}
        title={
          isAdmin ? (
            <>
              All <em>requests</em>
            </>
          ) : (
            <>
              My <em>requests</em>
            </>
          )
        }
        description={
          isAdmin
            ? 'Every request on the platform. Open one to match a volunteer or cancel it.'
            : 'Everything you’ve asked the community for, and where each one stands.'
        }
        actions={
          !isAdmin && (
            <Button variant="primary" onClick={openCreateRequest}>
              <Plus className="h-4 w-4" /> Ask for help
            </Button>
          )
        }
      />

      <Tabs options={STATUS_TABS} value={status} onChange={setStatus} />
      <div className="mb-8 mt-6 grid gap-3 sm:grid-cols-[1fr_260px]">
        <Input
          icon={Search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search requests"
        />
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      {loading && !data ? (
        <CardGridSkeleton />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={filtered ? 'Nothing matches those filters' : 'No requests yet'}
          description={filtered ? 'Try a different status or category.' : 'When you ask for help, it’ll show up here.'}
          action={
            !isAdmin &&
            !filtered && (
              <Button variant="primary" onClick={openCreateRequest}>
                Ask for help
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {requests.map((request) => (
              <RequestCard key={request._id} request={request} to={detailsLink(request)} />
            ))}
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}

/** Volunteers: requests ranked for them, or everything that's open. */
function Opportunities() {
  const [tab, setTab] = useState('matched');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const { pendingKey, run } = useAction();

  useEffect(() => setPage(1), [tab, category]);

  const { data, loading, reload } = useFetch(async () => {
    if (tab === 'matched') {
      const response = await api.get('/volunteers/matched-requests', { params: { limit: 30, minScore: 0 } });
      return { matched: response.data.data };
    }
    const params = { status: 'PENDING', page, limit: 9 };
    if (category) params.category = category;
    return { open: (await api.get('/requests', { params })).data };
  }, [tab, category, page]);

  const acceptButton = (requestId) => (
    <Button
      size="sm"
      variant="primary"
      loading={pendingKey === requestId}
      onClick={() => run(requestId, () => claimRequest(requestId), 'Task accepted. It’s now in progress.', reload)}
    >
      Accept task
    </Button>
  );

  const matched = (data?.matched ?? []).filter((match) => !category || match.request.category === category);
  const open = data?.open;

  let content;
  if (loading && !data) {
    content = <CardGridSkeleton />;
  } else if (tab === 'matched') {
    content = matched.length ? (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {matched.map((match) => (
          <RequestCard
            key={match.request._id}
            request={match.request}
            to={detailsLink(match.request)}
            distanceKm={match.breakdown?.calculatedDistanceKm}
            aside={<ScoreRing value={match.matchScore} size={44} />}
            actions={acceptButton(match.request._id)}
          />
        ))}
      </div>
    ) : (
      <EmptyState
        icon={Compass}
        title="No matches nearby"
        description="Nothing open within your radius fits your profile yet. Try “All open requests”, or broaden your skills."
        action={<Button to="/dashboard/settings">Update your profile</Button>}
      />
    );
  } else {
    content = open?.data?.length ? (
      <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {open.data.map((request) => (
            <RequestCard
              key={request._id}
              request={request}
              to={detailsLink(request)}
              actions={acceptButton(request._id)}
            />
          ))}
        </div>
        <Pagination page={page} totalPages={open.totalPages} onChange={setPage} />
      </>
    ) : (
      <EmptyState
        icon={Compass}
        title="Nothing open right now"
        description="Every request has been picked up. Check back soon."
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Find your next task"
        title={
          <>
            Ways to <em>help</em>
          </>
        }
        description="Requests ranked for you, or everything that’s still open."
      />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b">
        <Tabs
          className="border-b-0"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'matched', label: 'Matched for you' },
            { value: 'open', label: 'All open requests' },
          ]}
        />
        <div className="mb-3 w-full sm:w-64">
          <CategoryFilter value={category} onChange={setCategory} />
        </div>
      </div>
      {content}
    </>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  useDocumentTitle(user.role === 'volunteer' ? 'Opportunities' : 'Requests');

  if (user.role === 'volunteer') return <Opportunities />;
  return <ManageRequests isAdmin={user.role === 'admin'} />;
}
