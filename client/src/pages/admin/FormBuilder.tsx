import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Plus, Trash2, Edit2, Check, X, GripVertical,
  Sparkles, ChevronDown, ChevronUp, Eye, EyeOff, Copy,
} from 'lucide-react';
import clsx from 'clsx';

const FIELD_TYPES = [
  { value: 'text',     label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number',   label: 'Number' },
  { value: 'email',    label: 'Email' },
  { value: 'tel',      label: 'Phone' },
  { value: 'date',     label: 'Date' },
  { value: 'select',   label: 'Dropdown' },
  { value: 'radio',    label: 'Radio buttons' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'boolean',  label: 'Yes / No toggle' },
];

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: 'bg-blue-50 text-blue-700',
  textarea: 'bg-indigo-50 text-indigo-700',
  number: 'bg-purple-50 text-purple-700',
  email: 'bg-cyan-50 text-cyan-700',
  tel: 'bg-teal-50 text-teal-700',
  date: 'bg-orange-50 text-orange-700',
  select: 'bg-yellow-50 text-yellow-700',
  radio: 'bg-pink-50 text-pink-700',
  checkbox: 'bg-green-50 text-green-700',
  boolean: 'bg-emerald-50 text-emerald-700',
};

function emptyField(): any {
  return { key: '', label: '', type: 'text', required: false, placeholder: '', hint: '', options: [] };
}

// ── AI prompt suggestions per permit type ──────────────────────────────────────
const AI_PROMPTS: Record<string, string[]> = {
  default: [
    'Add standard applicant contact fields (name, email, phone)',
    'Add business entity fields (entity name, type, EIN)',
    'Add premises/location fields (address, county, ZIP)',
    'Add certification and signature block',
  ],
};

function generateAIFields(prompt: string): any[] {
  const p = prompt.toLowerCase();
  if (p.includes('contact') || p.includes('applicant')) return [
    { key: 'first_name', label: 'First Name', type: 'text', required: true, placeholder: 'Jane', hint: '' },
    { key: 'last_name', label: 'Last Name', type: 'text', required: true, placeholder: 'Doe', hint: '' },
    { key: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'jane.doe@example.com', hint: '' },
    { key: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '(410) 555-0100', hint: '' },
  ];
  if (p.includes('business') || p.includes('entity')) return [
    { key: 'entity_name', label: 'Business / Entity Name', type: 'text', required: true, placeholder: 'Acme Corp LLC', hint: '' },
    { key: 'entity_type', label: 'Entity Type', type: 'select', required: true, options: ['LLC', 'Corporation', 'Partnership', 'Sole Proprietor', 'Nonprofit'], hint: '' },
    { key: 'ein', label: 'Employer Identification Number (EIN)', type: 'text', required: false, placeholder: 'XX-XXXXXXX', hint: 'Optional. Format: XX-XXXXXXX' },
  ];
  if (p.includes('premises') || p.includes('location') || p.includes('address')) return [
    { key: 'address_street', label: 'Street Address', type: 'text', required: true, placeholder: '123 Main Street', hint: '' },
    { key: 'address_city', label: 'City', type: 'text', required: true, placeholder: 'Baltimore', hint: '' },
    { key: 'address_county', label: 'County', type: 'select', required: true, options: ['Baltimore City','Baltimore County','Montgomery','Prince George\'s','Anne Arundel','Howard','Frederick','Harford'], hint: '' },
    { key: 'address_zip', label: 'ZIP Code', type: 'text', required: true, placeholder: '21202', hint: '' },
  ];
  if (p.includes('certification') || p.includes('signature')) return [
    { key: 'certification', label: 'I certify that all information provided is true and correct to the best of my knowledge.', type: 'checkbox', required: true, hint: '' },
    { key: 'signature_name', label: 'Full Legal Name (Signature)', type: 'text', required: true, placeholder: 'Jane Doe', hint: 'By typing your name you are electronically signing this application.' },
    { key: 'signature_date', label: 'Date', type: 'date', required: true, hint: '' },
  ];
  // generic: return a text + textarea pair
  return [
    { key: 'custom_field', label: prompt.slice(0, 60), type: 'text', required: false, placeholder: '', hint: '' },
  ];
}

// ── Drag state ──────────────────────────────────────────────────────────────────
interface DragState { fromIndex: number; overIndex: number | null }

