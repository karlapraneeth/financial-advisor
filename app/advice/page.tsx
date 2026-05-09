'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import AdviceCard from '@/components/AdviceCard';
import type { Advice } from '@/types/finance';

interface HistoryEntry {
  id: string;
  advice: Advice;
  model: string;
  created_at: string;
}

export default function AdvicePage() {
  const [current, setCurrent] = useState<Advice | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    const res = await fetch('/api/advise');
    if (res.ok) {
      const data: HistoryEntry[] = await res.json();
      setHistory(data);
      if (data.length > 0 && !current) setCurrent(data[0].advice);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  async function getAdvice() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/advise', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Unknown error');
      } else {
        setCurrent(data);
        await loadHistory();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI Financial Advice</h1>
        <Button onClick={getAdvice} disabled={loading}>
          <Sparkles size={16} />
          {loading ? 'Generating…' : 'Get New Advice'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
            <p className="text-sm text-gray-500">Analysing your finances…</p>
          </CardContent>
        </Card>
      )}

      {!loading && current && <AdviceCard advice={current} />}

      {!loading && !current && !error && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <p className="text-gray-500 text-sm">Click &ldquo;Get New Advice&rdquo; to generate your personalised allocation plan.</p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 1 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Past Advice</h2>
          <div className="space-y-2">
            {history.slice(1).map((h) => (
              <div key={h.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="font-medium text-gray-700">{new Date(h.created_at).toLocaleString()}</span>
                    <span className="ml-2 text-xs text-gray-400">{h.model}</span>
                  </div>
                  {expanded === h.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expanded === h.id && (
                  <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                    <AdviceCard advice={h.advice} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
