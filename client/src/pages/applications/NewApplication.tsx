import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ArrowLeft, Check } from 'lucide-react';

export default function NewApplication() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    permitTypeId: '', workflowId: '', transactionType: 'original',
    applicantContactId: '', entityId: '', locationId: '',
  });

  const { data: permitTypes = [] } = useQuery({
    queryKey: ['permit-types'],
    queryFn: () => api.get('/permit-types').then(r => r.data),
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get('/workflows').then(r => r.data),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get('/contacts').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: () => api.post('/applications', form).then(r => r.data),
    onSuccess: (app) => navigate(`/applications/${app.id}`),
  });

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/applications')} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={16} /></button>
        <h1 className="text-lg font-bold text-gray-900">New Application</h1>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <label className="label">Permit Type *</label>
          <select className="input" value={form.permitTypeId} onChange={e => setForm(f => ({ ...f, permitTypeId: e.target.value }))}>
            <option value="">Select permit type…</option>
            {permitTypes.map((pt: any) => <option key={pt.id} value={pt.id}>{pt.name} ({pt.code})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Workflow *</label>
          <select className="input" value={form.workflowId} onChange={e => setForm(f => ({ ...f, workflowId: e.target.value }))}>
            <option value="">Select workflow…</option>
            {workflows.map((wf: any) => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Transaction Type</label>
          <select className="input" value={form.transactionType} onChange={e => setForm(f => ({ ...f, transactionType: e.target.value }))}>
            <option value="original">Original</option>
            <option value="renewal">Renewal</option>
            <option value="transfer">Transfer</option>
            <option value="amendment">Amendment</option>
          </select>
        </div>
        <div>
          <label className="label">Applicant Contact</label>
          <select className="input" value={form.applicantContactId} onChange={e => setForm(f => ({ ...f, applicantContactId: e.target.value }))}>
            <option value="">Select contact…</option>
            {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
        </div>

        <div className="pt-2 flex gap-3">
          <button className="btn-secondary" onClick={() => navigate('/applications')}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!form.permitTypeId || !form.workflowId || create.isPending}
            onClick={() => create.mutate()}
          >
            <Check size={14} /> {create.isPending ? 'Creating…' : 'Create Application'}
          </button>
        </div>
        {create.isError && <p className="text-sm text-red-600">Failed to create. Please try again.</p>}
      </div>
    </div>
  );
}
