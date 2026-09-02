import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Plus, Edit2, Trash2, Check, X, GripVertical } from 'lucide-react';

const FIELD_TYPES = ['text', 'number', 'boolean', 'date', 'select', 'textarea'];

export default function PermitTypes() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: types = [] } = useQuery({
    queryKey: ['permit-types'],
    queryFn: () => api.get('/permit-types').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (d: any) => api.post('/permit-types', d).then(r => r.data),
    onSuccess: (pt) => { qc.invalidateQueries({ queryKey: ['permit-types'] }); setSelected(pt); setShowNew(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/permit-types/${id}`, data).then(r => r.data),
    onSuccess: (pt) => { qc.invalidateQueries({ queryKey: ['permit-types'] }); setSelected(pt); },
  });

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-sm text-gray-900">Permit Types</h2>
          <button className="btn-primary text-xs" onClick={() => setShowNew(true)}><Plus size={12} /></button>
        </div>
        {showNew && (
          <QuickNewForm
            onSave={(d) => create.mutate(d)}
            onCancel={() => setShowNew(false)}
          />
        )}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {types.map((pt: any) => (
            <button
              key={pt.id}
              onClick={() => setSelected(pt)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === pt.id ? 'bg-primary-50 border-l-2 border-l-primary-600' : ''}`}
            >
              <p className="text-sm font-medium text-gray-900">{pt.name}</p>
              <p className="text-xs text-gray-400">{pt.code} · ${pt.fee} · {pt.application_count} apps</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <PermitTypeEditor permitType={selected} onSave={(data) => update.mutate({ id: selected.id, data })} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">Select a permit type to edit</div>
        )}
      </div>
    </div>
  );
}

function QuickNewForm({ onSave, onCancel }: { onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', fee: '0' });
  return (
    <div className="p-3 border-b bg-gray-50 space-y-2">
      <input className="input text-xs" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <input className="input text-xs" placeholder="Code (e.g. BEER-MFG)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
      <input className="input text-xs" type="number" placeholder="Fee" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
      <div className="flex gap-1">
        <button className="btn-primary text-xs flex-1 justify-center" onClick={() => form.name && form.code && onSave({ ...form, fee: parseFloat(form.fee) })}><Check size={11} /></button>
        <button className="btn-secondary text-xs" onClick={onCancel}><X size={11} /></button>
      </div>
    </div>
  );
}

function PermitTypeEditor({ permitType, onSave }: { permitType: any; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: permitType.name,
    description: permitType.description ?? '',
    fee: String(permitType.fee),
    renewalPeriodDays: String(permitType.renewal_period_days ?? ''),
  });
  const [fields, setFields] = useState<any[]>(permitType.form_schema ?? []);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({ key: '', label: '', type: 'text', required: false });

  function addField() {
    if (!newField.key || !newField.label) return;
    setFields(f => [...f, { ...newField }]);
    setNewField({ key: '', label: '', type: 'text', required: false });
    setShowAddField(false);
  }

  function removeField(key: string) {
    setFields(f => f.filter(x => x.key !== key));
  }

  function handleSave() {
    onSave({ ...form, fee: parseFloat(form.fee), renewalPeriodDays: form.renewalPeriodDays ? parseInt(form.renewalPeriodDays) : null, formSchema: fields });
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{permitType.name}</h2>
        <button className="btn-primary" onClick={handleSave}><Check size={14} /> Save Changes</button>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Basic Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Code</label>
            <input className="input bg-gray-50" value={permitType.code} disabled />
          </div>
          <div>
            <label className="label">Fee ($)</label>
            <input className="input" type="number" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
          </div>
          <div>
            <label className="label">Renewal Period (days)</label>
            <input className="input" type="number" value={form.renewalPeriodDays} onChange={e => setForm(f => ({ ...f, renewalPeriodDays: e.target.value }))} placeholder="365" />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Form Schema Builder */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Application Form Fields</h3>
          <button className="btn-secondary text-xs" onClick={() => setShowAddField(true)}><Plus size={12} /> Add Field</button>
        </div>

        {showAddField && (
          <div className="border rounded p-3 mb-3 bg-gray-50 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label">Field Key</label>
                <input className="input text-xs" placeholder="e.g. business_type" value={newField.key} onChange={e => setNewField(f => ({ ...f, key: e.target.value.replace(/\s/g, '_').toLowerCase() }))} />
              </div>
              <div>
                <label className="label">Display Label</label>
                <input className="input text-xs" placeholder="e.g. Type of Business" value={newField.label} onChange={e => setNewField(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input text-xs" value={newField.type} onChange={e => setNewField(f => ({ ...f, type: e.target.value }))}>
                  {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={newField.required} onChange={e => setNewField(f => ({ ...f, required: e.target.checked }))} />
              <span className="text-xs text-gray-600">Required</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary text-xs" onClick={() => setShowAddField(false)}>Cancel</button>
              <button className="btn-primary text-xs" onClick={addField}><Check size={11} /> Add</button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No custom fields. Add fields to collect info during the application.</p>
          ) : fields.map((field: any, i: number) => (
            <div key={field.key} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200">
              <GripVertical size={13} className="text-gray-300" />
              <div className="flex-1 flex items-center gap-3">
                <code className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{field.key}</code>
                <span className="text-sm text-gray-900">{field.label}</span>
                <span className="badge bg-blue-50 text-blue-600 text-[10px]">{field.type}</span>
                {field.required && <span className="badge bg-red-50 text-red-600 text-[10px]">required</span>}
              </div>
              <button className="p-1 text-gray-400 hover:text-red-600" onClick={() => removeField(field.key)}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
