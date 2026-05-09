# Personal AI Financial Advisor

An AI-powered web app that ingests your complete financial picture and generates a personalised monthly cash-allocation plan using the Groq LLM API (free tier).

**Stack:** Next.js 14 · Supabase (Postgres) · Groq (llama-3.3-70b-versatile) · Tailwind CSS · Recharts

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/financial-advisor.git
cd financial-advisor
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the **SQL editor**, paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Copy the UUID printed by the final `INSERT` statement — this is your `DEFAULT_USER_ID`.
4. From **Project Settings → API**, copy your Project URL, anon key, and service role key.

> **RLS:** Phase 1 uses the service role key server-side, so RLS is bypassed intentionally. Phase 2 will add Supabase Auth and re-enable row-level security.

### 3. Get a Groq API key

Sign up at [console.groq.com](https://console.groq.com) and create an API key (free tier).

### 4. Configure environment variables

```bash
cp .env.example .env.local
# Fill in the values
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `GROQ_API_KEY` | console.groq.com → API Keys |
| `DEFAULT_USER_ID` | UUID from the schema.sql seed insert |
| `LLM_PROVIDER` | `groq` (default) or `claude` |

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it in [vercel.com/new](https://vercel.com/new).
3. Add all environment variables from `.env.local` in the Vercel dashboard.
4. Deploy — Vercel auto-detects Next.js.

---

## Swapping Groq → Claude

1. Set `LLM_PROVIDER=claude` and `ANTHROPIC_API_KEY=sk-ant-...` in your env.
2. Implement `ClaudeProvider` in [`lib/llm/claude.ts`](lib/llm/claude.ts) using `@anthropic-ai/sdk`.

The interface is:
```typescript
interface LLMProvider {
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}
```

---

## CSV Import format

The transactions import accepts CSV files with these columns (header names case-insensitive):

| Column | Required | Notes |
|---|---|---|
| Date | yes | YYYY-MM-DD or MM/DD/YYYY |
| Description | yes | — |
| Amount | yes | Negative = outflow |
| Category | no | Passed through as-is |

---

## Project structure

```
app/           Next.js pages and API routes
components/    React components
lib/           Business logic (Supabase, LLM, calculations)
types/         Shared TypeScript types
supabase/      SQL schema
```

---

> This tool provides educational guidance based on widely accepted personal finance principles. It is not a substitute for advice from a licensed financial advisor, accountant, or tax professional.
