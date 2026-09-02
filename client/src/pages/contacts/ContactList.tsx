import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Plus, Search, Mail, Phone } from 'lucide-react';

export default function ContactList() {
  const [search, setSearch] = useState('');

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => api.get('/contacts', { params: { search: search || undefined } }).then(r => r.data),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Contacts</h1>
            <p className="text-xs text-gray-500">{contacts.length} contacts</p>
          </div>
          <Link to="/contacts/new" className="btn-primary"><Plus size={14} /> New Contact</Link>
        </div>
        <div className="relative max-w-xs mt-4">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              {['Name', 'Email', 'Phone', 'Address', 'Applications'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No contacts found.</td></tr>
            ) : contacts.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/contacts/${c.id}`} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {c.first_name?.[0]}{c.last_name?.[0]}
                    </div>
                    <span className="font-medium text-primary-600 hover:underline">{c.first_name} {c.last_name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-gray-600 hover:text-primary-600">
                      <Mail size={12} />{c.email}
                    </a>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {c.phone ? (
                    <span className="flex items-center gap-1 text-gray-600"><Phone size={12} />{c.phone}</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {[c.address_city, c.address_state].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="badge bg-gray-100 text-gray-600">{c.application_count}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
