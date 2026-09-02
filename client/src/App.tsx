import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ApplicationList from './pages/applications/ApplicationList';
import ApplicationDetail from './pages/applications/ApplicationDetail';
import NewApplication from './pages/applications/NewApplication';
import ContactList from './pages/contacts/ContactList';
import ContactDetail from './pages/contacts/ContactDetail';
import SubmissionQueue from './pages/submissions/SubmissionQueue';
import WorkflowBuilder from './pages/admin/WorkflowBuilder';
import PermitTypes from './pages/admin/PermitTypes';
import FormBuilder from './pages/admin/FormBuilder';
import Users from './pages/admin/Users';
import Placeholder from './pages/Placeholder';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />

              {/* Applications */}
              <Route path="applications" element={<ApplicationList />} />
              <Route path="applications/new" element={<NewApplication />} />
              <Route path="applications/:id" element={<ApplicationDetail />} />

              {/* Contacts */}
              <Route path="contacts" element={<ContactList />} />
              <Route path="contacts/:id" element={<ContactDetail />} />
              <Route path="contacts/new" element={<Placeholder title="New Contact" />} />

              {/* OneStop submissions */}
              <Route path="submissions" element={<SubmissionQueue />} />

              {/* Stubs */}
              <Route path="licenses" element={<Placeholder title="Licenses" />} />
              <Route path="inspections" element={<Placeholder title="Inspections" />} />
              <Route path="enforcements" element={<Placeholder title="Enforcements" />} />
              <Route path="entities" element={<Placeholder title="Entities" />} />
              <Route path="locations" element={<Placeholder title="Locations" />} />
              <Route path="my-tasks" element={<Placeholder title="My Tasks" />} />

              {/* Admin */}
              <Route path="admin/workflows" element={<AdminRoute><WorkflowBuilder /></AdminRoute>} />
              <Route path="admin/permit-types" element={<AdminRoute><PermitTypes /></AdminRoute>} />
              <Route path="admin/form-builder" element={<AdminRoute><FormBuilder /></AdminRoute>} />
              <Route path="admin/users" element={<AdminRoute><Users /></AdminRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
