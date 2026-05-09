'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Allocation } from '@/types/finance';
import { formatCurrency } from '@/lib/utils';

const COLORS: Record<string, string> = {
  debt_payment: '#ef4444',
  emergency_fund: '#f59e0b',
  retirement: '#6366f1',
  investment: '#10b981',
  goal: '#3b82f6',
  discretionary: '#8b5cf6',
};

interface AllocationChartProps {
  allocations: Allocation[];
}

export default function AllocationChart({ allocations }: AllocationChartProps) {
  const data = allocations.map((a) => ({
    name: a.target,
    value: a.amount,
    category: a.category,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={COLORS[entry.category] ?? '#94a3b8'} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
