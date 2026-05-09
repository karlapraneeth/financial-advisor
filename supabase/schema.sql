-- Run this in the Supabase SQL editor to set up the schema.
-- After running, insert a seed user and copy the UUID into DEFAULT_USER_ID in .env.local.

create table if not exists users (
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

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('checking','savings','credit_card','personal_loan','mortgage','auto_loan','student_loan')),
  balance numeric(12,2) not null default 0,
  apr numeric(6,3),
  credit_limit numeric(12,2),
  minimum_payment numeric(12,2),
  due_day int check (due_day between 1 and 31),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('rent','mortgage','utility','insurance','subscription','transportation','childcare','other')),
  amount numeric(12,2) not null,
  due_day int check (due_day between 1 and 31),
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  account_id uuid references accounts(id) on delete set null,
  date date not null,
  amount numeric(12,2) not null,
  category text,
  description text,
  imported boolean default false,
  created_at timestamptz default now()
);

create table if not exists goals (
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

create table if not exists advice_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  snapshot jsonb not null,
  advice jsonb not null,
  model text,
  created_at timestamptz default now()
);

-- Seed user — copy the generated UUID into DEFAULT_USER_ID in .env.local
insert into users (email, display_name, monthly_net_income)
values ('user@example.com', 'My Finances', 0)
returning id;
