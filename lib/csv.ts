import Papa from 'papaparse';

interface CSVRow {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

interface ParseResult {
  rows: CSVRow[];
  errors: string[];
}

function parseDate(raw: string): string | null {
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // MM/DD/YYYY
  const parts = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) {
    const [, m, d, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

export function parseCSV(text: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows: CSVRow[] = [];
  const errors: string[] = [];

  result.data.forEach((row, i) => {
    const lineNum = i + 2; // account for header row

    const rawDate = row['date']?.trim();
    const rawDescription = row['description']?.trim();
    const rawAmount = row['amount']?.trim();

    if (!rawDate || !rawDescription || !rawAmount) {
      errors.push(`Row ${lineNum}: missing required field (date, description, or amount)`);
      return;
    }

    const date = parseDate(rawDate);
    if (!date) {
      errors.push(`Row ${lineNum}: unrecognised date format "${rawDate}"`);
      return;
    }

    const amount = parseFloat(rawAmount.replace(/[$,]/g, ''));
    if (isNaN(amount)) {
      errors.push(`Row ${lineNum}: invalid amount "${rawAmount}"`);
      return;
    }

    rows.push({
      date,
      description: rawDescription,
      amount,
      category: row['category']?.trim() || undefined,
    });
  });

  return { rows, errors };
}
