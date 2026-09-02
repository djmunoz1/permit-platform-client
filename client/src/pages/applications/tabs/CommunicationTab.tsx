import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Plus, Mail, Phone, MessageSquare, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface Props { app: any; onRefresh: () => void; }

const ACTIVITY_ICONS: Record<string, any> = {
  email: Mail,
  phone_call: Phone,
  note: MessageSquare,
  portal_comment: FileText,
  stage_change: FileText,
  system: FileText,
};

const ACTIVITY_COLORS: Record<string, string> = {
  email: 'bg-blue-100 text-blue-600',
  phone_call: 'bg-green-100 text-green-600',
  note: 'bg-purple-100 text-purple-600',
  portal_comment: 'bg-orange-100 text-orange-600',
  stage_change: 'bg-indigo-100 text-indigo-600',
  system: 'bg-gray-100 text-gray-500',
};

export default function CommunicationTab({ app, onRefresh }: Props) {
  const activities: any[] = app.activities ?? [];
  const [showAddNote, setShowAddNote] = useState(false);
  const [note, setNote] = useState({ subject: '', body: '', activityType: 'note' });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const addNote = useMutation({
    mutationFn: () => api.post(`/applications/${app.id}/activities`, note).then(r => r.data),
    onSuccess: () => {
      setNote({ subject: '', body: '', activityType: 'note' });
      setShowAddNote(false);
      onRefresh();
    },
  });

  return (
    <div className="p-6 max-w-3xl">
      {/* Add note */}
      <div className="card mb-5">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Timeline</h3>
          <button
            className="btn-secondary text-xs"
            onClick={() => setShowAddNote(!showAddNote)}
          >
            <Plus size={12} /> Add Activity
          </button>
        </div>

        {showAddNote && (
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">Type</label>
                <select
                  className="input"
                  value={note.activityType}
                  onChange={e => setNote(n => ({ ...n, activityType: e.target.value }))}
                >
                  <option value="note">Note</option>
                  <option value="email">Email</option>
                  <option value="phone_call">Phone Call</option>
                  <option value="portal_comment">Portal Comment</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="label">Subject</label>
                <input
                  className="input"
                  value={note.subject}
                  onChange={e => setNote(n => ({ ...n, subject: e.target.value }))}
                  placeholder="Subject…"
                />
              </div>
            </div>
            <div>
              <label className="label">Body</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={note.body}
                onChange={e => setNote(n => ({ ...n, body: e.target.value }))}
                placeholder="Write your note…"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary text-xs" onClick={() => setShowAddNote(false)}>Cancel</button>
              <button
                className="btn-primary text-xs"
                disabled={!note.subject || addNote.isPending}
                onClick={() => addNote.mutate()}
              >
                {addNote.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Activity list */}
        <div className="divide-y divide-gray-50">
          {activities.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">No activity yet.</p>
          ) : activities.map((act: any) => {
            const Icon = ACTIVITY_ICONS[act.activity_type] ?? MessageSquare;
            const colorClass = ACTIVITY_COLORS[act.activity_type] ?? 'bg-gray-100 text-gray-500';
            const isExpanded = expanded[act.id];

            return (
              <div key={act.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', colorClass)}>
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-900">{act.subject ?? act.activity_type}</span>
                      {act.direction && (
                        <span className={clsx('badge text-[10px]', act.direction === 'inbound' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600')}>
                          {act.direction}
                        </span>
                      )}
                      {act.is_closed && <span className="badge bg-gray-100 text-gray-500 text-[10px]">Closed</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">
                        {act.user_name ?? 'System'} · {format(new Date(act.created_at), 'M/d/yyyy h:mm aa')}
                      </span>
                    </div>
                    {act.body && (
                      <div>
                        <p className={clsx('text-xs text-gray-600 mt-1', !isExpanded && 'line-clamp-2')}>
                          {act.body}
                        </p>
                        {act.body.length > 100 && (
                          <button
                            onClick={() => setExpanded(e => ({ ...e, [act.id]: !e[act.id] }))}
                            className="text-[10px] text-primary-600 hover:underline mt-0.5 flex items-center gap-0.5"
                          >
                            {isExpanded ? <><ChevronUp size={10} /> View less</> : <><ChevronDown size={10} /> View more</>}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
