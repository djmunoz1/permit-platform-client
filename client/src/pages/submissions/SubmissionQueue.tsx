import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Search, X, Check, AlertCircle, Clock, Eye, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

// ── localStorage bridge (same keys as OneStop portal) ─────────────────────────
const LS_SUBMISSIONS = 'mos_submissions';
const LS_NOTIFICATIONS = 'mos_permit_notifications';

function getSubmissions(): any[] {
  try { return JSON.parse(localStorage.getItem(LS_SUBMISSIONS) || '[]'); }
  catch { return []; }
}

function saveSubmissions(list: any[]) {
  localStorage.setItem(LS_SUBMISSIONS, JSON.stringify(list));
}

function updateStatus(id: string, status: string, note: string) {
  const list = getSubmissions();
  const idx = list.findIndex(s => s.id === id);
  if (idx === -1) return null;
  const entry = list[idx];
  entry.status = status;
  entry.updatedAt = new Date().toISOString();
  entry.timeline = entry.timeline || [];
  entry.timeline.push({
    status,
    label: STATUS_LABELS[status] || status,
    date: new Date().toISOString(),
    note,
  });
  list[idx] = entry;
  saveSubmissions(list);

  // Write notification for resident portal
  const notifications: any[] = (() => {
    try { return JSON.parse(localStorage.getItem(LS_NOTIFICATIONS) || '[]'); } catch { return []; }
  })();
  notifications.unshift({
    id: `notif-${Date.now()}`,
    applicationNumber: entry.id,
    applicationId: entry.id,
    stageName: STATUS_LABELS[status] || status,
    note: note || null,
    isTerminal: status === 'approved' || status === 'denied',
    readAt: null,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(notifications.slice(0, 50)));

  return list[idx];
}

// ── Status metadata ────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  submitted:    'Submitted',
  under_review: 'Under Review',
  info_needed:  'Info Needed',
  approved:     'Approved',
  denied:       'Denied',
};

const STATUS_STYLES: Record<string, string> = {
  submitted:    'bg-blue-50 text-blue-700 border-blue-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  info_needed:  'bg-orange-50 text-orange-700 border-orange-200',
  approved:     'bg-green-50 text-green-700 border-green-200',
  denied:       'bg-red-50 text-red-700 border-red-200',
};

