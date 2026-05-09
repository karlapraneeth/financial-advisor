import type { Account, FixedExpense, Transaction, TransactionSummary } from '@/types/finance';

const DEBT_TYPES = new Set(['credit_card', 'personal_loan', 'mortgage', 'auto_loan', 'student_loan']);
const ASSET_TYPES = new Set(['checking', 'savings']);

export function computeDerived(
  accounts: Account[],
  expenses: FixedExpense[],
  monthlyNetIncome: number
) {
  const debtAccounts = accounts.filter((a) => DEBT_TYPES.has(a.type));
  const assetAccounts = accounts.filter((a) => ASSET_TYPES.has(a.type));
  const savingsAccounts = accounts.filter((a) => a.type === 'savings');

  const total_assets = assetAccounts.reduce((s, a) => s + a.balance, 0);
  const total_debt = debtAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);
  const net_worth = total_assets - total_debt;

  const debtWithApr = debtAccounts.filter((a) => a.apr != null && a.balance > 0);
  const totalDebtForApr = debtWithApr.reduce((s, a) => s + Math.abs(a.balance), 0);
  const weighted_avg_debt_apr =
    totalDebtForApr > 0
      ? debtWithApr.reduce((s, a) => s + Math.abs(a.balance) * (a.apr ?? 0), 0) / totalDebtForApr
      : 0;

  const monthly_fixed_obligations = expenses.reduce((s, e) => s + e.amount, 0);
  const monthly_minimum_debt_payments = debtAccounts.reduce(
    (s, a) => s + (a.minimum_payment ?? 0),
    0
  );

  const discretionary_income =
    monthlyNetIncome - monthly_fixed_obligations - monthly_minimum_debt_payments;

  const debt_to_income_ratio =
    monthlyNetIncome > 0 ? monthly_minimum_debt_payments / monthlyNetIncome : 0;

  const total_savings = savingsAccounts.reduce((s, a) => s + a.balance, 0);
  const months_of_expenses_in_savings =
    monthly_fixed_obligations > 0 ? total_savings / monthly_fixed_obligations : 0;

  return {
    total_assets,
    total_debt,
    net_worth,
    weighted_avg_debt_apr,
    monthly_fixed_obligations,
    monthly_minimum_debt_payments,
    discretionary_income,
    debt_to_income_ratio,
    months_of_expenses_in_savings,
  };
}

/**
 * Compute a spending summary from the last `periodDays` days of transactions.
 * Outflows (negative amounts) = spend. Inflows (positive) = income detected.
 */
export function computeTransactionSummary(
  transactions: Transaction[],
  periodDays = 30
): TransactionSummary | null {
  if (transactions.length === 0) return null;

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - periodDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const recent = transactions.filter((t) => t.date >= cutoffStr);
  if (recent.length === 0) return null;

  // Separate outflows (spend) from inflows (income/credits)
  const outflows = recent.filter((t) => t.amount < 0);
  const inflows  = recent.filter((t) => t.amount > 0);

  const total_spend = outflows.reduce((s, t) => s + Math.abs(t.amount), 0);
  const total_income_detected = inflows.reduce((s, t) => s + t.amount, 0);

  // Group spend by category
  const categoryMap = new Map<string, { amount: number; count: number }>();
  let uncategorized_spend = 0;

  for (const t of outflows) {
    const key = t.category?.trim() || '';
    if (!key) {
      uncategorized_spend += Math.abs(t.amount);
      continue;
    }
    const entry = categoryMap.get(key) ?? { amount: 0, count: 0 };
    entry.amount += Math.abs(t.amount);
    entry.count += 1;
    categoryMap.set(key, entry);
  }

  const by_category = Array.from(categoryMap.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.amount - a.amount);

  // Top merchants by total outflow spend
  const merchantMap = new Map<string, { amount: number; count: number }>();
  for (const t of outflows) {
    const key = (t.description ?? 'Unknown').trim();
    const entry = merchantMap.get(key) ?? { amount: 0, count: 0 };
    entry.amount += Math.abs(t.amount);
    entry.count += 1;
    merchantMap.set(key, entry);
  }

  const top_merchants = Array.from(merchantMap.entries())
    .map(([description, v]) => ({ description, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return {
    period_days: periodDays,
    period_start: cutoffStr,
    period_end: todayStr,
    total_spend,
    total_income_detected,
    by_category,
    top_merchants,
    uncategorized_spend,
    transaction_count: recent.length,
  };
}
