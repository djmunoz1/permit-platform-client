import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ArrowLeft, ChevronRight, Check, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';
import SummaryTab from './tabs/SummaryTab';
import InvestigationTab from './tabs/InvestigationTab';
import DocumentsTab from './tabs/DocumentsTab';
import CommunicationTab from './tabs/CommunicationTab';
import StageTransitionModal from './StageTransitionModal';

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'applicant', label: 'Applicant & Entity' },
  { key: 'documents', label: 'Documents' },
  { key: 'investigation', label: 'Investigation' },
  { key: 'communication', label: 'Communication' },
];

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('summary');
  const [showTransition, setShowTransition] = useState(false);

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}`).then(r => r.data),
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (!app) return <div className="p-8 text-gray-400">Not found.</div>;

  const currentStageIndex = app.stages?.findIndex((s: any) => s.id === app.current_stage_id) ?? -1;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 pt-3 pb-0">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/applications')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-gray-900">{app.application_number}</h1>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-500">License/Permit Application</span>
                <span className={clsx('badge ml-1', app.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                  {app.status?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {app.permit_type_name} · {app.transaction_type} · assigned to {app.assigned_to_name ?? 'unassigned'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTransition(true)}
                className="btn-primary"
                disabled={!app.stages?.length}
              >
                <ChevronRight size={14} /> Next Stage
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {app.stages?.length > 0 && (
            <div className="flex items-center gap-0 overflow-x-auto pb-0 -mx-1">
              {app.stages.map((stage: any, i: number) => {
                const isCompleted = i < currentStageIndex;
                const isCurrent = i === currentStageIndex;
                return (
                  <div key={stage.id} className="flex items-center flex-shrink-0">
                    {i > 0 && (
                      <div className={clsx('h-px w-4 flex-shrink-0', isCompleted ? 'bg-primary-400' : 'bg-gray-200')} />
                    )}
                    <div className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors whitespace-nowrap',
                      isCurrent ? 'border-primary-600 text-primary-700 font-semibold' :
                      isCompleted ? 'border-primary-300 text-primary-500' :
                      'border-transparent text-gray-400'
                    )}>
                      {isCompleted ? (
                        <Check size={11} className="text-primary-500" />
                      ) : (
                        <div className={clsx(
                          'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center',
                          isCurrent ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
                        )}>
                          {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      )}
                      {stage.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-1 -mb-px">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'px-4 py-2 text-sm border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-700 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {activeTab === 'summary' && <SummaryTab app={app} onRefresh={() => qc.invalidateQueries({ queryKey: ['application', id] })} />}
        {activeTab === 'applicant' && <ApplicantTab app={app} />}
        {activeTab === 'documents' && <DocumentsTab app={app} />}
        {activeTab === 'investigation' && <InvestigationTab app={app} onRefresh={() => qc.invalidateQueries({ queryKey: ['application', id] })} />}
        {activeTab === 'communication' && <CommunicationTab app={app} onRefresh={() => qc.invalidateQueries({ queryKey: ['application', id] })} />}
      </div>

      {showTransition && (
        <StageTransitionModal
          app={app}
          onClose={() => setShowTransition(false)}
          onSuccess={() => {
            setShowTransition(false);
            qc.invalidateQueries({ queryKey: ['application', id] });
          }}
        />
      )}
    </div>
  );
}

function ApplicantTab({ app }: { app: any }) {
  return (
    <div className="p-6 grid grid-cols-2 gap-6 max-w-4xl">
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Applicant</h3>
        <dl className="space-y-2">
          <Field label="Name" value={`${app.applicant_first ?? ''} ${app.applicant_last ?? ''}`.trim() || '—'} />
          <Field label="Email" value={app.applicant_email ?? '—'} />
          <Field label="Phone" value={app.applicant_phone ?? '—'} />
        </dl>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Entity</h3>
        <dl className="space-y-2">
          <Field label="Name" value={app.entity_name ?? '—'} />
          <Field label="Type" value={app.entity_type ?? '—'} />
        </dl>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Location / Premises</h3>
        <dl className="space-y-2">
          <Field label="Name" value={app.location_name ?? '—'} />
          <Field label="Address" value={[app.address_street, app.address_city, app.address_state, app.address_zip].filter(Boolean).join(', ') || '—'} />
        </dl>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}
