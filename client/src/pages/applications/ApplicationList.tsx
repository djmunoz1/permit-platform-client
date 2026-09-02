import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Plus, Search, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  withdrawn: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-orange-100 text-orange-700',
};

export default function ApplicationList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['applications', { search, status, page }],
    queryFn: () => api.get('/applications', {
      params: { search: search || undefined, status: status || undefined, page, limit: 25 }
    }).then(r => r.data),
  });

  const apps = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">License Applications</h1>
            <p className="text-xs text-gray-500">{total} total applications</p>
          </div>
          <Link to="/applications/new" className="btn-primary">
            <Plus size={14} /> New Application
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-8"
              placeholder="Search applications, applicants…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input w-auto"
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              {['Application #', 'Applicant', 'Permit Type', 'Entity', 'Stage', 'Status', 'Updated'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : apps.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No applications found.</td></tr>
            ) : apps.map((app: any) => (
              <tr key={app.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3">
                  <Link to={`/applications/${app.id}`} className="font-medium text-primary-600 hover:underline">
                    {app.application_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-900">{app.applicant_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-indigo-50 text-indigo-700">{app.permit_type_code}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{app.entity_name ?? '—'}</td>
                <td className="px-4 py-3">
                  {app.current_stage_name ? (
                    <span
                      className="badge text-white text-[10px]"
                      style={{ backgroundColor: app.current_stage_color ?? '#6b7280' }}
                    >
                      {app.current_stage_name}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('badge capitalize', STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600')}>
                    {app.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {formatDistanceToNow(new Date(app.updated_at), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <button className="btn-secondary text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
