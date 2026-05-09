import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: 'positive' | 'negative' | 'neutral';
}

export function StatCard({ label, value, sub, trend = 'neutral' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold',
          trend === 'positive' && 'text-emerald-600',
          trend === 'negative' && 'text-red-600',
          trend === 'neutral' && 'text-gray-900'
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
