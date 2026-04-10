/* ============================================
   PDF EXPORT — jsPDF Report Generation
   ============================================ */

import { formatCurrencyPlain, formatDate, formatDateShort, formatYearsMonths } from './utils.js';

/**
 * Export the loan calculation as PDF
 * @param {Array} schedule - Amortization schedule
 * @param {Object} summary - Calculated summary
 * @param {string} userName - Current user's name
 */
export function exportPDF(schedule, summary, userName = 'Guest') {
  if (schedule.length === 0) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  const primaryColor = [245, 158, 11];
  const darkColor = [30, 41, 59];
  const grayColor = [100, 116, 139];
  const lightGray = [241, 245, 249];

  function addNewPage() {
    doc.addPage();
    yPos = margin;
  }

  // === HEADER ===
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Loan Calculator Report', pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`User: ${userName}`, pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.text(
    `Generated on: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    pageWidth / 2, 36, { align: 'center' }
  );
  yPos = 55;

  // === LOAN SUMMARY ===
  doc.setTextColor(...darkColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Loan Summary', margin, yPos);
  yPos += 10;

  const summaryData = [
    { label: 'Total Disbursed', value: formatCurrencyPlain(summary.totalDisbursed) },
    { label: 'Total Principal', value: formatCurrencyPlain(summary.totalPrincipal) },
    { label: 'Total Interest', value: formatCurrencyPlain(summary.totalInterest) },
    { label: 'Total Amount Paid', value: formatCurrencyPlain(summary.totalAmount) },
    { label: 'Interest Saved', value: formatCurrencyPlain(summary.interestSaved) },
    { label: 'Loan Tenure', value: `${summary.totalMonths} months` },
    { label: 'Paid Till Date', value: formatCurrencyPlain(summary.paidTillDate) },
    { label: 'Remaining to Pay', value: formatCurrencyPlain(summary.remainingToPay) }
  ];

  const boxWidth = (pageWidth - 2 * margin - 20) / 3;
  const boxHeight = 22;

  summaryData.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + col * (boxWidth + 10);
    const y = yPos + row * (boxHeight + 6);

    doc.setFillColor(...lightGray);
    doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'F');

    doc.setTextColor(...grayColor);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label.toUpperCase(), x + 5, y + 7);

    doc.setTextColor(...darkColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, x + 5, y + 16);
  });

  yPos += Math.ceil(summaryData.length / 3) * (boxHeight + 6) + 10;

  // === TERM ANALYSIS ===
  doc.setTextColor(...darkColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Loan Term Analysis', margin, yPos);
  yPos += 8;

  const termData = [
    ['Original Bank Term', summary.originalTermMonths > 0 ? `${summary.originalTermMonths} months (${formatYearsMonths(summary.originalTermMonths)})` : 'Not specified'],
    ['Actual Loan Term', `${summary.totalMonths} months (${formatYearsMonths(summary.totalMonths)})`],
    ['Completed Term', `${summary.completedMonths} months (${formatYearsMonths(summary.completedMonths)})`],
    ['Remaining Term', `${summary.remainingMonths} months (${formatYearsMonths(summary.remainingMonths)})`],
    ['Term Saved vs Original', `${summary.savedMonths} months (${formatYearsMonths(summary.savedMonths)})`]
  ];

  doc.autoTable({
    startY: yPos,
    body: termData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    margin: { left: margin, right: margin }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // === DISBURSEMENTS ===
  if (summary.disbursements.length > 0) {
    doc.setTextColor(...darkColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Disbursements', margin, yPos);
    yPos += 6;

    doc.autoTable({
      startY: yPos,
      head: [['#', 'Date', 'Amount (Rs.)']],
      body: summary.disbursements.map((d, i) => [
        i + 1,
        formatDateShort(d.date),
        formatCurrencyPlain(d.amount)
      ]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 10 }, 2: { halign: 'right' } },
      margin: { left: margin, right: margin }
    });

    yPos = doc.lastAutoTable.finalY + 8;
  }

  // === PART PAYMENTS ===
  if (summary.partPayments.length > 0) {
    if (yPos > pageHeight - 50) addNewPage();

    doc.setTextColor(...darkColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Part Payments', margin, yPos);
    yPos += 6;

    doc.autoTable({
      startY: yPos,
      head: [['#', 'Date', 'Amount (Rs.)']],
      body: summary.partPayments.map((p, i) => [
        i + 1,
        formatDateShort(p.date),
        formatCurrencyPlain(p.amount)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 10 }, 2: { halign: 'right' } },
      margin: { left: margin, right: margin }
    });

    yPos = doc.lastAutoTable.finalY + 8;
  }

  // === AMORTIZATION SCHEDULE ===
  addNewPage();

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Amortization Schedule', pageWidth / 2, 16, { align: 'center' });
  yPos = 35;

  const tableData = schedule.map(row => [
    row.month,
    formatDate(row.date, row.emiDay),
    row.rate + '%',
    formatCurrencyPlain(row.emi),
    row.disbursement > 0 ? formatCurrencyPlain(row.disbursement) : '-',
    formatCurrencyPlain(row.principal),
    formatCurrencyPlain(row.interest),
    row.partPayment > 0 ? formatCurrencyPlain(row.partPayment) : '-',
    formatCurrencyPlain(row.totalPayment),
    formatCurrencyPlain(row.balance)
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['#', 'EMI Date', 'Rate', 'EMI', 'Disb.', 'Principal', 'Interest', 'Part Pay', 'Total', 'Balance']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
    styles: { fontSize: 6, cellPadding: 2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 20 },
      2: { cellWidth: 10 },
      3: { cellWidth: 16, halign: 'right' },
      4: { cellWidth: 16, halign: 'right' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 16, halign: 'right' },
      7: { cellWidth: 16, halign: 'right' },
      8: { cellWidth: 16, halign: 'right' },
      9: { cellWidth: 18, halign: 'right' }
    },
    margin: { left: 5, right: 5 },
    didParseCell: function (data) {
      if (data.section === 'body' && data.row.index === tableData.length - 1) {
        data.cell.styles.textColor = [16, 185, 129];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // === FOOTER ON ALL PAGES ===
  const pageCount = doc.internal.getNumberOfPages();
  const disclaimerText = 'DISCLAIMER: This report is for educational purposes only. Results are approximate and should not be considered as financial advice.';

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setFontSize(7);
    doc.setTextColor(180, 140, 60);
    doc.text(disclaimerText, pageWidth / 2, pageHeight - 15, { align: 'center', maxWidth: pageWidth - 30 });

    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = userName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Loan_Report_${safeName}_${dateStr}.pdf`);
}
