import { createServerSupabaseClient } from '@/lib/supabase';
import { computeDerived } from '@/lib/calculations';
import type { FinancialSnapshot } from '@/types/finance';

export async function buildSnapshot(userId: string): Promise<FinancialSnapshot> {
  const supabase = createServerSupabaseClient();

  const [userRes, accountsRes, expensesRes, goalsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('accounts').select('*').eq('user_id', userId),
    supabase.from('fixed_expenses').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
  ]);

  if (userRes.error) throw new Error(`Failed to fetch user: ${userRes.error.message}`);
  if (accountsRes.error) throw new Error(`Failed to fetch accounts: ${accountsRes.error.message}`);
  if (expensesRes.error) throw new Error(`Failed to fetch expenses: ${expensesRes.error.message}`);
  if (goalsRes.error) throw new Error(`Failed to fetch goals: ${goalsRes.error.message}`);

  const user = userRes.data;
  const accounts = accountsRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const goals = goalsRes.data ?? [];

  const derived = computeDerived(accounts, expenses, user.monthly_net_income);

  return { user, accounts, expenses, goals, derived };
}
