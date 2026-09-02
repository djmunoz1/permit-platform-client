import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api } from '../lib/api';

interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

interface Tenant {
  slug: string;
  name: string;
  config: Record<string, any>;
}

interface AuthContextValue {
  user: AuthUser | null;
  tenant: Tenant | null;
  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });
  const [tenant, setTenant] = useState<Tenant | null>(() => {
    const s = localStorage.getItem('tenant');
    return s ? JSON.parse(s) : null;
  });

  const login = useCallback(async (email: string, password: string, tenantSlug: string) => {
    const { data } = await api.post('/auth/login', { email, password, tenantSlug });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('tenant', JSON.stringify(data.tenant));
    setUser(data.user);
    setTenant(data.tenant);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setUser(null);
    setTenant(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenant, login, logout, isAdmin: user?.role === 'admin' || user?.role === 'superadmin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
