import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { X, ChevronRight } from 'lucide-react';

interface Props {
  app: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StageTransitionModal({ app, onClose, onSuccess }: Props) {
  const currentStage = app.stages?.find((s: any) => s.id === app.current_stage_id);
  const availableTransitions = currentStage?.transitions ?? [];

  const [selectedTransition, setSelectedTransition] = useState<any>(availableTransitions[0] ?? null);
  const [note, setNote] = useState('');
  const [isProtestValid, setIsProtestValid] = useState<string>('no');

  const mutation = useMutation({
    mutationFn: (data: { toStageId: string; note?: string }) =>
      api.post(`/applications/${app.id}/transition`, data).then(r => r.data),
    onSuccess: (updated) => {
      // Write cross-portal notification so OneStop resident dashboard can show it
      const toStage = app.stages?.find((s: any) => s.id === selectedTransition?.to_stage_id);
      const notifications: any[] = (() => {
        try { return JSON.parse(localStorage.getItem('mos_permit_notifications') ?? '[]'); } catch { return []; }
      })();
      notifications.unshift({
        id: `notif-${Date.now()}`,
        applicationNumber: app.application_number,
        applicationId: app.id,
        stageName: toStage?.name ?? 'Next Stage',
        note: note || null,
        isTerminal: toStage?.is_terminal ?? false,
        readAt: null,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('mos_permit_notifications', JSON.stringify(notifications.slice(0, 50)));
      onSuccess();
    },
  });

  if (!availableTransitions.length) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="card p-6 w-80">
          <p className="text-sm text-gray-600">No transitions available from the current stage.</p>
          <button onClick={onClose} className="btn-secondary mt-4 w-full justify-center">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="card w-96 max-w-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Move to Next Stage</h2>
            <p className="text-xs text-gray-400 mt-0.5">Active for less than one minute</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Transition selection */}
          <div>
            <label className="label">Select Transition</label>
            <div className="space-y-2">
              {availableTransitions.map((t: any) => {
                const toStage = app.stages?.find((s: any) => s.id === t.to_stage_id);
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${
                      selectedTransition?.id === t.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transition"
                      checked={selectedTransition?.id === t.id}
                      onChange={() => setSelectedTransition(t)}
                      className="text-primary-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.label}</p>
                      {toStage && (
                        <p className="text-xs text-gray-500">→ {toStage.name}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Is Protest Valid */}
          <div>
            <label className="label">Is Protest Valid</label>
            <select
              className="input"
              value={isProtestValid}
              onChange={e => setIsProtestValid(e.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="label">Note (optional)</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note about this transition…"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            className="btn-primary"
            disabled={!selectedTransition || mutation.isPending}
            onClick={() => mutation.mutate({ toStageId: selectedTransition.to_stage_id, note: note || undefined })}
          >
            {mutation.isPending ? 'Moving…' : 'Next Stage'}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
