import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Plus, Trash2, Edit2, Check, X, ArrowRight, Settings } from 'lucide-react';
import clsx from 'clsx';

const STAGE_COLORS = [
  '#6b7280', '#f59e0b', '#3b82f6', '#8b5cf6',
  '#ef4444', '#10b981', '#059669', '#f97316',
];

export default function WorkflowBuilder() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);

  const qc = useQueryClient();
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get('/workflows').then(r => r.data),
  });

  const { data: workflow } = useQuery({
    queryKey: ['workflow', selectedWorkflow],
    queryFn: () => api.get(`/workflows/${selectedWorkflow}`).then(r => r.data),
    enabled: !!selectedWorkflow,
  });

  const createWorkflow = useMutation({
    mutationFn: (data: any) => api.post('/workflows', data).then(r => r.data),
    onSuccess: (wf) => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      setSelectedWorkflow(wf.id);
      setShowNewWorkflow(false);
    },
  });

  return (
    <div className="flex h-full">
      {/* Workflow list */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-sm">Workflows</h2>
          <button
            className="btn-primary text-xs"
            onClick={() => setShowNewWorkflow(true)}
          >
            <Plus size={12} />
          </button>
        </div>

        {showNewWorkflow && (
          <NewWorkflowForm
            onSave={(data) => createWorkflow.mutate(data)}
            onCancel={() => setShowNewWorkflow(false)}
          />
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
          ) : workflows.map((wf: any) => (
            <button
              key={wf.id}
              onClick={() => setSelectedWorkflow(wf.id)}
              className={clsx(
                'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                selectedWorkflow === wf.id && 'bg-primary-50 border-l-2 border-l-primary-600'
              )}
            >
              <div className="text-sm font-medium text-gray-900">{wf.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {wf.permit_type_name ?? 'Any type'} · {wf.stage_count} stages
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stage builder */}
      <div className="flex-1 overflow-y-auto">
        {!selectedWorkflow ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Settings size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Select a workflow to edit its stages</p>
            </div>
          </div>
        ) : !workflow ? (
          <div className="p-6 text-gray-400 text-sm">Loading…</div>
        ) : (
          <WorkflowEditor workflow={workflow} onRefresh={() => qc.invalidateQueries({ queryKey: ['workflow', selectedWorkflow] })} />
        )}
      </div>
    </div>
  );
}

function NewWorkflowForm({ onSave, onCancel }: { onSave: (d: any) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  return (
    <div className="p-3 border-b border-gray-200 bg-gray-50">
      <input
        className="input text-xs mb-2"
        placeholder="Workflow name…"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />
      <div className="flex gap-1">
        <button className="btn-primary text-xs flex-1 justify-center" onClick={() => name && onSave({ name })}>
          <Check size={11} /> Save
        </button>
        <button className="btn-secondary text-xs" onClick={onCancel}><X size={11} /></button>
      </div>
    </div>
  );
}

function WorkflowEditor({ workflow, onRefresh }: { workflow: any; onRefresh: () => void }) {
  const stages: any[] = workflow.stages ?? [];
  const transitions: any[] = workflow.transitions ?? [];
  const [showAddStage, setShowAddStage] = useState(false);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [showAddTransition, setShowAddTransition] = useState(false);

  const addStage = useMutation({
    mutationFn: (data: any) => api.post(`/workflows/${workflow.id}/stages`, data).then(r => r.data),
    onSuccess: () => { onRefresh(); setShowAddStage(false); },
  });

  const updateStage = useMutation({
    mutationFn: ({ stageId, data }: { stageId: string; data: any }) =>
      api.patch(`/workflows/${workflow.id}/stages/${stageId}`, data).then(r => r.data),
    onSuccess: () => { onRefresh(); setEditingStage(null); },
  });

  const deleteStage = useMutation({
    mutationFn: (stageId: string) => api.delete(`/workflows/${workflow.id}/stages/${stageId}`),
    onSuccess: onRefresh,
  });

  const addTransition = useMutation({
    mutationFn: (data: any) => api.post(`/workflows/${workflow.id}/transitions`, data).then(r => r.data),
    onSuccess: () => { onRefresh(); setShowAddTransition(false); },
  });

  const deleteTransition = useMutation({
    mutationFn: (id: string) => api.delete(`/workflows/${workflow.id}/transitions/${id}`),
    onSuccess: onRefresh,
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{workflow.name}</h2>
          <p className="text-xs text-gray-500">
            {workflow.permit_type_name ?? 'All permit types'} · {stages.length} stages · {transitions.length} transitions
          </p>
        </div>
      </div>

      {/* Visual stage flow */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Stage Flow</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {stages.map((stage: any, i: number) => (
            <div key={stage.id} className="flex items-center gap-2">
              {i > 0 && <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />}
              <div
                className="px-3 py-1.5 rounded-full text-white text-xs font-medium flex items-center gap-1.5"
                style={{ backgroundColor: stage.color }}
              >
                <span>{stage.stage_order}</span>
                {stage.name}
                {stage.is_terminal && <span className="text-[10px] opacity-75">(final)</span>}
              </div>
            </div>
          ))}
          {stages.length === 0 && (
            <p className="text-sm text-gray-400">No stages yet. Add your first stage below.</p>
          )}
        </div>
      </div>

      {/* Stages table */}
      <div className="card mb-6">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Stages</h3>
          <button className="btn-secondary text-xs" onClick={() => setShowAddStage(true)}>
            <Plus size={12} /> Add Stage
          </button>
        </div>

        {showAddStage && (
          <StageForm
            stageOrder={stages.length + 1}
            onSave={(data) => addStage.mutate(data)}
            onCancel={() => setShowAddStage(false)}
          />
        )}

        <div className="divide-y divide-gray-50">
          {stages.map((stage: any) => (
            <div key={stage.id}>
              {editingStage === stage.id ? (
                <StageForm
                  initial={stage}
                  stageOrder={stage.stage_order}
                  onSave={(data) => updateStage.mutate({ stageId: stage.id, data })}
                  onCancel={() => setEditingStage(null)}
                />
              ) : (
                <div className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <div className="w-6 text-xs text-gray-400 text-center">{stage.stage_order}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{stage.name}</p>
                    <p className="text-xs text-gray-400">
                      {stage.sla_days ? `SLA: ${stage.sla_days} days` : 'No SLA'}
                      {stage.is_terminal && ' · Terminal stage'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="p-1.5 text-gray-400 hover:text-primary-600 rounded hover:bg-primary-50"
                      onClick={() => setEditingStage(stage.id)}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      onClick={() => confirm('Delete this stage?') && deleteStage.mutate(stage.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {stages.length === 0 && !showAddStage && (
            <p className="text-center py-6 text-sm text-gray-400">No stages defined.</p>
          )}
        </div>
      </div>

      {/* Transitions */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Transitions</h3>
          <button className="btn-secondary text-xs" onClick={() => setShowAddTransition(true)}>
            <Plus size={12} /> Add Transition
          </button>
        </div>

        {showAddTransition && (
          <TransitionForm
            stages={stages}
            onSave={(data) => addTransition.mutate(data)}
            onCancel={() => setShowAddTransition(false)}
          />
        )}

        <div className="divide-y divide-gray-50">
          {transitions.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <div className="flex-1 flex items-center gap-2 text-sm">
                <span className="text-gray-500 text-xs">{t.from_stage_name ?? 'Any'}</span>
                <ArrowRight size={12} className="text-gray-300" />
                <span className="font-medium text-gray-900 text-xs">{t.to_stage_name}</span>
                <span className="badge bg-gray-100 text-gray-600 text-[10px]">{t.label}</span>
                {t.requires_note && <span className="badge bg-yellow-50 text-yellow-700 text-[10px]">Requires note</span>}
              </div>
              <button
                className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                onClick={() => confirm('Delete this transition?') && deleteTransition.mutate(t.id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {transitions.length === 0 && !showAddTransition && (
            <p className="text-center py-6 text-sm text-gray-400">No transitions defined.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StageForm({ initial, stageOrder, onSave, onCancel }: {
  initial?: any; stageOrder: number; onSave: (d: any) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    stageOrder: initial?.stage_order ?? stageOrder,
    color: initial?.color ?? STAGE_COLORS[stageOrder % STAGE_COLORS.length],
    slaDays: initial?.sla_days ?? '',
    isTerminal: initial?.is_terminal ?? false,
  });

  return (
    <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label">Stage Name *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Initial Review" />
        </div>
        <div>
          <label className="label">Order</label>
          <input className="input" type="number" value={form.stageOrder} onChange={e => setForm(f => ({ ...f, stageOrder: parseInt(e.target.value) }))} min={1} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Color</label>
          <div className="flex gap-1 flex-wrap mt-1">
            {STAGE_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setForm(f => ({ ...f, color: c }))}
                className={clsx('w-5 h-5 rounded-full border-2 transition-all', form.color === c ? 'border-gray-700 scale-110' : 'border-transparent')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="label">SLA Days</label>
          <input className="input" type="number" value={form.slaDays} onChange={e => setForm(f => ({ ...f, slaDays: e.target.value }))} placeholder="—" min={0} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isTerminal} onChange={e => setForm(f => ({ ...f, isTerminal: e.target.checked }))} />
            <span className="text-xs text-gray-600">Terminal (final) stage</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-secondary text-xs" onClick={onCancel}>Cancel</button>
        <button
          className="btn-primary text-xs"
          disabled={!form.name}
          onClick={() => onSave({ name: form.name, description: form.description, stageOrder: form.stageOrder, color: form.color, slaDays: form.slaDays || null, isTerminal: form.isTerminal })}
        >
          <Check size={11} /> Save Stage
        </button>
      </div>
    </div>
  );
}

function TransitionForm({ stages, onSave, onCancel }: {
  stages: any[]; onSave: (d: any) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({ fromStageId: '', toStageId: '', label: 'Next Stage', requiresNote: false });

  return (
    <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">From Stage</label>
          <select className="input" value={form.fromStageId} onChange={e => setForm(f => ({ ...f, fromStageId: e.target.value }))}>
            <option value="">Any stage</option>
            {stages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">To Stage *</label>
          <select className="input" value={form.toStageId} onChange={e => setForm(f => ({ ...f, toStageId: e.target.value }))}>
            <option value="">Select…</option>
            {stages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Button Label</label>
          <input className="input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={form.requiresNote} onChange={e => setForm(f => ({ ...f, requiresNote: e.target.checked }))} />
        <span className="text-xs text-gray-600">Require a note when using this transition</span>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-secondary text-xs" onClick={onCancel}>Cancel</button>
        <button
          className="btn-primary text-xs"
          disabled={!form.toStageId}
          onClick={() => onSave({ fromStageId: form.fromStageId || null, toStageId: form.toStageId, label: form.label, requiresNote: form.requiresNote })}
        >
          <Check size={11} /> Save Transition
        </button>
      </div>
    </div>
  );
}
