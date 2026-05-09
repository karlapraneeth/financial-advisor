'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import AccountForm from '@/components/AccountForm';
import { formatCurrency } from '@/lib/utils';
import type { Account } from '@/types/finance';

const TABS = [
  { label: 'Bank Accounts', types: ['checking', 'savings'] },
  { label: 'Credit Cards', types: ['credit_card'] },
  { label: 'Loans', types: ['personal_loan', 'auto_loan', 'student_loan'] },
  { label: 'Mortgage', types: ['mortgage'] },
] as const;

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tab, setTab] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  async function load() {
    const res = await fetch('/api/accounts');
    if (res.ok) setAccounts(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(data: Record<string, unknown>) {
    if (editing) {
      await fetch(`/api/accounts/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    setModalOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this account?')) return;
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    load();
  }

  const visible = accounts.filter((a) => TABS[tab].types.includes(a.type as never));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> Add Account
        </Button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === i
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">No accounts in this category yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {visible.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-gray-900">{a.name}</p>
                <p className="text-sm text-gray-500 capitalize">{a.type.replace('_', ' ')}</p>
                {a.apr != null && (
                  <p className="text-xs text-gray-400">APR {a.apr}%</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className={`font-semibold ${a.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(a.balance)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditing(a); setModalOpen(true); }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        title={editing ? 'Edit Account' : 'Add Account'}
      >
        <AccountForm
          defaultValues={editing ?? undefined}
          onSubmit={handleSubmit as never}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