export default function FormBuilder() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: types = [] } = useQuery({
    queryKey: ['permit-types'],
    queryFn: () => api.get('/permit-types').then(r => r.data),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/permit-types/${id}`, data).then(r => r.data),
    onSuccess: (pt) => { qc.invalidateQueries({ queryKey: ['permit-types'] }); setSelected(pt); },
  });

  const create = useMutation({
    mutationFn: (d: any) => api.post('/permit-types', d).then(r => r.data),
    onSuccess: (pt) => { qc.invalidateQueries({ queryKey: ['permit-types'] }); setSelected(pt); setShowNew(false); },
  });

  return (
    <div className="flex h-full">
      {/* Sidebar: permit type list */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Form Builder</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Design application forms</p>
          </div>
          <button className="btn-primary text-xs" onClick={() => setShowNew(true)}><Plus size={12} /></button>
        </div>

        {showNew && (
          <QuickNewForm
            onSave={(d) => create.mutate(d)}
            onCancel={() => setShowNew(false)}
          />
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {types.map((pt: any) => (
            <button
              key={pt.id}
              onClick={() => setSelected(pt)}
              className={clsx(
                'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                selected?.id === pt.id ? 'bg-primary-50 border-l-2 border-l-primary-600' : ''
              )}
            >
              <p className="text-sm font-medium text-gray-900">{pt.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {pt.form_schema?.length ?? 0} fields · ${pt.fee}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main editor */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {selected ? (
          <FormEditor
            permitType={selected}
            onSave={(data) => update.mutate({ id: selected.id, data })}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-2">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Edit2 size={22} className="text-gray-300" />
            </div>
            <p className="text-sm">Select a permit type to edit its form</p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickNewForm({ onSave, onCancel }: { onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', fee: '0' });
  const autoCode = form.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const codeToUse = form.code || autoCode;
  return (
    <div className="p-3 border-b bg-gray-50 space-y-2">
      <input className="input text-xs" placeholder="Permit type name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
      <input className="input text-xs" placeholder={autoCode ? `Code: ${autoCode}` : 'Code (auto-generated)'} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
      <input className="input text-xs" type="number" placeholder="Fee ($)" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
      <div className="flex gap-1">
        <button className="btn-primary text-xs flex-1 justify-center" onClick={() => form.name && onSave({ name: form.name, code: codeToUse, fee: parseFloat(form.fee) })}><Check size={11} /> Create</button>
        <button className="btn-secondary text-xs" onClick={onCancel}><X size={11} /></button>
      </div>
    </div>
  );
}

function FormEditor({ permitType, onSave }: { permitType: any; onSave: (d: any) => void }) {
  const [fields, setFields] = useState<any[]>(permitType.form_schema ?? []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [preview, setPreview] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [saved, setSaved] = useState(false);
  const [drag, setDrag] = useState<DragState>({ fromIndex: -1, overIndex: null });
  const dragItem = useRef<number>(-1);
  const dragOver = useRef<number>(-1);

  function handleSave() {
    onSave({ formSchema: fields });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addField(field: any) {
    const key = field.key || `field_${fields.length + 1}`;
    setFields(f => [...f, { ...field, key }]);
    setAddingNew(false);
  }

  function updateField(index: number, field: any) {
    setFields(f => f.map((x, i) => i === index ? field : x));
    setEditingIndex(null);
  }

  function removeField(index: number) {
    setFields(f => f.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function duplicateField(index: number) {
    const copy = { ...fields[index], key: fields[index].key + '_copy' };
    setFields(f => [...f.slice(0, index + 1), copy, ...f.slice(index + 1)]);
  }

  function applyAI() {
    if (!aiPrompt.trim()) return;
    const newFields = generateAIFields(aiPrompt);
    const deduped = newFields.filter(nf => !fields.find(f => f.key === nf.key));
    setFields(f => [...f, ...deduped]);
    setAiPrompt('');
    setAiOpen(false);
  }

  // Drag handlers (no external library — pure pointer events)
  function onDragStart(i: number) {
    dragItem.current = i;
    setDrag({ fromIndex: i, overIndex: i });
  }
  function onDragEnter(i: number) {
    dragOver.current = i;
    setDrag(d => ({ ...d, overIndex: i }));
  }
  function onDragEnd() {
    const from = dragItem.current;
    const to = dragOver.current;
    if (from !== to && from >= 0 && to >= 0) {
      setFields(prev => {
        const arr = [...prev];
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        return arr;
      });
    }
    setDrag({ fromIndex: -1, overIndex: null });
    dragItem.current = -1;
    dragOver.current = -1;
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{permitType.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{permitType.code} · {fields.length} field{fields.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={() => setPreview(v => !v)}
          >
            {preview ? <EyeOff size={13} /> : <Eye size={13} />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            className={clsx('btn text-xs', saved ? 'bg-green-600 text-white' : 'btn-primary')}
            onClick={handleSave}
          >
            {saved ? <><Check size={13} /> Saved!</> : <><Check size={13} /> Save Form</>}
          </button>
        </div>
      </div>

      {/* AI panel */}
      <div className="card mb-4 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => setAiOpen(v => !v)}
        >
          <span className="flex items-center gap-2">
            <Sparkles size={14} className="text-primary-600" />
            Generate fields with AI
          </span>
          {aiOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {aiOpen && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mt-3 mb-2">Describe what fields you need, or pick a suggestion:</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {AI_PROMPTS.default.map(s => (
                <button
                  key={s}
                  className="text-[11px] px-2 py-1 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition-colors"
                  onClick={() => setAiPrompt(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input text-sm flex-1"
                placeholder="e.g. Add business entity fields with EIN…"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyAI()}
              />
              <button
                className="btn-primary text-xs whitespace-nowrap"
                onClick={applyAI}
                disabled={!aiPrompt.trim()}
              >
                <Sparkles size={12} /> Generate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview mode */}
      {preview ? (
        <FormPreview fields={fields} permitType={permitType} />
      ) : (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Form Fields</h3>
            <button
              className="btn-secondary text-xs"
              onClick={() => { setAddingNew(true); setEditingIndex(null); }}
            >
              <Plus size={12} /> Add Field
            </button>
          </div>

          {/* Add new field inline */}
          {addingNew && (
            <div className="border-b border-gray-100 bg-blue-50/30">
              <FieldEditor
                field={emptyField()}
                onSave={addField}
                onCancel={() => setAddingNew(false)}
                isNew
              />
            </div>
          )}

          {/* Field list */}
          {fields.length === 0 && !addingNew ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm font-medium text-gray-500">No fields yet</p>
              <p className="text-xs mt-1">Add fields manually or use AI to generate them.</p>
            </div>
          ) : (
            <div>
              {fields.map((field, i) => (
                <div
                  key={`${field.key}-${i}`}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragEnter={() => onDragEnter(i)}
                  onDragEnd={onDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className={clsx(
                    'border-b border-gray-50 last:border-b-0 transition-all',
                    drag.overIndex === i && drag.fromIndex !== i ? 'bg-primary-50 border-primary-200' : '',
                    drag.fromIndex === i ? 'opacity-40' : ''
                  )}
                >
                  {editingIndex === i ? (
                    <FieldEditor
                      field={field}
                      onSave={(updated) => updateField(i, updated)}
                      onCancel={() => setEditingIndex(null)}
                    />
                  ) : (
                    <FieldRow
                      field={field}
                      onEdit={() => { setEditingIndex(i); setAddingNew(false); }}
                      onDelete={() => removeField(i)}
                      onDuplicate={() => duplicateField(i)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldRow({ field, onEdit, onDelete, onDuplicate }: {
  field: any; onEdit: () => void; onDelete: () => void; onDuplicate: () => void;
}) {
  const colorCls = FIELD_TYPE_COLORS[field.type] ?? 'bg-gray-100 text-gray-600';
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group cursor-grab active:cursor-grabbing">
      <GripVertical size={14} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 truncate">{field.label || <em className="text-gray-400">Unlabeled</em>}</span>
          {field.required && <span className="text-red-500 text-xs font-bold" title="Required">*</span>}
          <span className={clsx('badge text-[10px]', colorCls)}>{field.type}</span>
        </div>
        <code className="text-[11px] text-gray-400">{field.key}</code>
        {field.hint && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{field.hint}</p>}
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button title="Duplicate" className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100" onClick={onDuplicate}>
          <Copy size={12} />
        </button>
        <button title="Edit" className="p-1.5 text-gray-400 hover:text-primary-600 rounded hover:bg-primary-50" onClick={onEdit}>
          <Edit2 size={12} />
        </button>
        <button title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" onClick={onDelete}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function FieldEditor({ field, onSave, onCancel, isNew }: {
  field: any; onSave: (f: any) => void; onCancel: () => void; isNew?: boolean;
}) {
  const [form, setForm] = useState<any>({ ...field });
  const [optionsText, setOptionsText] = useState(
    Array.isArray(field.options)
      ? field.options.map((o: any) => (typeof o === 'string' ? o : o.label ?? o.value)).join('\n')
      : ''
  );

  const needsOptions = ['select', 'radio'].includes(form.type);

  function handleSave() {
    if (!form.label) return;
    const key = form.key || form.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const options = needsOptions
      ? optionsText.split('\n').map((s: string) => s.trim()).filter(Boolean)
      : [];
    onSave({ ...form, key, options });
  }

  return (
    <div className="p-4 space-y-3 bg-white border-l-2 border-primary-400">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Field Label *</label>
          <input
            className="input"
            placeholder="e.g. Business Name"
            value={form.label}
            onChange={e => setForm((f: any) => ({ ...f, label: e.target.value }))}
            autoFocus={isNew}
          />
        </div>
        <div>
          <label className="label">Field Key</label>
          <input
            className="input"
            placeholder="auto-generated"
            value={form.key}
            onChange={e => setForm((f: any) => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
          />
        </div>
        <div>
          <label className="label">Field Type</label>
          <select
            className="input"
            value={form.type}
            onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}
          >
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {!['checkbox', 'boolean'].includes(form.type) && (
        <div>
          <label className="label">Placeholder text</label>
          <input
            className="input"
            placeholder="Optional placeholder…"
            value={form.placeholder ?? ''}
            onChange={e => setForm((f: any) => ({ ...f, placeholder: e.target.value }))}
          />
        </div>
      )}

      {needsOptions && (
        <div>
          <label className="label">Options <span className="text-gray-400 font-normal">(one per line)</span></label>
          <textarea
            className="input resize-none font-mono text-xs"
            rows={4}
            value={optionsText}
            onChange={e => setOptionsText(e.target.value)}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
          />
        </div>
      )}

      <div>
        <label className="label">Helper text / hint</label>
        <input
          className="input"
          placeholder="Optional hint shown below the field"
          value={form.hint ?? ''}
          onChange={e => setForm((f: any) => ({ ...f, hint: e.target.value }))}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.required ?? false}
            onChange={e => setForm((f: any) => ({ ...f, required: e.target.checked }))}
            className="rounded"
          />
          <span className="text-xs text-gray-700">Required field</span>
        </label>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button className="btn-secondary text-xs" onClick={onCancel}>Cancel</button>
        <button
          className="btn-primary text-xs"
          disabled={!form.label}
          onClick={handleSave}
        >
          <Check size={12} /> {isNew ? 'Add Field' : 'Update Field'}
        </button>
      </div>
    </div>
  );
}

function FormPreview({ fields, permitType }: { fields: any[]; permitType: any }) {
  const [values, setValues] = useState<Record<string, any>>({});

  if (fields.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <p className="text-sm">No fields to preview. Add fields in the editor.</p>
      </div>
    );
  }

  return (
    <div className="card p-6 max-w-lg">
      <div className="mb-6 pb-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">{permitType.name} — Application Form</h3>
        <p className="text-xs text-gray-400 mt-1">Preview only — data is not saved</p>
      </div>
      <div className="space-y-4">
        {fields.map((field, i) => (
          <PreviewField
            key={i}
            field={field}
            value={values[field.key]}
            onChange={v => setValues(prev => ({ ...prev, [field.key]: v }))}
          />
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-100">
        <button className="btn-primary w-full justify-center" disabled>Submit Application (preview)</button>
      </div>
    </div>
  );
}

function PreviewField({ field, value, onChange }: { field: any; value: any; onChange: (v: any) => void }) {
  const inputClass = 'block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  const label = (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
  const hint = field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>;

  if (field.type === 'textarea') return <div>{label}<textarea className={clsx(inputClass, 'resize-none')} rows={3} placeholder={field.placeholder} value={value ?? ''} onChange={e => onChange(e.target.value)} />{hint}</div>;
  if (field.type === 'select') return (
    <div>{label}
      <select className={inputClass} value={value ?? ''} onChange={e => onChange(e.target.value)}>
        <option value="">Select…</option>
        {(field.options ?? []).map((o: any) => <option key={o} value={o}>{o}</option>)}
      </select>{hint}
    </div>
  );
  if (field.type === 'radio') return (
    <div>{label}
      <div className="space-y-1.5 mt-1">
        {(field.options ?? []).map((o: any) => (
          <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name={field.key} value={o} checked={value === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>{hint}
    </div>
  );
  if (field.type === 'checkbox') return (
    <div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" className="mt-0.5" checked={!!value} onChange={e => onChange(e.target.checked)} />
        <span className="text-sm text-gray-700">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</span>
      </label>{hint}
    </div>
  );
  if (field.type === 'boolean') return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</span>
      <div className="flex gap-2">
        {['Yes', 'No'].map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={clsx('px-3 py-1 text-sm rounded border transition-colors', value === opt ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-700 hover:border-gray-400')}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  // Default: text, number, email, tel, date
  return (
    <div>{label}
      <input
        className={inputClass}
        type={field.type}
        placeholder={field.placeholder}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
      {hint}
    </div>
  );
}
