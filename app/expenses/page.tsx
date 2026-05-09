'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/lib/utils';
import { expenseCreateSchema } from '@/lib/validations/schemas';
import type { FixedExpense } from '@/types/finance';

type FormValues = z.infer<typeof expenseCreateSchema>;

const CATEGORIES = [
  'rent', 'mortgage', 'utility', 'insurance',
  'subscription', 'transportation', 'childcare', 'other',
] as const;

function ExpenseForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit: (d: FormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: defaultValues ?? { category: 'other' },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Name" id="name" {...register('name')} error={errors.name?.message} placeholder="e.g. Electric bill" />
      <Select label="Category" id="category" {...register('category')} error={errors.category?.message}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
        ))}
      </Select>
      <Input label="Monthly Amount" id="amount" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} error={errors.amount?.message} />
      <Input label="Due Day (optional)" id="due_day" type="number" min={1} max={31} {...register('due_day', { valueAsNumber: true })} error={errors.due_day?.message} />
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpense | null>(null);

  async function load() {
    const res = await fetch('/api/expenses');
    if (res.ok) setExpenses(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(data: FormValues) {
    if (editing) {
      await fetch(`/api/expenses/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    setModalOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    load();
  }

  const grouped = CATEGORIES.reduce<Record<string, FixedExpense[]>>((acc, cat) => {
    acc[cat] = expenses.filter((e) => e.category === cat);
    return acc;
  }, {});

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fixed Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Total: {formatCurrency(total)}/month</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> Add Expense
        </Button>
      </div>

      <div className="space-y-4">
        {CATEGORIES.filter((c) => grouped[c].length > 0).map((cat) => (
          <div key={cat} className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {grouped[cat].map((e) => (
                <div key={e.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{e.name}</p>
                    {e.due_day && <p className="text-xs text-gray-400">Due day {e.due_day}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-900">{formatCurrency(e.amount)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(e); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
          <p className="text-gray-500 text-sm py-8 text-center">No fixed expenses added yet.</p>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <ExpenseForm
          defaultValues={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
