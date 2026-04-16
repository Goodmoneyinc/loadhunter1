import { jsPDF } from 'jspdf';

interface DetentionClaimData {
  companyName: string;
  loadNumber: string;
  facilityAddress: string;
  arrivalTime: string;
  departureTime: string;
  totalDuration: number;
  calculatedCost: number;
  driverName: string;
  gpsVerified: boolean;
}

export function generateDetentionClaimPDF(data: DetentionClaimData): void {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('DETENTION CLAIM', pageWidth / 2, 20, { align: 'center' });

  yPos = 50;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`, margin, yPos);

  yPos += 15;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Load Information', margin, yPos);

  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const infoData = [
    ['Company:', data.companyName],
    ['Load Number:', data.loadNumber],
    ['Facility Address:', data.facilityAddress],
    ['Driver:', data.driverName],
  ];

  infoData.forEach(([label, value]) => {
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, yPos);
  });

  yPos += 15;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GPS-Verified Timeline', margin, yPos);

  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const timelineData = [
    ['Arrival Time:', new Date(data.arrivalTime).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })],
    ['Departure Time:', new Date(data.departureTime).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })],
  ];

  timelineData.forEach(([label, value]) => {
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, yPos);
  });

  if (data.gpsVerified) {
    yPos += 12;
    doc.setFillColor(16, 185, 129, 0.1);
    doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 10, 2, 2, 'F');
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ GPS VERIFIED - Location confirmed within 200m geofence', margin + 5, yPos + 2);
    doc.setTextColor(0, 0, 0);
  }

  yPos += 20;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Detention Calculation', margin, yPos);

  yPos += 15;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 35, 3, 3, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  doc.text('Total Duration:', margin + 5, yPos);
  doc.setFont('helvetica', 'bold');
  const hours = Math.floor(data.totalDuration);
  const minutes = Math.round((data.totalDuration - hours) * 60);
  doc.text(`${hours}h ${minutes}m`, pageWidth - margin - 5, yPos, { align: 'right' });

  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.text('Free Time (Standard):', margin + 5, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text('2h 0m', pageWidth - margin - 5, yPos, { align: 'right' });

  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.text('Billable Time:', margin + 5, yPos);
  doc.setFont('helvetica', 'bold');
  const billableHours = Math.max(0, data.totalDuration - 2);
  const billableH = Math.floor(billableHours);
  const billableM = Math.round((billableHours - billableH) * 60);
  doc.setTextColor(234, 88, 12);
  doc.text(`${billableH}h ${billableM}m`, pageWidth - margin - 5, yPos, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  yPos += 20;
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 20, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  yPos += 7;
  doc.text('TOTAL DETENTION COST:', margin + 5, yPos);
  doc.setFontSize(18);
  doc.text(`$${data.calculatedCost.toFixed(2)}`, pageWidth - margin - 5, yPos, { align: 'right' });

  yPos += 20;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Rate: $75.00 per hour | Industry standard detention rate applied', margin, yPos);

  yPos += 30;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Detention Terms & Conditions', margin, yPos);

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const terms = [
    '• Detention charges apply after 2 hours from arrival at facility',
    '• GPS verification confirms driver location within facility geofence',
    '• Detention rate: $75.00 per hour (prorated for partial hours)',
    '• All times are GPS-verified and automatically recorded',
    '• Payment due within 30 days of invoice date',
  ];

  terms.forEach(term => {
    yPos += 6;
    doc.text(term, margin, yPos);
  });

  yPos = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This is an automated detention claim generated by GPS-verified tracking system.',
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  const filename = `Detention_Claim_${data.loadNumber}_${new Date().getTime()}.pdf`;
  doc.save(filename);
}
