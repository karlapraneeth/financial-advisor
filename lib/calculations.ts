import type { Account, FixedExpense } from '@/types/finance';

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

  // Weighted average APR across debt accounts with known APR
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
