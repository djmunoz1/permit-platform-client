import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Plus, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface Props { app: any; onRefresh: () => void; }

export default function InvestigationTab({ app, onRefresh }: Props) {
  return (
    <div className="p-6 space-y-6">
      <BackgroundChecksSection app={app} onRefresh={onRefresh} />
      <InspectionsSection app={app} onRefresh={onRefresh} />
      <EnforcementsSection />
    </div>
  );
}

function BackgroundChecksSection({ app, onRefresh }: Props) {
  const checks: any[] = app.backgroundChecks ?? [];

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Background Checks</h3>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs"><Plus size={12} /> New Background Check</button>
          <button className="btn-secondary text-xs"><RefreshCw size={12} /> Refresh</button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Application', 'Name', 'TCR Number', 'Created On', 'Birth Place', 'Reason', 'Approval', 'Approval Note', 'Sent to Applicant', 'Received'].map(h => (
              <th key={h} className="text-left px-4 py-2 text-xs text-gray-500 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {checks.length === 0 ? (
            <tr><td colSpan={10} className="text-center py-8 text-sm text-gray-400">We didn't find anything to show here</td></tr>
          ) : checks.map((c: any) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-xs">{app.application_number}</td>
              <td className="px-4 py-2 text-xs">{c.contact_name}</td>
              <td className="px-4 py-2 text-xs">{c.tcr_number ?? '—'}</td>
              <td className="px-4 py-2 text-xs">{c.created_at ? format(new Date(c.created_at), 'M/d/yyyy') : '—'}</td>
              <td className="px-4 py-2 text-xs">—</td>
              <td className="px-4 py-2 text-xs">{c.reason ?? '—'}</td>
              <td className="px-4 py-2 text-xs">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-4 py-2 text-xs">{c.approval_note ?? '—'}</td>
              <td className="px-4 py-2 text-xs">{c.sent_to_applicant_at ? format(new Date(c.sent_to_applicant_at), 'M/d/yyyy') : '—'}</td>
              <td className="px-4 py-2 text-xs">{c.received_at ? format(new Date(c.received_at), 'M/d/yyyy') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-5 py-2 text-xs text-gray-400">Rows: {checks.length}</div>
    </div>
  );
}

function InspectionsSection({ app, onRefresh }: Props) {
  const inspections: any[] = app.inspections ?? [];

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Inspections</h3>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs"><Plus size={12} /> New Inspection</button>
          <button className="btn-secondary text-xs"><RefreshCw size={12} /> Refresh</button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Record', 'Created On', 'Inspector', 'Facility', 'Contact', 'Type', 'Status', 'Passed', 'Investigation', 'License'].map(h => (
              <th key={h} className="text-left px-4 py-2 text-xs text-gray-500 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {inspections.length === 0 ? (
            <tr><td colSpan={10} className="text-center py-8 text-sm text-gray-400">We didn't find anything to show here</td></tr>
          ) : inspections.map((insp: any) => (
            <tr key={insp.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-xs font-medium text-primary-600">{insp.id.slice(0, 8)}</td>
              <td className="px-4 py-2 text-xs">{insp.created_at ? format(new Date(insp.created_at), 'M/d/yyyy') : '—'}</td>
              <td className="px-4 py-2 text-xs">{insp.inspector_name ?? '—'}</td>
              <td className="px-4 py-2 text-xs">{insp.facility_name ?? '—'}</td>
              <td className="px-4 py-2 text-xs">{insp.contact_name ?? '—'}</td>
              <td className="px-4 py-2 text-xs">{insp.inspection_type ?? '—'}</td>
              <td className="px-4 py-2 text-xs"><StatusBadge status={insp.status} /></td>
              <td className="px-4 py-2 text-xs">{insp.passed === null ? '—' : insp.passed ? 'Yes' : 'No'}</td>
              <td className="px-4 py-2 text-xs">—</td>
              <td className="px-4 py-2 text-xs">—</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-5 py-2 text-xs text-gray-400">Rows: {inspections.length}</div>
    </div>
  );
}

function EnforcementsSection() {
  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Enforcements</h3>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs"><Plus size={12} /> New Enforcement</button>
        </div>
      </div>
      <div className="text-center py-8 text-sm text-gray-400">We didn't find anything to show here</div>
      <div className="px-5 py-2 text-xs text-gray-400">Rows: 0</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    denied: 'bg-red-100 text-red-700',
    submitted: 'bg-blue-100 text-blue-700',
    passed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    scheduled: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={clsx('badge capitalize', colors[status] ?? 'bg-gray-100 text-gray-600')}>{status}</span>
  );
}
