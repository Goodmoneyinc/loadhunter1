import type { DetentionReportInput } from './detentionReport';
import { normalizeDetentionReportInput } from './detentionReport';

function esc(cell: string): string {
  if (/[",\r\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

function formatWhen(d: Date | null): string {
  if (!d) return '';
  return d.toISOString();
}

/** Download a CSV detention report (proof package for billing). */
export function downloadDetentionReportCsv(report: DetentionReportInput): void {
  const r = normalizeDetentionReportInput(report);
  const lines: string[] = [];

  lines.push(esc('Detention Report'));
  lines.push([esc('Load number'), esc(r.loadNumber)].join(','));
  lines.push([esc('Generated at'), esc(formatWhen(r.generatedAt))].join(','));
  lines.push([esc('Arrival (event)'), esc(formatWhen(r.arrivalTime))].join(','));
  lines.push([esc('Departure (event)'), esc(formatWhen(r.departureTime))].join(','));
  lines.push([esc('Free time hours'), esc(String(r.freeTimeHours))].join(','));
  lines.push([esc('Rate per hour USD'), esc(String(r.ratePerHour))].join(','));
  lines.push([esc('Total detention hours'), esc(r.billableHours.toFixed(4))].join(','));
  lines.push([esc('Total amount owed USD'), esc(r.totalAmount.toFixed(2))].join(','));
  lines.push('');
  lines.push(esc('Timeline'));
  lines.push([esc('Timestamp (ISO)'), esc('Event'), esc('GPS lat'), esc('GPS lng'), esc('Note')].join(','));

  for (const ev of r.timeline) {
    const lat = ev.gpsLat != null ? String(ev.gpsLat) : '';
    const lng = ev.gpsLong != null ? String(ev.gpsLong) : '';
    lines.push(
      [
        esc(ev.timestamp.toISOString()),
        esc(ev.eventType),
        esc(lat),
        esc(lng),
        esc(ev.note ?? ''),
      ].join(',')
    );
  }

  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeNum = r.loadNumber.replace(/[^\w.-]+/g, '_');
  a.href = url;
  a.download = `detention-report-${safeNum}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
