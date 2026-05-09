'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import type { FinancialSnapshot, Advice } from '@/types/finance';

const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#06b6d4',
];

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [latestAdvice, setLatestAdvice] = useState<{ advice: Advice; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [snapRes, adviceRes] = await Promise.all([
        fetch('/api/snapshot'),
        fetch('/api/advise'),
      ]);
      if (snapRes.ok) setSnapshot(await snapRes.json());
      if (adviceRes.ok) {
        const history = await adviceRes.json();
        if (history.length > 0) setLatestAdvice(history[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!snapshot) {
    return <p className="text-red-600 text-sm">Failed to load snapshot. Check your environment variables and Supabase setup.</p>;
  }

  const { derived, accounts, expenses, spending } = snapshot;

  const debtAccounts = accounts
    .filter((a) =>
      ['credit_card', 'personal_loan', 'mortgage', 'auto_loan', 'student_loan'].includes(a.type) &&
      a.apr != null
    )
    .sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0));

  const expenseData = expenses.map((e) => ({ name: e.name, value: e.amount }));

  // Spending by category chart data — merge uncategorized as its own slice
  const spendingData = spending
    ? [
        ...spending.by_category.map((c) => ({ name: c.category, value: c.amount })),
        ...(spending.uncategorized_spend > 0
          ? [{ name: 'Uncategorized', value: spending.uncategorized_spend }]
          : []),
      ]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net Worth"
          value={formatCurrency(derived.net_worth)}
          trend={derived.net_worth >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Total Debt"
          value={formatCurrency(derived.total_debt)}
          trend={derived.total_debt > 0 ? 'negative' : 'positive'}
        />
        <StatCard
          label="Monthly Cash Flow"
          value={formatCurrency(derived.discretionary_income)}
          sub="after obligations & minimums"
          trend={derived.discretionary_income >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Emergency Fund"
          value={`${derived.months_of_expenses_in_savings.toFixed(1)} mo`}
          sub="of fixed expenses covered"
          trend={derived.months_of_expenses_in_savings >= 3 ? 'positive' : 'negative'}
        />
      </div>

      {/* Spending insight cards — only shown when transaction data exists */}
      {spending && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Actual Spend (30d)"
            value={formatCurrency(spending.total_spend)}
            sub={`${spending.transaction_count} transactions`}
            trend={spending.total_spend > derived.discretionary_income + derived.monthly_fixed_obligations + derived.monthly_minimum_debt_payments ? 'negative' : 'neutral'}
          />
          <StatCard
            label="Income Detected (30d)"
            value={formatCurrency(spending.total_income_detected)}
            sub="from transaction credits"
            trend="neutral"
          />
          <StatCard
            label="Top Spend Category"
            value={spending.by_category[0]?.category ?? '—'}
            sub={spending.by_category[0] ? formatCurrency(spending.by_category[0].amount) : ''}
            trend="neutral"
          />
          <StatCard
            label="Uncategorized Spend"
            value={formatCurrency(spending.uncategorized_spend)}
            sub="no category tagged"
            trend={spending.uncategorized_spend > spending.total_spend * 0.3 ? 'negative' : 'neutral'}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Actual spending by category */}
        {spending && spendingData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Actual Spending by Category</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Last 30 days · {spending.period_start} → {spending.period_end}
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={spendingData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tickFormatter={(v) => `$${v}`} fontSize={11} />
                  <YAxis dataKey="name" type="category" width={120} fontSize={11} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v))]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {spendingData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top merchants */}
        {spending && spending.top_merchants.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Top Merchants (30d)</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-100">
                {spending.top_merchants.slice(0, 8).map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700 truncate">{m.description}</span>
                      <span className="text-xs text-gray-400 shrink-0">×{m.count}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 ml-4 shrink-0">
                      {formatCurrency(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debts by APR */}
        <Card>
          <CardHeader><CardTitle>Debts by APR</CardTitle></CardHeader>
          <CardContent>
            {debtAccounts.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No debt accounts with APR.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={debtAccounts} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} fontSize={11} />
                  <YAxis dataKey="name" type="category" width={130} fontSize={11} />
                  <Tooltip formatter={(v) => [`${v}% APR`]} />
                  <Bar dataKey="apr" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fixed expense breakdown */}
        <Card>
          <CardHeader><CardTitle>Fixed Expense Breakdown</CardTitle></CardHeader>
          <CardContent>
            {expenseData.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No expenses added.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expenseData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                    {expenseData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(Number(v))]} />
                  <Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* No transaction data prompt */}
      {!spending && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 text-sm text-indigo-700">
          <span className="font-medium">No transaction data yet.</span>{' '}
          Import a bank statement on the{' '}
          <Link href="/transactions" className="underline font-medium">Transactions</Link>{' '}
          page to unlock actual spending insights and more accurate AI advice.
        </div>
      )}

      {/* Latest advice */}
      {latestAdvice ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest Advice</CardTitle>
            <span className="text-xs text-gray-400">{new Date(latestAdvice.created_at).toLocaleDateString()}</span>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 mb-4">{latestAdvice.advice.summary}</p>
            <Link href="/advice">
              <Button variant="secondary" size="sm">View Full Advice</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-10 gap-3">
            <p className="text-gray-500 text-sm">No advice generated yet.</p>
            <Link href="/advice">
              <Button>Get Your First Advice</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
