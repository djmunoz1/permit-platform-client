import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ArrowLeft, Edit2, Check, X, Mail, Phone } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => api.get(`/contacts/${id}`).then(r => r.data),
  });

  const update = useMutation({
    mutationFn: (data: any) => api.patch(`/contacts/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contact', id] }); setEditing(false); },
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (!contact) return <div className="p-8 text-gray-400">Not found.</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/contacts')} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={16} /></button>
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
            {contact.first_name?.[0]}{contact.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{contact.first_name} {contact.last_name}</h1>
            <p className="text-xs text-gray-400">Contact · {contact.application_count ?? 0} applications</p>
          </div>
          <div className="ml-auto">
            {editing ? (
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" onClick={() => setEditing(false)}><X size={12} /> Cancel</button>
              </div>
            ) : (
              <button className="btn-secondary text-xs" onClick={() => setEditing(true)}><Edit2 size={12} /> Edit</button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-6 max-w-5xl">
          {/* Contact info */}
          <div className="col-span-1">
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Contact Information</h3>
              {editing ? (
                <EditForm contact={contact} onSave={(d) => update.mutate(d)} />
              ) : (
                <dl className="space-y-3">
                  <Field label="First Name" value={contact.first_name} />
                  <Field label="Last Name" value={contact.last_name} />
                  <Field label="Job Title" value={contact.job_title ?? '—'} />
                  <Field label="Email" value={contact.email ?? '—'} />
                  <Field label="Business Phone" value={contact.phone ?? '—'} />
                  <Field label="Mobile" value={contact.mobile ?? '—'} />
                  <Field label="Address" value={[contact.address_street, contact.address_city, contact.address_state, contact.address_zip].filter(Boolean).join(', ') || '—'} />
                  <Field label="Preferred Contact" value={contact.preferred_contact ?? 'Any'} />
                </dl>
              )}
            </div>
          </div>

          {/* Timeline + Applications */}
          <div className="col-span-2 space-y-5">
            {/* Applications */}
            <div className="card">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Applications</h3>
              </div>
              {contact.applications?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No applications.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {contact.applications?.map((app: any) => (
                    <Link key={app.id} to={`/applications/${app.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                      <span className="font-medium text-primary-600 text-sm">{app.application_number}</span>
                      <span className="badge bg-indigo-50 text-indigo-700 text-[10px]">{app.permit_type_name}</span>
                      <span className="text-xs text-gray-400">{app.current_stage_name ?? '—'}</span>
                      <span className={clsx('badge ml-auto text-[10px]', app.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>{app.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="card">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Timeline</h3>
              </div>
              {contact.activities?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No activity.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {contact.activities?.map((act: any) => (
                    <div key={act.id} className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-900">{act.subject ?? act.activity_type}</span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {format(new Date(act.created_at), 'M/d/yyyy h:mm aa')}
                        </span>
                      </div>
                      {act.body && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{act.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}

function EditForm({ contact, onSave }: { contact: any; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    firstName: contact.first_name, lastName: contact.last_name,
    email: contact.email ?? '', phone: contact.phone ?? '',
    mobile: contact.mobile ?? '', addressStreet: contact.address_street ?? '',
    addressCity: contact.address_city ?? '', addressState: contact.address_state ?? '',
    addressZip: contact.address_zip ?? '', preferredContact: contact.preferred_contact ?? 'any',
  });

  return (
    <div className="space-y-3">
      {[
        ['First Name', 'firstName'], ['Last Name', 'lastName'],
        ['Email', 'email'], ['Phone', 'phone'], ['Mobile', 'mobile'],
        ['Street', 'addressStreet'], ['City', 'addressCity'],
        ['State', 'addressState'], ['ZIP', 'addressZip'],
      ].map(([label, key]) => (
        <div key={key}>
          <label className="label">{label}</label>
          <input
            className="input"
            value={(form as any)[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          />
        </div>
      ))}
      <button className="btn-primary w-full justify-center" onClick={() => onSave(form)}>
        <Check size={14} /> Save
      </button>
    </div>
  );
}
