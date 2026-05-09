import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getLLM } from '@/lib/llm';
import { PDF_PARSER_SYSTEM_PROMPT, buildPdfUserPrompt } from '@/lib/prompts/pdf-parser';

function getUserId() {
  const id = process.env.DEFAULT_USER_ID;
  if (!id) throw new Error('DEFAULT_USER_ID is not set');
  return id;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string | null;
}

interface LLMParseResult {
  transactions: ParsedTransaction[];
  statement_period: string | null;
  account_name: string | null;
  parse_notes: string;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const accountId = formData.get('account_id') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Extract text from PDF using pdf-parse v2
    // v2 API: new PDFParse({ data: buffer }).getText()
    const buffer = Buffer.from(await file.arrayBuffer());
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const text = parsed.text;

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract text from this PDF. It may be a scanned image — try exporting as CSV from your bank instead.' },
        { status: 422 }
      );
    }

    // Send to LLM for transaction extraction
    const llm = getLLM();
    const raw = await llm.generate(PDF_PARSER_SYSTEM_PROMPT, buildPdfUserPrompt(text));

    let result: LLMParseResult;
    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'LLM returned invalid JSON while parsing the PDF', raw },
        { status: 500 }
      );
    }

    if (!Array.isArray(result.transactions) || result.transactions.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: 0,
        statement_period: result.statement_period,
        account_name: result.account_name,
        parse_notes: result.parse_notes ?? 'No transactions found in this PDF.',
        errors: ['No transactions could be extracted from this PDF.'],
      });
    }

    // Validate and filter rows
    const valid: ParsedTransaction[] = [];
    const errors: string[] = [];

    result.transactions.forEach((t, i) => {
      if (!t.date || !t.description || typeof t.amount !== 'number') {
        errors.push(`Row ${i + 1}: missing date, description, or amount`);
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
        errors.push(`Row ${i + 1}: invalid date format "${t.date}"`);
        return;
      }
      valid.push(t);
    });

    if (valid.length === 0) {
      return NextResponse.json({ imported: 0, skipped: errors.length, errors });
    }

    // Insert into DB
    const supabase = createServerSupabaseClient();
    const userId = getUserId();
    const records = valid.map((t) => ({
      user_id: userId,
      account_id: accountId ?? null,
      date: t.date,
      amount: t.amount,
      description: t.description,
      category: t.category ?? null,
      imported: true,
    }));

    const { data, error } = await supabase.from('transactions').insert(records).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      imported: data.length,
      skipped: errors.length,
      statement_period: result.statement_period,
      account_name: result.account_name,
      parse_notes: result.parse_notes,
      errors,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
