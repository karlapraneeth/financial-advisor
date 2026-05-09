'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/lib/utils';
import { goalCreateSchema } from '@/lib/validations/schemas';
import type { Goal } from '@/types/finance';

// Use the output type (with defaults applied) to satisfy react-hook-form's SubmitHandler
type FormInput = z.input<typeof goalCreateSchema>;
type FormValues = z.infer<typeof goalCreateSchema>;

const GOAL_TYPES = ['emergency_fund', 'debt_payoff', 'savings', 'retirement', 'custom'] as const;

function GoalForm({ defaultValues, onSubmit, onCancel }: { defaultValues?: Partial<FormInput>; onSubmit: (d: FormValues) => Promise<void>; onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormInput>({
    resolver: zodResolver(goalCreateSchema) as never,
    defaultValues: defaultValues ?? { type: 'savings', priority: 5, current_amount: 0 },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
      <Input label="Goal Name" id="name" {...register('name')} error={errors.name?.message} placeholder="e.g. 6-month emergency fund" />
      <Select label="Type" id="type" {...register('type')} error={errors.type?.message}>
        {GOAL_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
      </Select>
      <Input label="Target Amount" id="target_amount" type="number" step="0.01" {...register('target_amount', { valueAsNumber: true })} error={errors.target_amount?.message} />
      <Input label="Current Amount" id="current_amount" type="number" step="0.01" {...register('current_amount', { valueAsNumber: true })} error={errors.current_amount?.message} />
      <Input label="Target Date (optional)" id="target_date" type="date" {...register('target_date')} error={errors.target_date?.message} />
      <Input label="Priority (1–10)" id="priority" type="number" min={1} max={10} {...register('priority', { valueAsNumber: true })} error={errors.priority?.message} />
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  async function load() {
    const res = await fetch('/api/goals');
    if (res.ok) setGoals(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(data: FormValues) {
    if (editing) {
      await fetch(`/api/goals/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    setModalOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return;
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> Add Goal
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((g) => {
          const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
          return (
            <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-indigo-500 shrink-0" />
                  <p className="font-semibold text-gray-900 text-sm">{g.name}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(g); setModalOpen(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(g.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-xs text-gray-500 capitalize mb-3">{g.type.replace('_', ' ')} · Priority {g.priority}</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatCurrency(g.current_amount)}</span>
                <span>{formatCurrency(g.target_amount)}</span>
              </div>
              {g.target_date && (
                <p className="text-xs text-gray-400 mt-2">Target: {new Date(g.target_date).toLocaleDateString()}</p>
              )}
            </div>
          );
        })}
        {goals.length === 0 && (
          <p className="text-gray-500 text-sm py-8 col-span-full text-center">No goals added yet.</p>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Edit Goal' : 'Add Goal'}>
        <GoalForm
          defaultValues={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
