import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, G4SEmployee, MonthlySummary } from '../types';
import { calculateMonthlySummary, formatDisplayDate, minutesToHHMM } from './calculations';

export function generateSingleJobCardPdf(
  employee: G4SEmployee,
  monthName: string,
  year: number,
  records: AttendanceRecord[],
  totalDaysInMonth: number,
  saveToFile: boolean = true
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const summary: MonthlySummary = calculateMonthlySummary(records, totalDaysInMonth, employee.category);
  const printDate = new Date().toISOString().split('T')[0];

  // Helper to draw single employee job card on current page
  drawJobCardContent(doc, employee, monthName, year, records, summary, printDate);

  if (saveToFile) {
    const filename = `G4S_JobCard_${employee.employee_id}_${monthName}_${year}.pdf`;
    doc.save(filename);
  }

  return doc;
}

export function generateBulkJobCardsPdf(
  employees: G4SEmployee[],
  monthName: string,
  year: number,
  allRecordsMap: Record<string, AttendanceRecord[]>,
  totalDaysInMonth: number
) {
  if (!employees || employees.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const printDate = new Date().toISOString().split('T')[0];

  employees.forEach((employee, index) => {
    if (index > 0) {
      doc.addPage();
    }
    const empRecords = allRecordsMap[employee.employee_id] || [];
    const summary = calculateMonthlySummary(empRecords, totalDaysInMonth, employee.category);
    drawJobCardContent(doc, employee, monthName, year, empRecords, summary, printDate);
  });

  const filename = `G4S_JobCards_${monthName}_${year}.pdf`;
  doc.save(filename);
}

function drawJobCardContent(
  doc: jsPDF,
  employee: G4SEmployee,
  monthName: string,
  year: number,
  records: AttendanceRecord[],
  summary: MonthlySummary,
  printDate: string
) {
  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  let currentY = 12;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('VANCOT LIMITED.', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Plot No: 18-20, Sector: 3, KEPZ, North Patenga, Chittagong', pageWidth / 2, currentY, { align: 'center' });

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('G4S SECURITY JOB CARD', pageWidth / 2, currentY, { align: 'center' });

  currentY += 6;

  // Box for Employee Info
  const boxX = 10;
  const boxWidth = pageWidth - 20;
  const boxHeight = 22;

  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(boxX, currentY, boxWidth, boxHeight, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const col1X = boxX + 4;
  const col2X = boxX + 68;
  const col3X = boxX + 132;

  let infoY = currentY + 5;
  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Employee ID:', col1X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.employee_id, col1X + 22, infoY);

  doc.setFont('helvetica', 'bold');
  doc.text('Employee Name:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.name, col2X + 26, infoY);

  doc.setFont('helvetica', 'bold');
  doc.text('Report Month:', col3X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${monthName} ${year}`, col3X + 27, infoY);

  infoY += 5;
  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Job Title:', col1X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.job_title, col1X + 22, infoY);

  doc.setFont('helvetica', 'bold');
  doc.text('Business Unit:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.business_unit || 'Security (G4S)', col2X + 26, infoY);

  doc.setFont('helvetica', 'bold');
  doc.text('Company Name:', col3X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.company_name || 'Vancot Limited.', col3X + 27, infoY);

  infoY += 5;
  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.text('Join Date:', col1X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.join_date || 'N/A', col1X + 22, infoY);

  doc.setFont('helvetica', 'bold');
  doc.text('Duty Post/Line:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.line || 'Main Gate', col2X + 26, infoY);

  doc.setFont('helvetica', 'bold');
  doc.text('Print Date:', col3X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(printDate, col3X + 27, infoY);

  currentY += boxHeight + 4;

  // Prepare table rows
  const tableData = records.map((rec, idx) => {
    return [
      (idx + 1).toString(),
      formatDisplayDate(rec.attendance_date),
      rec.day_name ? rec.day_name.substring(0, 3) : '',
      rec.in_time || '-',
      rec.out_time || '-',
      rec.duration_minutes > 0 ? minutesToHHMM(rec.duration_minutes) : '-',
      rec.late_minutes > 0 ? `${rec.late_minutes}m` : '-',
      rec.early_minutes > 0 ? `${rec.early_minutes}m` : '-',
      rec.overtime_minutes > 0 ? minutesToHHMM(rec.overtime_minutes) : '-',
      rec.status,
      rec.shift || '-',
      rec.remarks || '',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['SL', 'Date', 'Day', 'In Time', 'Out Time', 'Duration', 'Late', 'Early', 'OT Hrs', 'Status', 'Shift', 'Remarks']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.2,
      halign: 'center',
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 58, 138], // Indigo dark
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8 }, // SL
      1: { cellWidth: 18 }, // Date
      2: { cellWidth: 12 }, // Day
      3: { cellWidth: 16 }, // In Time
      4: { cellWidth: 16 }, // Out Time
      5: { cellWidth: 16 }, // Duration
      6: { cellWidth: 12 }, // Late
      7: { cellWidth: 12 }, // Early
      8: { cellWidth: 14 }, // OT Hrs
      9: { cellWidth: 12, fontStyle: 'bold' }, // Status
      10: { cellWidth: 12 }, // Shift
      11: { cellWidth: 'auto', halign: 'left' }, // Remarks
    },
    didParseCell: (data) => {
      // Highlight Status colors
      if (data.section === 'body' && data.column.index === 9) {
        const val = data.cell.raw;
        if (val === 'P') data.cell.styles.textColor = [22, 101, 52]; // Green
        else if (val === 'A') data.cell.styles.textColor = [185, 28, 28]; // Red
        else if (val === 'W') data.cell.styles.textColor = [194, 65, 12]; // Orange
        else if (val === 'H') data.cell.styles.textColor = [126, 34, 206]; // Purple
        else if (val === 'OSD') data.cell.styles.textColor = [3, 105, 161]; // Blue
      }
    },
    margin: { left: 10, right: 10 },
  });

  // Get final Y after table
  const finalY = (doc as any).lastAutoTable.finalY + 4;

  // Draw Summary Box
  const sumBoxWidth = pageWidth - 20;
  const sumBoxHeight = 24;

  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(241, 245, 249);
  doc.rect(10, finalY, sumBoxWidth, sumBoxHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text('MONTHLY ATTENDANCE SUMMARY', 14, finalY + 4.5);

  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  // 4 Columns for summary metrics
  const sCol1 = 14;
  const sCol2 = 62;
  const sCol3 = 110;
  const sCol4 = 158;

  let sY = finalY + 9;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('DAYS IN MONTH:', sCol1, sY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.daysInMonth} DAYS`, sCol1 + 26, sY);

  doc.setFont('helvetica', 'bold');
  doc.text('HOLIDAY:', sCol2, sY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.holidays} DAYS`, sCol2 + 20, sY);

  doc.setFont('helvetica', 'bold');
  doc.text('LEAVE:', sCol3, sY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.leaveDays} DAYS`, sCol3 + 18, sY);

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL OVERTIME:', sCol4, sY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${minutesToHHMM(summary.totalOvertimeMinutes)} HOUR`, sCol4 + 26, sY);

  sY += 4.5;
  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('PRESENT:', sCol1, sY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.presentDays} DAYS`, sCol1 + 26, sY);

  doc.setFont('helvetica', 'bold');
  doc.text('OSD:', sCol2, sY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.osdDays} DAYS`, sCol2 + 20, sY);

  doc.setFont('helvetica', 'bold');
  doc.text('LATE / MIN:', sCol3, sY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.lateDays} D / ${summary.totalLateMinutes} MIN`, sCol3 + 18, sY);

  doc.setFont('helvetica', 'bold');
  doc.text('EARLY / MIN:', sCol4, sY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.earlyDays} D / ${summary.totalEarlyMinutes} MIN`, sCol4 + 26, sY);

  sY += 4.5;
  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.text('ABSENT:', sCol1, sY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.absentDays} DAYS`, sCol1 + 26, sY);

  doc.setFont('helvetica', 'bold');
  doc.text('OFFDAY:', sCol2, sY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.offDays} DAYS`, sCol2 + 20, sY);

  doc.setFont('helvetica', 'bold');
  doc.text('PAYABLE DAY:', sCol3, sY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // green
  doc.text(`${summary.payableDays} DAYS`, sCol3 + 22, sY);

  // Signatures at bottom
  const sigY = finalY + sumBoxHeight + 16;
  doc.setLineWidth(0.2);
  doc.setDrawColor(148, 163, 184);

  // Line 1: Prepared By
  doc.line(14, sigY, 50, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Prepared By', 32, sigY + 4, { align: 'center' });

  // Line 2: Checked By
  doc.line(64, sigY, 100, sigY);
  doc.text('Checked By', 82, sigY + 4, { align: 'center' });

  // Line 3: Approved By (Vancot)
  doc.line(114, sigY, 150, sigY);
  doc.text('Approved By (Vancot)', 132, sigY + 4, { align: 'center' });

  // Line 4: G4S Representative
  doc.line(164, sigY, 200, sigY);
  doc.text('G4S Representative', 182, sigY + 4, { align: 'center' });
}
