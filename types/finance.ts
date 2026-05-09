export type AccountType =
  | 'checking' | 'savings' | 'credit_card'
  | 'personal_loan' | 'mortgage' | 'auto_loan' | 'student_loan';

export type ExpenseCategory =
  | 'rent' | 'mortgage' | 'utility' | 'insurance'
  | 'subscription' | 'transportation' | 'childcare' | 'other';

export type GoalType =
  | 'emergency_fund' | 'debt_payoff' | 'savings'
  | 'retirement' | 'custom';

export interface User {
  id: string;
  email?: string;
  display_name?: string;
  monthly_net_income: number;
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  employer_401k_match_percent: number;
  employer_401k_match_limit_percent: number;
  current_401k_contribution_percent: number;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  apr?: number;
  credit_limit?: number;
  minimum_payment?: number;
  due_day?: number;
  notes?: string;
}

export interface FixedExpense {
  id: string;
  user_id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  due_day?: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id?: string;
  date: string;
  amount: number;
  category?: string;
  description?: string;
  imported: boolean;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  type: GoalType;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  priority: number;
}

export interface FinancialSnapshot {
  user: User;
  accounts: Account[];
  expenses: FixedExpense[];
  goals: Goal[];
  derived: {
    total_assets: number;
    total_debt: number;
    net_worth: number;
    weighted_avg_debt_apr: number;
    monthly_fixed_obligations: number;
    monthly_minimum_debt_payments: number;
    discretionary_income: number;
    debt_to_income_ratio: number;
    months_of_expenses_in_savings: number;
  };
}

export interface Allocation {
  target: string;
  account_id?: string;
  amount: number;
  category: 'debt_payment' | 'emergency_fund' | 'retirement' | 'investment' | 'goal' | 'discretionary';
  reason: string;
}

export interface Advice {
  summary: string;
  allocations: Allocation[];
  warnings: string[];
  next_milestone: string;
  generated_at: string;
}
