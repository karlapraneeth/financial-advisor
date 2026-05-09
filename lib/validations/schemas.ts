import { z } from 'zod';

export const accountTypeSchema = z.enum([
  'checking', 'savings', 'credit_card',
  'personal_loan', 'mortgage', 'auto_loan', 'student_loan',
]);

export const expenseCategorySchema = z.enum([
  'rent', 'mortgage', 'utility', 'insurance',
  'subscription', 'transportation', 'childcare', 'other',
]);

export const goalTypeSchema = z.enum([
  'emergency_fund', 'debt_payoff', 'savings', 'retirement', 'custom',
]);

export const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  display_name: z.string().min(1).max(100).optional(),
  monthly_net_income: z.number().min(0).optional(),
  pay_frequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']).optional(),
  employer_401k_match_percent: z.number().min(0).max(100).optional(),
  employer_401k_match_limit_percent: z.number().min(0).max(100).optional(),
  current_401k_contribution_percent: z.number().min(0).max(100).optional(),
});

export const accountCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: accountTypeSchema,
  balance: z.number(),
  apr: z.number().min(0).max(100).optional(),
  credit_limit: z.number().min(0).optional(),
  minimum_payment: z.number().min(0).optional(),
  due_day: z.number().int().min(1).max(31).optional(),
  notes: z.string().max(500).optional(),
});

export const accountUpdateSchema = accountCreateSchema.partial();

export const expenseCreateSchema = z.object({
  name: z.string().min(1).max(200),
  category: expenseCategorySchema,
  amount: z.number().min(0),
  due_day: z.number().int().min(1).max(31).optional(),
});

export const expenseUpdateSchema = expenseCreateSchema.partial();

export const transactionCreateSchema = z.object({
  account_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number(),
  category: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const transactionQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  account_id: z.string().uuid().optional(),
});

export const goalCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: goalTypeSchema,
  target_amount: z.number().min(0),
  current_amount: z.number().min(0).optional().default(0),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.number().int().min(1).max(10).optional().default(5),
});

export const goalUpdateSchema = goalCreateSchema.partial();
