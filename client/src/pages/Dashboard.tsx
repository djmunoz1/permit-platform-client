import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: appsData } = useQuery({
    queryKey: ['applications', 'dashboard'],
    queryFn: () => api.get('/applications?limit=5').then(r => r.data),
  });

  const apps = appsData?.data ?? [];
  const total = appsData?.total ?? 0;

  const statusCounts = apps.reduce((acc: any, a: any) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: 'Total Applications', value: total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active', value: statusCounts.active ?? 0, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Approved', value: statusCounts.approved ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Needs Attention', value: statusCounts.draft ?? 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Good morning, {user?.firstName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Applications</h2>
          <Link to="/applications" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {apps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No applications yet.</p>
          ) : apps.map((app: any) => (
            <Link key={app.id} to={`/applications/${app.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{app.application_number}</span>
                  <span className="badge bg-gray-100 text-gray-600">{app.permit_type_code}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{app.applicant_name ?? '—'} · {app.entity_name ?? '—'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div
                  className="badge text-white text-[10px]"
                  style={{ backgroundColor: app.current_stage_color ?? '#6b7280' }}
                >
                  {app.current_stage_name ?? 'No stage'}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(app.updated_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
