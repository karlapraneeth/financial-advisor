# Personal AI Financial Advisor — Implementation Specification

**Audience:** Claude Sonnet (or any capable code-generation agent)
**Goal:** Build a working MVP of the Personal AI Financial Advisor described below, end-to-end.
**Deliverable:** A deployable Next.js application that runs on Vercel free tier with $0/month operating cost.

---

## 1. Product Overview

A web application that ingests a user's complete financial state (income, credit cards, loans, mortgage, rent, utilities, savings, goals) and uses a large language model to generate a personalized monthly cash-allocation plan.

**Phase 1 scope (this spec):** Single-user MVP. The user manually enters their data (with optional CSV import for transactions) and clicks "Get Advice" to receive a ranked allocation recommendation with reasoning.

**Phase 2 (future, design for it but do not build):** Add household/multi-user support so a spouse can share the same financial picture.

---

## 2. Tech Stack (Non-Negotiable)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 14+** (App Router, TypeScript) | One repo for frontend + backend |
| Database | **Supabase (Postgres)** | Free tier; use `@supabase/supabase-js` |
| LLM | **Groq API** (`llama-3.3-70b-versatile`) | Free tier; abstract behind a swappable interface |
| Hosting | **Vercel** | Free tier |
| Styling | **Tailwind CSS** | Default Next.js setup |
| Charts | **Recharts** | For dashboard visualizations |
| Form handling | **react-hook-form + zod** | Validation everywhere |

**Do not** introduce additional services (Plaid, Stripe, etc.) in Phase 1. **Do not** use SQLite — Vercel is serverless, no persistent filesystem.

---

## 3. Repository Structure

```
financial-advisor/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard (home)
│   ├── accounts/
│   │   └── page.tsx                # Manage accounts
│   ├── expenses/
│   │   └── page.tsx                # Manage fixed expenses
│   ├── transactions/
│   │   └── page.tsx                # Transaction list + CSV upload
│   ├── goals/
│   │   └── page.tsx                # Goal tracking
│   ├── advice/
│   │   └── page.tsx                # AI advisor view
│   └── api/
│       ├── accounts/
│       │   ├── route.ts            # GET, POST
│       │   └── [id]/route.ts       # PUT, DELETE
│       ├── expenses/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── transactions/
│       │   ├── route.ts            # GET, POST
│       │   └── import/route.ts     # POST CSV
│       ├── goals/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── user/route.ts           # GET, PUT user profile (income)
│       ├── snapshot/route.ts       # GET full financial state
│       └── advise/route.ts         # POST → returns LLM advice
├── lib/
│   ├── supabase.ts                 # Supabase client (server + browser)
│   ├── llm/
│   │   ├── index.ts                # Abstract interface
│   │   ├── groq.ts                 # Groq implementation
│   │   └── claude.ts               # Stub for future swap
│   ├── snapshot.ts                 # Builds financial snapshot JSON
│   ├── prompts/
│   │   └── advisor.ts              # The system prompt
│   ├── csv.ts                      # CSV parsing helpers
│   └── calculations.ts             # Net worth, DTI, etc.
├── components/
│   ├── ui/                         # Reusable atoms (Button, Input, Card)
│   ├── Dashboard.tsx
│   ├── AccountForm.tsx
│   ├── AccountList.tsx
│   ├── ExpenseForm.tsx
│   ├── ExpenseList.tsx
│   ├── TransactionTable.tsx
│   ├── GoalCard.tsx
│   ├── AdviceCard.tsx
│   ├── AllocationChart.tsx
│   └── Nav.tsx
├── types/
│   └── finance.ts                  # All shared types
├── lib/validations/
│   └── schemas.ts                  # Zod schemas
├── .env.local                      # SUPABASE_URL, SUPABASE_ANON_KEY, GROQ_API_KEY
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. Database Schema (Supabase / Postgres)

Create these tables via the Supabase SQL editor. **All tables include `user_id UUID` from day one** so Phase 2 multi-user is a non-event.

### `users`
```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  monthly_net_income numeric(12,2) default 0,
  pay_frequency text default 'monthly' check (pay_frequency in ('weekly','biweekly','semimonthly','monthly')),
  employer_401k_match_percent numeric(5,2) default 0,
  employer_401k_match_limit_percent numeric(5,2) default 0,
  current_401k_contribution_percent numeric(5,2) default 0,
  created_at timestamptz default now()
);
```

### `accounts`
```sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('checking','savings','credit_card','personal_loan','mortgage','auto_loan','student_loan')),
  balance numeric(12,2) not null default 0,
  apr numeric(6,3),                    -- nullable for non-debt accounts
  credit_limit numeric(12,2),          -- credit cards only
  minimum_payment numeric(12,2),       -- debt accounts only
  due_day int check (due_day between 1 and 31),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### `fixed_expenses`
