export const PDF_PARSER_SYSTEM_PROMPT = `You are a bank statement parser. You will be given raw text extracted from a PDF bank statement.

Your job is to extract every transaction and return them as a JSON array.

Rules:
- Extract ALL transactions you can find — do not skip any.
- "amount" must be a number. Debits/withdrawals/charges must be NEGATIVE. Credits/deposits must be POSITIVE.
- "date" must be in YYYY-MM-DD format. If the year is missing, infer it from context (statement period).
- "description" should be the merchant/payee name, cleaned up (remove reference numbers if possible).
- "category" is optional — infer it if obvious (e.g. "NETFLIX" → "subscription", "SHELL" → "transportation", "WALMART" → "shopping"). Leave null if unsure.
- Ignore header rows, balance rows, opening/closing balance lines, and fee summaries.
- If you see separate Debit and Credit columns, combine into a single signed amount.

OUTPUT FORMAT — return ONLY this JSON, no other text:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "category": "string or null"
    }
  ],
  "statement_period": "string e.g. 'January 2025' or null if not found",
  "account_name": "string or null if not found",
  "parse_notes": "string — note anything unusual, ambiguous, or skipped"
}`;

/**
 * Find where the transaction section starts in a bank statement.
 * Most statements have a summary page first, then a detailed transaction list.
 * We look for common section headers, or fall back to the first line that
 * looks like a transaction (date + description + amount).
 */
function findTransactionStart(text: string): number {
  const headers = [
    /transaction[s]?\s+(date|activity|detail|history)/i,
    /account\s+activity/i,
    /purchases\s+and\s+other\s+charges/i,
    /payments?\s+and\s+credits?/i,
    /date\s+description\s+amount/i,
    /date\s+merchant/i,
  ];
  for (const re of headers) {
    const m = text.search(re);
    if (m !== -1) return m;
  }
  // Fallback: find first line that looks like MM/DD followed by text and a dollar amount
  const lineMatch = text.search(/\b\d{1,2}\/\d{1,2}\b.{5,80}\$?\s*[\d,]+\.\d{2}/);
  return lineMatch !== -1 ? Math.max(0, lineMatch - 200) : 0;
}

export const buildPdfUserPrompt = (text: string) => {
  // Skip the summary section and start from where transactions begin.
  // This saves tokens and avoids confusing the LLM with running totals.
  const start = findTransactionStart(text);
  const relevant = text.slice(start, start + 24000); // ~6k tokens of transaction data
  return `Here is the extracted text from the bank statement PDF. Parse all transactions:\n\n${relevant}`;
};
