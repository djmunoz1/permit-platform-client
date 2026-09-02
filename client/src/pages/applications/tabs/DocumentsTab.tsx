import { Plus, FileText, Download, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface Props { app: any; }

export default function DocumentsTab({ app }: Props) {
  const documents: any[] = app.documents ?? [];

  return (
    <div className="p-6">
      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Documents</h3>
          <button className="btn-secondary text-xs"><Plus size={12} /> Upload Document</button>
        </div>
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No documents uploaded yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['File Name', 'Type', 'Uploaded By', 'Date', 'Size', 'Approved'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documents.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400" />
                      <span className="text-primary-600 hover:underline cursor-pointer text-xs">{doc.file_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{doc.document_type ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{doc.uploaded_by_name ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{doc.created_at ? format(new Date(doc.created_at), 'M/d/yyyy') : '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : '—'}</td>
                  <td className="px-4 py-2">
                    {doc.is_approved === true ? (
                      <CheckCircle size={14} className="text-green-500" />
                    ) : doc.is_approved === false ? (
                      <XCircle size={14} className="text-red-500" />
                    ) : (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