```sql
create table fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('rent','mortgage','utility','insurance','subscription','transportation','childcare','other')),
  amount numeric(12,2) not null,
  due_day int check (due_day between 1 and 31),
  created_at timestamptz default now()
);
```

### `transactions`
```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  account_id uuid references accounts(id) on delete set null,
  date date not null,
  amount numeric(12,2) not null,       -- negative = outflow, positive = inflow
  category text,
  description text,
  imported boolean default false,
  created_at timestamptz default now()
);
```

### `goals`
```sql
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  type text check (type in ('emergency_fund','debt_payoff','savings','retirement','custom')),
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) default 0,
  target_date date,
  priority int default 5,
  created_at timestamptz default now()
);
```

### `advice_history`
```sql
create table advice_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  snapshot jsonb not null,             -- the input given to the LLM
  advice jsonb not null,               -- the structured response
  model text,                          -- e.g. 'llama-3.3-70b-versatile'
  created_at timestamptz default now()
);
```

**Phase 1 simplification:** Hardcode a single user row (e.g. seed one user with a known UUID and store it in `.env.local` as `DEFAULT_USER_ID`). All API routes use that ID. This keeps auth out of Phase 1. Phase 2 will swap in Supabase Auth.

### Row-Level Security (Required, Even in Phase 1)

Even with a single user, the Vercel deployment is publicly accessible. RLS provides defense-in-depth: if the anon key is ever exposed (e.g. in a frontend bundle or a leaked screenshot), only rows belonging to `DEFAULT_USER_ID` are reachable.

**Enable RLS on every table** and add policies scoped to `DEFAULT_USER_ID`. Run this after creating the tables:

```sql
-- Store the default user ID as a database setting for use in policies
-- Replace <YOUR_DEFAULT_USER_UUID> with the seed user UUID
alter database postgres set app.default_user_id = '<YOUR_DEFAULT_USER_UUID>';

-- Enable RLS
alter table users enable row level security;
alter table accounts enable row level security;
alter table fixed_expenses enable row level security;
alter table transactions enable row level security;
alter table goals enable row level security;
alter table advice_history enable row level security;

-- Helper: returns the configured default user ID
create or replace function default_user_id() returns uuid as $$
  select current_setting('app.default_user_id')::uuid;
$$ language sql stable;

-- Policies: anon role can only access rows for the default user
-- (Phase 2 will replace these with auth.uid() = user_id)

create policy "anon can read own user" on users
  for select using (id = default_user_id());
create policy "anon can update own user" on users
  for update using (id = default_user_id());

create policy "anon all on own accounts" on accounts
  for all using (user_id = default_user_id());
create policy "anon all on own expenses" on fixed_expenses
  for all using (user_id = default_user_id());
create policy "anon all on own transactions" on transactions
  for all using (user_id = default_user_id());
create policy "anon all on own goals" on goals
  for all using (user_id = default_user_id());
create policy "anon all on own advice" on advice_history
  for all using (user_id = default_user_id());
```

