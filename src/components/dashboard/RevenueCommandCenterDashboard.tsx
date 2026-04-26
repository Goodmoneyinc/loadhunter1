'use client';

import { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { DetentionScoreboard } from '@/components/DetentionScoreboard';
import { DetentionRevenueTable, type DetentionRevenueRow } from '@/components/DetentionRevenueTable';
import LoadTimeline from '@/components/load/LoadTimeline';
import { LiveDetentionCalculator } from '@/components/LiveDetentionCalculator';

export function RevenueCommandCenterDashboard() {
  const [selected, setSelected] = useState<DetentionRevenueRow | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const handleRowSelect = useCallback((row: DetentionRevenueRow) => {
    setSelected(row);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) {
      setMobilePanelOpen(true);
    }
  }, []);

  const closeMobilePanel = useCallback(() => {
    setMobilePanelOpen(false);
    setSelected(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/90">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Revenue command center</h1>
              <p className="text-sm text-slate-500">Real-time detention · proof · billing readiness</p>
            </div>
          </div>
          <DetentionScoreboard />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
          <section className="min-w-0 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Detention by load</h2>
            <p className="text-sm text-slate-500">
              Sorted by amount. On large screens, select a row to preview timeline and live detention on the right. On
              mobile, selection opens a full panel.
            </p>
            <DetentionRevenueTable selectedLoadId={selected?.id ?? null} onRowSelect={handleRowSelect} />
          </section>

          <aside className="hidden min-w-0 xl:block">
            <div className="sticky top-28 space-y-4">
              {selected ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900">Live detention</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      #{selected.load_number}
                      {selected.isActive ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                          Active
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-3">
                      <LiveDetentionCalculator loadId={selected.id} />
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                      <h3 className="text-sm font-semibold text-slate-900">Event timeline</h3>
                      <p className="text-xs text-slate-500">Proof for billing disputes</p>
                    </div>
                    <div className="max-h-[min(70vh,720px)] overflow-y-auto p-3">
                      <LoadTimeline loadId={selected.id} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
                  Select a load in the table to show live detention and the full event timeline here.
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {mobilePanelOpen && selected && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-white xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-command-title"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 id="mobile-command-title" className="text-lg font-semibold text-slate-900">
                Load #{selected.load_number}
              </h2>
              <p className="text-xs text-slate-500">Live detention · timeline</p>
            </div>
            <button
              type="button"
              onClick={closeMobilePanel}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-slate-100 p-4">
              <LiveDetentionCalculator loadId={selected.id} />
            </div>
            <div className="p-4">
              <LoadTimeline loadId={selected.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
