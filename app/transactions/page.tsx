'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/lib/utils';
import type { Account, Transaction } from '@/types/finance';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionCreateSchema } from '@/lib/validations/schemas';
import { z } from 'zod';

type FormValues = z.infer<typeof transactionCreateSchema>;

function TransactionForm({ accounts, onSubmit, onCancel }: { accounts: Account[]; onSubmit: (d: FormValues) => Promise<void>; onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(transactionCreateSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Date" id="date" type="date" {...register('date')} error={errors.date?.message} />
      <Input label="Description" id="description" {...register('description')} error={errors.description?.message} />
      <Input label="Amount (negative = outflow)" id="amount" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} error={errors.amount?.message} />
      <Select label="Account (optional)" id="account_id" {...register('account_id')}>
        <option value="">— None —</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </Select>
      <Input label="Category (optional)" id="category" {...register('category')} error={errors.category?.message} />
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [pdfResult, setPdfResult] = useState<{ imported: number; skipped: number; statement_period?: string | null; account_name?: string | null; parse_notes?: string; errors: string[] } | null>(null);
  const [importAccountId, setImportAccountId] = useState('');
  const [pdfAccountId, setPdfAccountId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfFileRef = useRef<HTMLInputElement>(null);

  async function loadAccounts() {
    const res = await fetch('/api/accounts');
    if (res.ok) setAccounts(await res.json());
  }

  async function load() {
    const params = new URLSearchParams();
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);
    if (filterAccount) params.set('account_id', filterAccount);
    const res = await fetch(`/api/transactions?${params}`);
    if (res.ok) setTransactions(await res.json());
  }

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { load(); }, [filterFrom, filterTo, filterAccount]);

  async function handleSubmit(data: FormValues) {
    await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setModalOpen(false);
    load();
  }

  async function handlePdfImport() {
    const file = pdfFileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    setPdfResult(null);
    const form = new FormData();
    form.append('file', file);
    if (pdfAccountId) form.append('account_id', pdfAccountId);
    const res = await fetch('/api/transactions/import-pdf', { method: 'POST', body: form });
    const data = await res.json();
    setPdfResult(data);
    setImporting(false);
    load();
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.append('file', file);
    if (importAccountId) form.append('account_id', importAccountId);
    const res = await fetch('/api/transactions/import', { method: 'POST', body: form });
    const data = await res.json();
    setImportResult(data);
    setImporting(false);
    load();
  }

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPdfImportOpen(true)}><FileText size={16} /> Import PDF</Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload size={16} /> Import CSV</Button>
          <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Input id="from" type="date" label="From" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="w-40" />
        <Input id="to" type="date" label="To" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="w-40" />
        <div className="w-48">
          <Select id="account_filter" label="Account" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{t.date}</td>
                <td className="px-4 py-3 text-gray-900">{t.description ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{t.account_id ? accountMap[t.account_id] ?? '—' : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{t.category ?? '—'}</td>
                <td className={`px-4 py-3 text-right font-medium ${t.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Transaction">
        <TransactionForm accounts={accounts} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>

      {/* PDF Import Modal */}
      <Modal open={pdfImportOpen} onClose={() => { setPdfImportOpen(false); setPdfResult(null); }} title="Import PDF Bank Statement" className="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Upload a PDF bank statement. The AI will extract all transactions automatically.
            Works best with digital PDFs — scanned images may not parse correctly.
          </p>
          <Select id="pdf_account" label="Account (optional)" value={pdfAccountId} onChange={(e) => setPdfAccountId(e.target.value)}>
            <option value="">— None —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <input ref={pdfFileRef} type="file" accept=".pdf" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          {pdfResult && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (pdfResult as any).error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                ✗ Error: {(pdfResult as any).error}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                {pdfResult.statement_period && <p className="text-gray-600">Period: <span className="font-medium">{pdfResult.statement_period}</span></p>}
                {pdfResult.account_name && <p className="text-gray-600">Account: <span className="font-medium">{pdfResult.account_name}</span></p>}
                {pdfResult.imported > 0
                  ? <p className="text-emerald-700 font-medium">✓ Imported: {pdfResult.imported} transactions</p>
                  : <p className="text-yellow-700 font-medium">⚠ 0 transactions imported — see notes below</p>
                }
                {pdfResult.skipped > 0 && <p className="text-yellow-700">Skipped: {pdfResult.skipped}</p>}
                {pdfResult.parse_notes && <p className="text-gray-500 text-xs italic">{pdfResult.parse_notes}</p>}
                {pdfResult.errors?.slice(0, 5).map((e, i) => <p key={i} className="text-red-600 text-xs">{e}</p>)}
              </div>
            )
          )}
          {importing && (
            <div className="flex items-center gap-2 text-sm text-indigo-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
              Parsing PDF with AI… this takes ~10 seconds
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handlePdfImport} disabled={importing} className="flex-1">
              {importing ? 'Parsing…' : 'Parse & Import'}
            </Button>
            <Button variant="secondary" onClick={() => { setPdfImportOpen(false); setPdfResult(null); }} className="flex-1">Close</Button>
          </div>
        </div>
      </Modal>

      <Modal open={importOpen} onClose={() => { setImportOpen(false); setImportResult(null); }} title="Import CSV" className="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Accepted columns: Date, Description, Amount, Category (optional). Dates as YYYY-MM-DD or MM/DD/YYYY.</p>
          <Select id="import_account" label="Account (optional)" value={importAccountId} onChange={(e) => setImportAccountId(e.target.value)}>
            <option value="">— None —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <input ref={fileRef} type="file" accept=".csv" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          {importResult && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-emerald-700 font-medium">Imported: {importResult.imported}</p>
              {importResult.skipped > 0 && <p className="text-yellow-700">Skipped: {importResult.skipped}</p>}
              {importResult.errors.slice(0, 5).map((e, i) => <p key={i} className="text-red-600 text-xs">{e}</p>)}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleImport} disabled={importing} className="flex-1">{importing ? 'Importing…' : 'Import'}</Button>
            <Button variant="secondary" onClick={() => { setImportOpen(false); setImportResult(null); }} className="flex-1">Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