**Important:**
- Server-side API routes use the **service role key** (which bypasses RLS) — that's expected and correct, since auth is enforced at the API layer in Phase 1.
- The **anon key** (which the browser would see if used directly) is now blocked from touching anything except the default user's data. This is the safety net.
- In Phase 2, swap `default_user_id()` for `auth.uid()` in every policy.

---

## 5. TypeScript Types (`types/finance.ts`)

Define all of these at the start. Keep them as the single source of truth.

```typescript
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
    discretionary_income: number;       // income - fixed - minimums
    debt_to_income_ratio: number;
    months_of_expenses_in_savings: number;
  };
}

export interface Allocation {
  target: string;                       // e.g. "Chase Sapphire credit card"
  account_id?: string;                  // link back when applicable
  amount: number;
  category: 'debt_payment' | 'emergency_fund' | 'retirement'
          | 'investment' | 'goal' | 'discretionary';
  reason: string;
}

export interface Advice {
  summary: string;                      // 2-3 sentence headline
  allocations: Allocation[];            // ordered by priority
  warnings: string[];                   // e.g. high DTI, no emergency fund
  next_milestone: string;               // forward-looking goal
  generated_at: string;
}
```

---

## 6. Snapshot Builder (`lib/snapshot.ts`)

A pure function that, given a `user_id`, queries Supabase and assembles a `FinancialSnapshot`. Compute the `derived` block here so the LLM gets pre-calculated numbers (don't make it do math).

**Required calculations:**

- `total_assets` = sum of balances where type ∈ {checking, savings}
- `total_debt` = sum of balances where type ∈ {credit_card, personal_loan, mortgage, auto_loan, student_loan}
- `net_worth` = total_assets − total_debt
- `weighted_avg_debt_apr` = Σ(balance × apr) / Σ(balance) over debt accounts
- `monthly_fixed_obligations` = sum of fixed_expenses.amount
- `monthly_minimum_debt_payments` = sum of accounts.minimum_payment for debt accounts
- `discretionary_income` = monthly_net_income − monthly_fixed_obligations − monthly_minimum_debt_payments
- `debt_to_income_ratio` = monthly_minimum_debt_payments / monthly_net_income
- `months_of_expenses_in_savings` = total_savings_balance / monthly_fixed_obligations

---

## 7. LLM Abstraction (`lib/llm/`)

### `lib/llm/index.ts`
```typescript
export interface LLMProvider {
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export function getLLM(): LLMProvider {
  // Read env var LLM_PROVIDER, default 'groq'
  // Return matching implementation
}
```

### `lib/llm/groq.ts`
- Use Groq SDK or fetch directly to `https://api.groq.com/openai/v1/chat/completions`
- Model: `llama-3.3-70b-versatile`
- Use `response_format: { type: "json_object" }` to force JSON output
- Temperature: 0.3 (we want consistent, conservative advice)
- Max tokens: 2000

### `lib/llm/claude.ts`
- Stub only. Same interface. Make it easy to swap later by setting `LLM_PROVIDER=claude` and adding `ANTHROPIC_API_KEY`.

---

## 8. The Advisor System Prompt (`lib/prompts/advisor.ts`)

This is the core of the product. The prompt must encode personal finance best practices so the LLM applies them consistently. Use the following template verbatim, then expand if needed:

```
You are a careful, evidence-based personal finance advisor. You will be given a JSON
snapshot of the user's complete financial picture. Your job is to recommend exactly
how the user should allocate their DISCRETIONARY income this month — that is, the
money left over after all fixed obligations and minimum debt payments are paid.

You MUST follow this priority waterfall, in order:

1. CAPTURE EMPLOYER 401(K) MATCH FIRST.
   If the user is contributing less than the employer match limit, allocate enough
   to capture the full match. This is free money with an immediate 100% return.

2. STARTER EMERGENCY FUND.
   If the user has less than $1,000 in liquid savings, prioritize building it to
   $1,000–$2,000 before aggressive debt paydown.

3. HIGH-INTEREST DEBT (APR > 7%).
   Use the AVALANCHE method: target the highest-APR debt first. Credit cards almost
   always come first here. Recommend extra payment beyond minimums.

4. FULL EMERGENCY FUND.
   Build liquid savings to 3–6 months of fixed obligations. Lean toward 3 months
   if income is stable, 6 if not.

5. TAX-ADVANTAGED INVESTING.
   Roth IRA, HSA if available, then maxing 401(k).

6. MODERATE-INTEREST DEBT (4–7% APR).
   Personal loans, auto loans. Pay down faster.

7. LOW-INTEREST DEBT (< 4% APR) and TAXABLE INVESTING.
   Mortgage extra payments or brokerage investments. Personal preference dictates.

CONSTRAINTS:
- Allocations must sum to AT MOST the user's discretionary_income.
- Never recommend skipping a minimum payment — those are already covered.
- If discretionary_income is negative or zero, do NOT recommend allocations.
  Instead, return warnings about cash flow and suggest expense reduction.
- Cite specific account names and amounts in your reasoning.
- Be direct. Avoid hedging language like "you might consider" — say "pay $X to Y."

OUTPUT FORMAT:
You MUST return valid JSON matching this exact schema:

{
  "summary": "string, 2-3 sentences",
  "allocations": [
    {
      "target": "string, e.g. 'Chase Sapphire credit card'",
      "account_id": "string or null, the UUID if known",
      "amount": number,
      "category": "debt_payment | emergency_fund | retirement | investment | goal | discretionary",
      "reason": "string, 1-2 sentences citing specific numbers"
    }
  ],
  "warnings": ["string", ...],
  "next_milestone": "string, forward-looking goal with date if possible"
}

Do not include any text outside the JSON object.
```

The user message sent to the LLM is the full `FinancialSnapshot` JSON, prefaced with: `"Here is the user's current financial snapshot. Generate the monthly allocation plan."`

---

## 9. API Routes

All routes live under `app/api/`. Use Next.js Route Handlers (not Pages API). Each handler should:

1. Read `DEFAULT_USER_ID` from env (Phase 1 stub auth).
2. Validate input with the corresponding zod schema.
3. Hit Supabase via the server client.
4. Return JSON with appropriate status codes (200, 201, 400, 404, 500).

**Endpoints to implement:**

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/api/user` | — | User |
| PUT | `/api/user` | Partial<User> | User |
| GET | `/api/accounts` | — | Account[] |
| POST | `/api/accounts` | Account input | Account |
| PUT | `/api/accounts/[id]` | Partial<Account> | Account |
| DELETE | `/api/accounts/[id]` | — | { success: true } |
| GET | `/api/expenses` | — | FixedExpense[] |
| POST | `/api/expenses` | input | FixedExpense |
| PUT | `/api/expenses/[id]` | partial | FixedExpense |
| DELETE | `/api/expenses/[id]` | — | { success: true } |
| GET | `/api/transactions` | ?from&to&account_id | Transaction[] |
| POST | `/api/transactions` | input | Transaction |
| POST | `/api/transactions/import` | multipart CSV | { imported: number } |
| GET | `/api/goals` | — | Goal[] |
| POST | `/api/goals` | input | Goal |
| PUT | `/api/goals/[id]` | partial | Goal |
| DELETE | `/api/goals/[id]` | — | { success: true } |
| GET | `/api/snapshot` | — | FinancialSnapshot |
| POST | `/api/advise` | — | Advice (also persists to advice_history) |

---

## 10. CSV Import Specification

Accept the most common bank/credit-card CSV format:

| Column | Required | Notes |
|---|---|---|
| Date | yes | YYYY-MM-DD or MM/DD/YYYY |
| Description | yes | maps to `description` |
| Amount | yes | negative = outflow |
| Category | no | passes through if present |

**Implementation:**

- Use `papaparse` for parsing.
- Endpoint: `POST /api/transactions/import` accepts multipart/form-data with fields `file` (the CSV) and `account_id`.
- Skip rows with missing required fields; report the count.
- Set `imported: true` on inserted rows.
- Return `{ imported: number, skipped: number, errors: string[] }`.

---

## 11. Frontend Pages

### Dashboard (`/`)
- Top row: 4 stat cards — Net Worth, Total Debt, Monthly Cash Flow, Emergency Fund (months).
- Middle: bar chart of debts ordered by APR (Recharts).
- Right: pie chart of fixed expense breakdown.
- Bottom: most recent advice summary (if any) with "View Full Advice" button.

### Accounts (`/accounts`)
- Tabbed view: Bank Accounts | Credit Cards | Loans | Mortgage.
- Each tab shows a list with edit/delete buttons.
- "+ Add Account" button opens a modal form.

### Expenses (`/expenses`)
- Simple list grouped by category.
- Add/edit/delete inline or via modal.

### Transactions (`/transactions`)
- Table view with date filter and account filter.
- "Import CSV" button at top → file picker + account selector.

### Goals (`/goals`)
- Card grid. Each card shows progress bar (current/target).
- Add/edit/delete.

### Advice (`/advice`)
- Big "Get New Advice" button.
- On click: spinner → fetch `/api/advise` → render `<AdviceCard />`.
- Components inside AdviceCard:
  - Summary block at top
  - Warning banners (red) if any
  - Allocation list with amount + reason for each
  - Pie chart of allocations (Recharts)
  - Next milestone footer
- Below: history of past advice (collapsible, latest 5).

---

## 12. Environment Variables

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
LLM_PROVIDER=groq
DEFAULT_USER_ID=
ANTHROPIC_API_KEY=                  # optional, only if swapping
```

Document in README how to obtain each.

---

## 13. Build Order (Strict)

Execute in this order. Do not skip ahead — each step depends on the prior.

1. **Bootstrap**
   - `npx create-next-app@latest financial-advisor --typescript --tailwind --app --eslint`
   - Install runtime deps: `npm install @supabase/supabase-js @supabase/ssr groq-sdk papaparse react-hook-form @hookform/resolvers zod recharts lucide-react`
   - Install dev deps: `npm install -D @types/papaparse`
   - Set up `.env.local`
   - Verify `npm run dev` works

2. **Supabase setup**
   - Create new Supabase project
   - Run all SQL from §4 in the SQL editor
   - Insert one seed user, copy UUID into `DEFAULT_USER_ID`
   - Run the RLS block from §4 with the seed UUID substituted in
   - Verify RLS is on for every table (Supabase dashboard → Authentication → Policies)

3. **Types and validations**
   - Create `types/finance.ts` (§5)
   - Create `lib/validations/schemas.ts` with zod schemas mirroring the types

4. **Supabase client**
   - `lib/supabase.ts` exporting both browser and server clients
   - Use `@supabase/ssr` (`createBrowserClient` / `createServerClient`) — required for proper App Router cookie handling. Do NOT use `@supabase/supabase-js` directly in components.
   - Server-side API routes should use the **service role key** (bypasses RLS by design — auth is enforced at the API layer in Phase 1).
   - The browser client uses the **anon key** and is protected by the RLS policies from §4.

5. **CRUD APIs**
   - Implement all routes in §9 except `/api/snapshot` and `/api/advise`
   - Test each with curl or REST client

6. **Snapshot + calculations**
   - `lib/calculations.ts` for derived numbers
   - `lib/snapshot.ts` to assemble the FinancialSnapshot
   - `/api/snapshot` route

7. **LLM layer**
   - `lib/llm/index.ts`, `lib/llm/groq.ts`, stub `claude.ts`
   - `lib/prompts/advisor.ts` with the full system prompt (§8)
   - `/api/advise` route — calls LLM, parses JSON, persists to `advice_history`

8. **UI shell**
   - `Nav` component with links to all pages
   - Layout in `app/layout.tsx`
   - Reusable UI atoms in `components/ui/`

9. **Pages — accounts, expenses, goals, transactions**
   - Build CRUD UIs in the order listed
   - Each page: list + form modal

10. **Dashboard page** — stat cards + charts

11. **Advice page** — the headline feature

12. **CSV import** — last because it's optional polish

13. **Deploy**
    - Push to GitHub
    - Connect Vercel, set env vars, deploy
    - Smoke test live

---

## 14. Security Posture (Phase 1)

Phase 1 has no auth, but the app is internet-accessible. The defense layers are:

1. **RLS scoped to `DEFAULT_USER_ID`** — if the anon key ever leaks, only the default user's rows are reachable. (§4)
2. **Service role key stays server-side only** — never imported into a client component, never sent to the browser. Verify with `grep -r "SERVICE_ROLE" app/` returning only `app/api/` matches.
3. **All mutations go through API routes** — the browser never writes to Supabase directly.
4. **No Vercel URL sharing** — keep the deployment URL private until Phase 2 auth lands. Optionally set Vercel project to "Password Protection" (free on Hobby tier for preview deploys, paid for production — your call).
5. **Env vars in Vercel are encrypted at rest** — never commit `.env.local`, ensure `.gitignore` covers it (Next.js default does).

**Known Phase 1 limitation:** anyone who learns the production URL can read/write all data. This is acceptable for a single-user app with a non-public URL, but is the #1 reason to ship Phase 2 (Supabase Auth) soon.

## 15. Code Quality Requirements

- **TypeScript strict mode on.** No `any` except where absolutely necessary; comment why.
- **Zod validation on every API input.** Return 400 with the zod error on failure.
- **Errors propagate as `{ error: string }` JSON with proper status codes.**
- **No client-side direct DB access.** Browser → API route → Supabase only.
- **Component files ≤ 200 lines.** Split if larger.
- **Format with Prettier, lint with ESLint** (defaults from create-next-app).
- **Server components by default.** Only mark `'use client'` where interactivity demands it.

---

## 16. Disclaimer (Must Be in UI)

A persistent footer on every page:

> This tool provides educational guidance based on widely accepted personal finance principles. It is not a substitute for advice from a licensed financial advisor, accountant, or tax professional.

---

## 17. Definition of Done

The MVP is complete when:

- [ ] User can add a credit card, loan, mortgage, and bank account from the UI
- [ ] User can add fixed expenses (rent, utilities, etc.)
- [ ] User can set monthly income on the profile page
- [ ] Dashboard shows accurate net worth, total debt, and cash flow
- [ ] Clicking "Get Advice" returns a structured allocation plan in under 10 seconds
- [ ] Advice persists to `advice_history` and can be viewed again
- [ ] CSV import works for at least one major bank's export format
- [ ] App is deployed to Vercel and accessible via HTTPS URL
- [ ] All env vars are documented in `.env.example` and the README
- [ ] README explains setup, deployment, and how to swap Groq → Claude

---

## 18. Out of Scope (Do Not Build)

- Auth / login / signup (Phase 2)
- Multi-user / household sharing (Phase 2)
- Plaid or any bank API (Phase 3)
- Mobile app (Phase 3)
- Investment portfolio tracking (Phase 3)
- Tax planning (Phase 3)
- Notifications, emails, scheduled jobs

---

## 19. Notes for the Implementing Agent

- When in doubt, choose the simpler implementation. This is an MVP.
- Do **not** add features not listed in §16. Scope creep kills MVPs.
- The advisor prompt in §8 is the product's secret sauce. Treat it as load-bearing — do not paraphrase or shorten it.
- Phase 1 has no auth on purpose. Do not invent one.
- If Groq's free tier rate-limits during testing, fall back to Google's Gemini 2.0 Flash free tier — same JSON-mode pattern.
- Commit early, commit often. Push to GitHub at the end of each numbered build step in §13.