const STATUS_DOT: Record<string, string> = {
  submitted:    'bg-blue-500',
  under_review: 'bg-amber-500',
  info_needed:  'bg-orange-500',
  approved:     'bg-green-500',
  denied:       'bg-red-500',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border', STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600 border-gray-200')}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', STATUS_DOT[status] ?? 'bg-gray-400')} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SubmissionQueue() {
  const [subs, setSubs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');

  const reload = useCallback(() => {
    setSubs(getSubmissions().sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
  }, []);

  useEffect(() => {
    reload();
    // Poll for new submissions every 5s (resident submits in another tab)
    const id = setInterval(reload, 5000);
    return () => clearInterval(id);
  }, [reload]);

  // Reselect after status change so panel refreshes
  useEffect(() => {
    if (selected) {
      const refreshed = subs.find(s => s.id === selected.id);
      if (refreshed) setSelected(refreshed);
    }
  }, [subs]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  function doAction(status: string) {
    if (!selected) return;
    updateStatus(selected.id, status, note.trim());
    setNote('');
    reload();
    showToast(`Status updated to "${STATUS_LABELS[status]}"`);
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = subs.filter(s => {
    const d = s.formData || {};
    const matchSearch = !search || [
      s.id,
      d.owner_first_name, d.owner_last_name,
      d.property_address, d.property_city, d.property_county,
      s.formType,
    ].filter(Boolean).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Stat counts ────────────────────────────────────────────────────────────
  const counts = subs.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex h-full">

      {/* ── Left: queue ──────────────────────────────────────────────────── */}
      <div className={clsx('flex flex-col transition-all', selected ? 'w-[55%]' : 'flex-1')}>

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Submission Queue</h1>
              <p className="text-xs text-gray-400 mt-0.5">OneStop resident submissions — {subs.length} total</p>
            </div>
            <button onClick={reload} className="btn-secondary text-xs" title="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[
              { key: '',            label: 'All',          color: 'border-t-primary-500' },
              { key: 'submitted',   label: 'Submitted',    color: 'border-t-blue-500' },
              { key: 'under_review',label: 'Under Review', color: 'border-t-amber-500' },
              { key: 'info_needed', label: 'Info Needed',  color: 'border-t-orange-500' },
              { key: 'approved',    label: 'Approved',     color: 'border-t-green-500' },
            ].map(tile => (
              <button
                key={tile.key}
                onClick={() => setStatusFilter(tile.key)}
                className={clsx(
                  'card p-2.5 text-left border-t-2 transition-all hover:shadow-md',
                  tile.color,
                  statusFilter === tile.key ? 'ring-2 ring-primary-300' : ''
                )}
              >
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{tile.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {tile.key ? (counts[tile.key] || 0) : subs.length}
                </p>
              </button>
            ))}
          </div>

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-8 text-sm"
                placeholder="Search by name, address, ref…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input text-sm w-40"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <AlertCircle size={28} className="text-gray-300" />
              <p className="text-sm font-medium">No submissions yet</p>
              <p className="text-xs">Submissions from the resident portal appear here automatically.</p>
              <a
                href="/portal/login.html"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs mt-2"
              >
                Open Resident Portal →
              </a>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Applicant</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Form Type</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Property</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(sub => {
                  const d = sub.formData || {};
                  const name = [d.owner_first_name, d.owner_last_name].filter(Boolean).join(' ') || '—';
                  const addr = [d.property_address, d.property_city].filter(Boolean).join(', ') || '—';
                  const isSelected = selected?.id === sub.id;
                  return (
                    <tr
                      key={sub.id}
                      onClick={() => { setSelected(sub); setNote(''); }}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isSelected ? 'bg-primary-50 border-l-2 border-l-primary-600' : 'hover:bg-gray-50'
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{sub.id}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{name}</td>
                      <td className="px-4 py-3 text-gray-600">{sub.formType}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{addr}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {sub.submittedAt ? formatDistanceToNow(new Date(sub.submittedAt), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right: detail panel ──────────────────────────────────────────── */}
      {selected && (
        <div className="w-[45%] border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
            <div>
              <h2 className="font-bold text-gray-900 text-sm">{selected.formType}</h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{selected.id}</p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X size={16} />
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Current status */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Current Status</p>
              <div className="flex items-center gap-3">
                <StatusBadge status={selected.status} />
                <span className="text-xs text-gray-400">
                  Updated {selected.updatedAt ? formatDistanceToNow(new Date(selected.updatedAt), { addSuffix: true }) : '—'}
                </span>
              </div>
            </div>

            {/* Property info */}
            <DetailSection title="Property Information">
              <DetailGrid fields={[
                { label: 'Street Address', value: selected.formData?.property_address },
                { label: 'City', value: selected.formData?.property_city },
                { label: 'County', value: selected.formData?.property_county },
                { label: 'ZIP Code', value: selected.formData?.property_zip },
                { label: 'Move-in Date', value: selected.formData?.move_in_date ? format(new Date(selected.formData.move_in_date), 'MMM d, yyyy') : null },
                { label: 'SDAT Account #', value: selected.formData?.property_account || '—' },
              ]} />
            </DetailSection>

            {/* Owner info */}
            <DetailSection title="Owner Information">
              <DetailGrid fields={[
                { label: 'Name', value: [selected.formData?.owner_first_name, selected.formData?.owner_last_name].filter(Boolean).join(' ') },
                { label: 'Email', value: selected.formData?.owner_email },
                { label: 'Phone', value: selected.formData?.owner_phone },
                { label: 'SSN (last 4)', value: '••••' },
                { label: 'Mailing Address', value: selected.formData?.mailing_same === 'yes' ? 'Same as property' : [selected.formData?.mailing_address, selected.formData?.mailing_city, selected.formData?.mailing_state, selected.formData?.mailing_zip].filter(Boolean).join(', ') || '—' },
              ]} />
            </DetailSection>

            {/* Eligibility */}
            <DetailSection title="Eligibility Responses">
              <div className="space-y-1.5">
                {[
                  { label: 'Owns the property', pass: selected.formData?.owns_property === 'yes' },
                  { label: 'Principal residence', pass: selected.formData?.principal_residence === 'yes' },
                  { label: 'Lived ≥ 6 months incl. July 1', pass: selected.formData?.lived_six_months === 'yes' },
                  { label: 'No ownership transfer in prior year', pass: selected.formData?.no_transfer === 'no' || selected.formData?.no_transfer === 'No — ownership did not transfer' },
                  { label: 'Single property only', pass: selected.formData?.one_property === 'no' || selected.formData?.one_property === 'No — this is my only application' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    {item.pass
                      ? <Check size={13} className="text-green-600 flex-shrink-0" />
                      : <X size={13} className="text-red-500 flex-shrink-0" />
                    }
                    <span className={item.pass ? 'text-gray-700' : 'text-red-600'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </DetailSection>

            {/* Timeline */}
            <DetailSection title="Application Timeline">
              <div className="relative pl-5">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-200" />
                {(selected.timeline || []).map((t: any, i: number, arr: any[]) => {
                  const isCurrent = i === arr.length - 1;
                  return (
                    <div key={i} className="relative mb-3 last:mb-0">
                      <div className={clsx(
                        'absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-white',
                        isCurrent ? 'bg-primary-600' : 'bg-green-500'
                      )} />
                      <p className="text-sm font-semibold text-gray-900">{t.label || STATUS_LABELS[t.status] || t.status}</p>
                      <p className="text-xs text-gray-400">{t.date ? format(new Date(t.date), 'MMM d, yyyy h:mm a') : ''}</p>
                      {t.note && <p className="text-xs text-gray-500 italic mt-0.5">"{t.note}"</p>}
                    </div>
                  );
                })}
              </div>
            </DetailSection>

          </div>

          {/* Action footer */}
          <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0 bg-gray-50 space-y-3">
            <p className="text-xs font-semibold text-gray-700">Take Action</p>
            <textarea
              className="input resize-none text-sm"
              rows={2}
              placeholder="Optional note — shown in applicant's timeline…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => doAction('under_review')}
                className="btn bg-primary-600 text-white hover:bg-primary-700 text-xs"
                disabled={selected.status === 'under_review'}
              >
                <Clock size={12} /> Mark Under Review
              </button>
              <button
                onClick={() => doAction('info_needed')}
                className="btn bg-orange-600 text-white hover:bg-orange-700 text-xs"
                disabled={selected.status === 'info_needed'}
              >
                <AlertCircle size={12} /> Request Info
              </button>
              <button
                onClick={() => doAction('approved')}
                className="btn bg-green-600 text-white hover:bg-green-700 text-xs"
                disabled={selected.status === 'approved'}
              >
                <Check size={12} /> Approve
              </button>
              <button
                onClick={() => doAction('denied')}
                className="btn border border-red-500 text-red-600 hover:bg-red-50 text-xs"
                disabled={selected.status === 'denied'}
              >
                <X size={12} /> Deny
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 pb-1.5 border-b border-gray-100">{title}</p>
      {children}
    </div>
  );
}

function DetailGrid({ fields }: { fields: { label: string; value?: string | null }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {fields.map(f => (
        <div key={f.label}>
          <p className="text-[11px] text-gray-400">{f.label}</p>
          <p className="text-sm font-semibold text-gray-900">{f.value || '—'}</p>
        </div>
      ))}
    </div>
  );
}
