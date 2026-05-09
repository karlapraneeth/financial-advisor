'use client';

import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import AllocationChart from '@/components/AllocationChart';
import { formatCurrency } from '@/lib/utils';
import type { Advice } from '@/types/finance';

const CATEGORY_LABELS: Record<string, string> = {
  debt_payment: 'Debt Payment',
  emergency_fund: 'Emergency Fund',
  retirement: 'Retirement',
  investment: 'Investment',
  goal: 'Goal',
  discretionary: 'Discretionary',
};

const CATEGORY_COLORS: Record<string, string> = {
  debt_payment: 'bg-red-100 text-red-700',
  emergency_fund: 'bg-amber-100 text-amber-700',
  retirement: 'bg-indigo-100 text-indigo-700',
  investment: 'bg-emerald-100 text-emerald-700',
  goal: 'bg-blue-100 text-blue-700',
  discretionary: 'bg-purple-100 text-purple-700',
};

export default function AdviceCard({ advice }: { advice: Advice }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-800 text-base leading-relaxed">{advice.summary}</p>
          <p className="text-xs text-gray-400 mt-3">Generated {new Date(advice.generated_at).toLocaleString()}</p>
        </CardContent>
      </Card>

      {/* Warnings */}
      {advice.warnings.length > 0 && (
        <div className="space-y-2">
          {advice.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Allocations list */}
      <Card>
        <CardHeader><CardTitle>Monthly Allocations</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {advice.allocations.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No allocations recommended (check warnings above).</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {advice.allocations.map((a, i) => (
                <div key={i} className="py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={15} className="text-indigo-500 shrink-0" />
                      <span className="font-medium text-gray-900 text-sm">{a.target}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[a.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {CATEGORY_LABELS[a.category] ?? a.category}
                      </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(a.amount)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 ml-5">{a.reason}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pie chart */}
      {advice.allocations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Allocation Breakdown</CardTitle></CardHeader>
          <CardContent>
            <AllocationChart allocations={advice.allocations} />
          </CardContent>
        </Card>
      )}

      {/* Next milestone */}
      <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
        <TrendingUp size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-indigo-700 mb-0.5">Next Milestone</p>
          <p className="text-sm text-indigo-800">{advice.next_milestone}</p>
        </div>
      </div>
    </div>
  );
}
