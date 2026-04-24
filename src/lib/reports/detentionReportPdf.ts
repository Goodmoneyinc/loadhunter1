import { jsPDF } from 'jspdf';
import type { DetentionReportInput } from './detentionReport';
import { normalizeDetentionReportInput } from './detentionReport';

const MARGIN = 16;
const PAGE_BOTTOM = 280;
const LINE = 6;

function formatWhen(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatEventLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

export function downloadDetentionReportPdf(report: DetentionReportInput): void {
  const r = normalizeDetentionReportInput(report);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Detention report', MARGIN, 18);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y = 36;
  doc.text(`Load #${r.loadNumber}`, MARGIN, y);
  y += LINE;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${formatWhen(r.generatedAt)}`, MARGIN, y);
  doc.setTextColor(0, 0, 0);
  y += LINE + 4;

  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Summary', MARGIN, y);
  y += LINE + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const rows: [string, string][] = [
    ['Free time', `${r.freeTimeHours} h`],
    ['Rate', `$${r.ratePerHour.toFixed(2)} / hr`],
    ['Arrival', formatWhen(r.arrivalTime)],
    ['Departure', formatWhen(r.departureTime)],
    ['Billable hours', r.billableHours.toFixed(2)],
    ['Estimated detention', `$${r.totalAmount.toFixed(2)}`],
  ];

  for (const [label, value] of rows) {
    y = ensureSpace(doc, y, LINE + 2);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, MARGIN + 42, y);
    y += LINE;
  }

  y += 6;
  y = ensureSpace(doc, y, 16);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Event timeline', MARGIN, y);
  y += LINE + 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (r.timeline.length === 0) {
    y = ensureSpace(doc, y, LINE);
    doc.setTextColor(120, 120, 120);
    doc.text('No events recorded yet.', MARGIN, y);
    doc.setTextColor(0, 0, 0);
    y += LINE;
  } else {
    for (const ev of r.timeline) {
      const line1 = `${formatWhen(ev.timestamp)} · ${formatEventLabel(ev.eventType)} · GPS: ${ev.gpsAvailable ? 'yes' : 'no'}`;
      const noteLine = ev.note ? `Note: ${ev.note}` : '';
      const block = noteLine ? LINE * 2 + 2 : LINE + 1;
      y = ensureSpace(doc, y, block);
      const lines = doc.splitTextToSize(line1, textWidth);
      doc.text(lines, MARGIN, y);
      y += Math.max(LINE, lines.length * (LINE - 1));
      if (noteLine) {
        const noteWrapped = doc.splitTextToSize(noteLine, textWidth);
        doc.setTextColor(70, 70, 70);
        doc.text(noteWrapped, MARGIN, y);
        doc.setTextColor(0, 0, 0);
        y += noteWrapped.length * (LINE - 1) + 2;
      } else {
        y += 2;
      }
    }
  }

  y = ensureSpace(doc, y, LINE + 6);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Figures use your dispatcher’s free time and rate. Final billing may differ.',
    MARGIN,
    y,
    { maxWidth: textWidth }
  );

  const safeNum = r.loadNumber.replace(/[^\w.-]+/g, '_');
  doc.save(`detention-report-${safeNum}-${Date.now()}.pdf`);
}
