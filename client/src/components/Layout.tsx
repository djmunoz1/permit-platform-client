import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, FileText, Users, MapPin, Clipboard,
  Shield, Settings, LogOut, ChevronDown, ChevronRight,
  Wrench, Building2, AlertTriangle, Scale, PenLine, ExternalLink, Inbox
} from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  {
    label: 'Licensing',
    icon: Scale,
    children: [
      { label: 'License Applications', to: '/applications' },
      { label: 'Licenses', to: '/licenses' },
      { label: 'Inspections', to: '/inspections' },
      { label: 'Enforcements', to: '/enforcements' },
    ],
  },
  {
    label: 'People & Org',
    icon: Users,
    children: [
      { label: 'Contacts', to: '/contacts' },
      { label: 'Entities', to: '/entities' },
      { label: 'Locations', to: '/locations' },
    ],
  },
];

const adminItems = [
  { label: 'Form Builder', icon: PenLine, to: '/admin/form-builder' },
  { label: 'Permit Types', icon: FileText, to: '/admin/permit-types' },
  { label: 'Workflows', icon: Settings, to: '/admin/workflows' },
  { label: 'Users', icon: Users, to: '/admin/users' },
];

function NavGroup({ item }: { item: any }) {
  const location = useLocation();
  const anyActive = item.children?.some((c: any) => location.pathname.startsWith(c.to));
  const [open, setOpen] = useState(anyActive ?? true);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-xs font-semibold uppercase tracking-wide"
      >
        <span className="flex items-center gap-2">
          <item.icon size={14} />
          {item.label}
        </span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5">
          {item.children.map((c: any) => (
            <NavLink key={c.to} to={c.to} label={c.label} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavLink({ to, label, icon: Icon }: { to: string; label: string; icon?: any }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors',
        active ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      {Icon && <Icon size={14} />}
      {label}
    </Link>
  );
}

function useSubmissionCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    function read() {
      try {
        const subs = JSON.parse(localStorage.getItem('mos_submissions') || '[]');
        setCount(subs.filter((s: any) => s.status === 'submitted').length);
      } catch { setCount(0); }
    }
    read();
    const id = setInterval(read, 5000);
    return () => clearInterval(id);
  }, []);
  return count;
}

export default function Layout() {
  const { user, tenant, logout, isAdmin } = useAuth();
  const pendingCount = useSubmissionCount();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 leading-tight">{tenant?.name ?? 'Permit Platform'}</div>
              <div className="text-[10px] text-gray-400">License Management</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          <NavLink to="/" label="Dashboard" icon={LayoutDashboard} />

          <div className="pt-2">
            <div className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">My Work</div>
            <NavLink to="/my-tasks" label="My Tasks" icon={Clipboard} />
            <div className="flex items-center justify-between pr-2">
              <NavLink to="/submissions" label="Submission Queue" icon={Inbox} />
              {pendingCount > 0 && (
                <span className="text-[10px] font-bold bg-primary-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {pendingCount}
                </span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <div className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Licensing</div>
            <NavLink to="/applications" label="License Applications" icon={FileText} />
            <NavLink to="/licenses" label="Licenses" icon={Scale} />
            <NavLink to="/inspections" label="Inspections" icon={Wrench} />
            <NavLink to="/enforcements" label="Enforcements" icon={AlertTriangle} />
          </div>

          <div className="pt-2">
            <div className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">People & Org</div>
            <NavLink to="/contacts" label="Contacts" icon={Users} />
            <NavLink to="/entities" label="Entities" icon={Building2} />
            <NavLink to="/locations" label="Locations" icon={MapPin} />
          </div>

          {isAdmin && (
            <div className="pt-2">
              <div className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Administration</div>
              {adminItems.map((item) => (
                <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
              ))}
              <a
                href="/portal/my-applications.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <ExternalLink size={14} />
                Resident Portal
              </a>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-200 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-[10px] text-gray-400 capitalize">{user?.role}</div>
            </div>
            <button onClick={logout} className="p-1 text-gray-400 hover:text-gray-600 rounded" title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
