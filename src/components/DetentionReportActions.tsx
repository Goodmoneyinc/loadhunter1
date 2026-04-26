import { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { generateDetentionReport, type DetentionReportData } from '@/lib/reports/detentionReport';
import { downloadDetentionReportPdf } from '@/lib/reports/detentionReportPdf';
import { downloadDetentionReportCsv } from '@/lib/reports/detentionReportCsv';
import { SendToBrokerButton } from '@/components/SendToBrokerButton';
import { formatCurrency } from '@/lib/utils';

const MOCK_BROKER =
  import.meta.env.VITE_MOCK_BROKER_EMAIL === 'true' ||
  import.meta.env.VITE_MOCK_BROKER_EMAIL === '1';

export interface DetentionReportActionsProps {
  loadId: string;
  loadNumber: string;
  invoiceStatus: 'draft' | 'sent' | 'paid';
  /** Called after a real or mock broker send succeeds, and after downloads if you need parent refresh */
  onBrokerSent?: () => void;
  /** Tighter layout for table rows */
  compact?: boolean;
}

export function DetentionReportActions({
  loadId,
  loadNumber,
  invoiceStatus,
  onBrokerSent,
  compact,
}: DetentionReportActionsProps) {
  const [report, setReport] = useState<DetentionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateDetentionReport(loadId);
      setReport(data);
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : 'Could not build detention report');
    } finally {
      setLoading(false);
    }
  }, [loadId]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const handlePdf = () => {
    if (!report) return;
    downloadDetentionReportPdf(report);
  };

  const handleCsv = () => {
    if (!report) return;
    downloadDetentionReportCsv(report);
  };

  const canSendBroker = (report?.totalAmount ?? 0) > 0 && invoiceStatus === 'draft';

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-slate-400 ${compact ? 'text-xs' : 'text-sm'}`}>
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
        <span>Preparing report…</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className={`text-red-600 ${compact ? 'text-xs' : 'text-sm'}`}>
        {error ?? 'Report unavailable'}
        <button type="button" onClick={() => void fetchReport()} className="ml-2 underline">
          Retry
        </button>
      </div>
    );
  }

  const wrap = compact ? 'mt-2 flex flex-wrap gap-2' : 'mt-3 flex flex-wrap gap-3';
  const btn =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:pointer-events-none';
  const primary = `${btn} bg-slate-900 text-white hover:bg-slate-800 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}`;
  const secondary = `${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}`;

  return (
    <div>
      {!compact && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Generate Detention Report</h4>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Load #{loadNumber} · {report.timeline.length} timeline event{report.timeline.length === 1 ? '' : 's'} ·
            Billable {report.billableHours.toFixed(2)} h · {formatCurrency(report.totalAmount)}
          </p>
        </div>
      )}

      <div className={wrap}>
        <button type="button" className={primary} onClick={handlePdf} disabled={loading}>
          <Download className="h-4 w-4 shrink-0" aria-hidden />
          Download Report
        </button>
        <button type="button" className={secondary} onClick={handleCsv} disabled={loading}>
          <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden />
          Download CSV
        </button>

        {canSendBroker ? (
          <SendToBrokerButton
            loadId={loadId}
            currentStatus={invoiceStatus}
            detentionAmount={report.totalAmount}
            mock={MOCK_BROKER}
            onSuccess={() => {
              void fetchReport();
              onBrokerSent?.();
            }}
          />
        ) : (
          <button
            type="button"
            disabled
            title={
              invoiceStatus !== 'draft'
                ? 'Already sent to broker'
                : 'No billable detention yet — report still available to download'
            }
            className={`${secondary} cursor-not-allowed opacity-60`}
          >
            {invoiceStatus === 'paid' ? 'Paid' : invoiceStatus === 'sent' ? 'Already Sent' : 'Send to Broker'}
          </button>
        )}
      </div>

      {MOCK_BROKER && canSendBroker && (
        <p className={`mt-2 text-amber-700 dark:text-amber-400/90 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          Mock email mode (VITE_MOCK_BROKER_EMAIL): Send simulates success without calling the API or marking billed.
        </p>
      )}
    </div>
  );
}
