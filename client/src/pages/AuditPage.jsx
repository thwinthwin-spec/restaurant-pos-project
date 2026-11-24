import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, titleCase } from '../lib/format';
import { Badge, Card, EmptyState, ErrorState, Loader, PageHeader } from '../components/UI';

const ACTION_TONES = {
  login: 'blue', logout: 'neutral', initial_setup: 'green', order_created: 'green',
  order_cancelled: 'red', menu_deleted: 'red', settings_updated: 'amber', staff_created: 'purple',
};

export default function AuditPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: '25' });
  if (query) params.set('q', query);

  const audit = useQuery({
    queryKey: ['audit', params.toString()],
    queryFn: () => api.get(`/audit?${params}`),
    staleTime: 30_000,
  });

  return (
    <>
      <PageHeader eyebrow="ACCOUNTABILITY" title="Activity log" description="A record of the actions your team takes in the workspace." />
      <Card className="filter-bar">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search action or team member…" /></label>
      </Card>

      {audit.isLoading ? (
        <Loader label="Loading activity…" />
      ) : audit.isError ? (
        <ErrorState message={audit.error.message} retry={() => audit.refetch()} />
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>When</th><th>Team member</th><th>Action</th><th>Details</th></tr></thead>
              <tbody>
                {(audit.data?.items || []).map((entry) => (
                  <tr key={entry._id}>
                    <td className="muted">{formatDateTime(entry.createdAt)}</td>
                    <td><strong>{entry.actorName}</strong></td>
                    <td><Badge tone={ACTION_TONES[entry.action] || 'neutral'}>{titleCase(entry.action)}</Badge></td>
                    <td><code className="audit-details">{entry.details && Object.keys(entry.details).length ? JSON.stringify(entry.details) : '—'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!audit.data?.items?.length && <EmptyState icon={History} title="No activity yet" description="Actions will be recorded here as your team works." />}
          </div>
          {audit.data?.pages > 1 && (
            <footer className="pagination">
              <span>Page {audit.data.page} of {audit.data.pages} · {audit.data.total} events</span>
              <div>
                <button className="icon-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={17} /></button>
                <button className="icon-button" disabled={page >= audit.data.pages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={17} /></button>
              </div>
            </footer>
          )}
        </Card>
      )}
    </>
  );
}
