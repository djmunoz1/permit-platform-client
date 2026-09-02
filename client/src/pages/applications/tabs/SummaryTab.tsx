import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { format } from 'date-fns';
import clsx from 'clsx';

interface Props { app: any; onRefresh: () => void; }

export default function SummaryTab({ app, onRefresh }: Props) {
  const updateChecklist = useMutation({
    mutationFn: (checklist: Record<string, boolean>) =>
      api.patch(`/applications/${app.id}`, { checklist }).then(r => r.data),
    onSuccess: onRefresh,
  });

  const checklist: Record<string, boolean> = app.checklist ?? {};
  const checklistItems = [
    { key: 'payment_received', label: 'Payment Received' },
    { key: 'documents_approved', label: 'Documents Approved' },
    { key: 'inspection_complete', label: 'Inspection Complete' },
    { key: 'background_check', label: 'Background Check' },
  ];

  function toggleChecklist(key: string) {
    updateChecklist.mutate({ ...checklist, [key]: !checklist[key] });
  }

  const formData = app.form_data ?? {};
  const formSchema: any[] = app.form_schema ?? [];

  return (
    <div className="p-6 grid grid-cols-3 gap-6">
      {/* Left column */}
      <div className="col-span-2 space-y-5">
        {/* Application info */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Application Details</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <Field label="Application Type" value={app.permit_type_name ?? '—'} />
            <Field label="Transaction Type" value={app.transaction_type ?? '—'} />
            <Field label="Applicant" value={`${app.applicant_first ?? ''} ${app.applicant_last ?? ''}`.trim() || '—'} />
            <Field label="Location to License" value={app.location_name ?? '—'} />
            <Field label="Applied By" value={app.assigned_to_name ?? '—'} />
            <Field label="Submitted Date" value={app.submitted_at ? format(new Date(app.submitted_at), 'M/d/yyyy') : '—'} />
          </div>
        </div>

        {/* Business / form data */}
        {formSchema.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Business Information</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {formSchema.map((field: any) => (
                <Field
                  key={field.key}
                  label={field.label}
                  value={formData[field.key] !== undefined && formData[field.key] !== null
                    ? String(formData[field.key])
                    : '—'}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="space-y-5">
        {/* Health indicator */}
        <div className="card p-4 border-l-4 border-green-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-700">Application Healthy</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">No issues detected</p>
        </div>

        {/* Deadlines */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Deadlines</h3>
          <div className="space-y-2">
            <Field label="Doc Submission" value={app.submitted_at ? format(new Date(app.submitted_at), 'M/d/yyyy') : '—'} small />
            <Field label="Payment Due" value="—" small />
            <Field label="Payment Due In (Hrs)" value="—" small />
          </div>
        </div>

        {/* Checklist */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Application Checklist</h3>
          <div className="space-y-2">
            {checklistItems.map(item => (
              <label key={item.key} className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs text-gray-600">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={clsx('text-xs font-medium', checklist[item.key] ? 'text-green-600' : 'text-gray-400')}>
                    {checklist[item.key] ? 'Yes' : 'No'}
                  </span>
                  <button
                    onClick={() => toggleChecklist(item.key)}
                    className={clsx(
                      'w-9 h-5 rounded-full transition-colors relative',
                      checklist[item.key] ? 'bg-primary-600' : 'bg-gray-300'
                    )}
                  >
                    <div className={clsx(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      checklist[item.key] ? 'translate-x-4' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <dt className={clsx('text-gray-500', small ? 'text-[10px]' : 'text-xs')}>{label}</dt>
      <dd className={clsx('text-gray-900 mt-0.5', small ? 'text-xs' : 'text-sm')}>{value}</dd>
    </div>
  );
}
