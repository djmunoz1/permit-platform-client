import { Construction } from 'lucide-react';

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-gray-400">
        <Construction size={36} className="mx-auto mb-3 text-gray-300" />
        <h2 className="text-base font-semibold text-gray-600">{title}</h2>
        <p className="text-sm mt-1">Coming soon — data model and API are ready.</p>
      </div>
    </div>
  );
}
