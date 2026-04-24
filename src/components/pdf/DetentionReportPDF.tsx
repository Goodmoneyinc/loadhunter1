import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { DetentionReportData } from '@/lib/reports/detentionReport';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica' },
  title: { fontSize: 20, marginBottom: 10, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 10, color: '#444', marginBottom: 16 },
  section: { marginBottom: 10 },
  label: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  value: { fontSize: 12, marginBottom: 6 },
  timelineHeading: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 6 },
  timelineItem: { marginLeft: 12, marginBottom: 4, fontSize: 10 },
  footer: { marginTop: 20, fontSize: 8, color: '#666' },
});

export interface DetentionReportPDFLoad {
  load_number: string;
}

export interface DetentionReportPDFProps {
  report: DetentionReportData;
  load: DetentionReportPDFLoad;
}

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DetentionReportPDF({ report, load }: DetentionReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Detention report</Text>
        <Text style={styles.subtitle}>
          Load #{load.load_number} · Generated {report.generatedAt.toLocaleString()}
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Arrival</Text>
          <Text style={styles.value}>{report.arrivalTime?.toLocaleString() ?? 'N/A'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Departure</Text>
          <Text style={styles.value}>{report.departureTime?.toLocaleString() ?? 'N/A'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Free time</Text>
          <Text style={styles.value}>{report.freeTimeHours} hours</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Rate</Text>
          <Text style={styles.value}>${report.ratePerHour.toFixed(2)} / hour</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Billable hours</Text>
          <Text style={styles.value}>{report.billableHours.toFixed(2)}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Total amount</Text>
          <Text style={styles.value}>${report.totalAmount.toFixed(2)}</Text>
        </View>

        <Text style={styles.timelineHeading}>Timeline</Text>
        {report.timeline.length === 0 ? (
          <Text style={styles.timelineItem}>No events recorded.</Text>
        ) : (
          report.timeline.map((event, idx) => {
            const line = [
              event.timestamp.toLocaleString(),
              formatEventType(event.eventType),
              event.gpsAvailable ? 'GPS' : null,
              event.note ? `Note: ${event.note}` : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <Text key={`${idx}-${event.timestamp.getTime()}`} style={styles.timelineItem} wrap>
                {line}
              </Text>
            );
          })
        )}

        <Text style={styles.footer} wrap>
          Figures use the configured free time and rate. Final billing may differ.
        </Text>
      </Page>
    </Document>
  );
}
