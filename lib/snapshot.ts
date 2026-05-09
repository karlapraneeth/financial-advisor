import { createServerSupabaseClient } from '@/lib/supabase';
import { computeDerived, computeTransactionSummary } from '@/lib/calculations';
import type { FinancialSnapshot } from '@/types/finance';

export async function buildSnapshot(userId: string): Promise<FinancialSnapshot> {
  const supabase = createServerSupabaseClient();

  const [userRes, accountsRes, expensesRes, goalsRes, txRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('accounts').select('*').eq('user_id', userId),
    supabase.from('fixed_expenses').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
    // Fetch last 60 days so computeTransactionSummary can use a 30-day window
    // and we have enough data for trend comparisons if needed later.
    supabase
      .from('transactions')
      .select('id, user_id, account_id, date, amount, category, description, imported')
      .eq('user_id', userId)
      .gte('date', (() => {
        const d = new Date();
        d.setDate(d.getDate() - 60);
        return d.toISOString().split('T')[0];
      })())
      .order('date', { ascending: false }),
  ]);

  if (userRes.error) throw new Error(`Failed to fetch user: ${userRes.error.message}`);
  if (accountsRes.error) throw new Error(`Failed to fetch accounts: ${accountsRes.error.message}`);
  if (expensesRes.error) throw new Error(`Failed to fetch expenses: ${expensesRes.error.message}`);
  if (goalsRes.error) throw new Error(`Failed to fetch goals: ${goalsRes.error.message}`);
  if (txRes.error) throw new Error(`Failed to fetch transactions: ${txRes.error.message}`);

  const user = userRes.data;
  const accounts = accountsRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const goals = goalsRes.data ?? [];
  const transactions = txRes.data ?? [];

  const derived = computeDerived(accounts, expenses, user.monthly_net_income);
  const spending = computeTransactionSummary(transactions, 30);

  return { user, accounts, expenses, goals, spending, derived };
}
