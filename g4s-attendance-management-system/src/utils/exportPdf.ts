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

  const isInactive = !employee.active || Boolean(employee.inactive_date);
  const deactivationDate = isInactive && employee.inactive_date ? employee.inactive_date : null;
  const filteredRecords = deactivationDate
    ? records.filter((r) => r.attendance_date <= deactivationDate)
    : records;

  const summary: MonthlySummary = calculateMonthlySummary(filteredRecords, filteredRecords.length, employee.category);
  const printDate = new Date().toISOString().split('T')[0];

  // Helper to draw single employee job card on current page
  drawJobCardContent(doc, employee, monthName, year, filteredRecords, summary, printDate);

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
  totalDaysInMonth: number,
  customFilename?: string,
  saveToFile: boolean = true
): jsPDF | null {
  if (!employees || employees.length === 0) return null;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const printDate = new Date().toISOString().split('T')[0];

  let pageCount = 0;
  employees.forEach((employee) => {
    let empRecords = allRecordsMap[employee.employee_id] || [];
    const isInactive = !employee.active || Boolean(employee.inactive_date);
    const deactivationDate = isInactive && employee.inactive_date ? employee.inactive_date : null;
    if (deactivationDate) {
      empRecords = empRecords.filter((r) => r.attendance_date <= deactivationDate);
    }

    if (pageCount > 0) {
      doc.addPage();
    }
    pageCount++;

    const summary = calculateMonthlySummary(empRecords, empRecords.length, employee.category);
    drawJobCardContent(doc, employee, monthName, year, empRecords, summary, printDate);
  });

  if (saveToFile) {
    const filename = customFilename || `G4S_JobCards_${monthName}_${year}.pdf`;
    doc.save(filename);
  }

  return doc;
}

export function generateAttendanceSummaryPdf(
  employees: G4SEmployee[],
  monthName: string,
  year: number,
  allRecordsMap: Record<string, AttendanceRecord[]>,
  totalDaysInMonth: number,
  reportType: 'all' | 'active' | 'inactive' = 'all',
  saveToFile: boolean = true
): jsPDF | null {
  if (!employees || employees.length === 0) return null;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm
  const printDate = new Date().toISOString().split('T')[0];

  // Header Title
  let currentY = 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('VANCOT LIMITED.', pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Plot No: 18-20, Sector: 3, KEPZ, North Patenga, Chittagong', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const titleText =
    reportType === 'active'
      ? `MONTHLY ATTENDANCE SUMMARY (ACTIVE EMPLOYEES) - ${monthName.toUpperCase()} ${year}`
      : reportType === 'inactive'
      ? `MONTHLY ATTENDANCE SUMMARY (INACTIVE EMPLOYEES) - ${monthName.toUpperCase()} ${year}`
      : `MONTHLY ATTENDANCE SUMMARY (ALL EMPLOYEES) - ${monthName.toUpperCase()} ${year}`;
  doc.text(titleText, pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const infoText = `Total Employees: ${employees.length}  |  Department: Security (G4S)  |  Printed: ${formatDisplayDate(printDate)}`;
  doc.text(infoText, pageWidth / 2, currentY, { align: 'center' });

  // Prepare table data
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLeave = 0;
  let totalOff = 0;
  let totalHol = 0;
  let totalOsd = 0;
  let totalLateM = 0;
  let totalEarlyM = 0;
  let totalOtM = 0;
  let totalPayDays = 0;

  const tableBody = employees.map((emp, idx) => {
    let empRecords = allRecordsMap[emp.employee_id] || [];
    const isInactive = !emp.active || Boolean(emp.inactive_date);
    const deactivationDate = isInactive && emp.inactive_date ? emp.inactive_date : null;
    if (deactivationDate) {
      empRecords = empRecords.filter((r) => r.attendance_date <= deactivationDate);
    }

    const summary = calculateMonthlySummary(
      empRecords,
      deactivationDate ? empRecords.length : totalDaysInMonth,
      emp.category
    );

    totalPresent += summary.presentDays;
    totalAbsent += summary.absentDays;
    totalLeave += summary.leaveDays;
    totalOff += summary.offDays;
    totalHol += summary.holidays;
    totalOsd += summary.osdDays;
    totalLateM += summary.totalLateMinutes;
    totalEarlyM += summary.totalEarlyMinutes;
    totalOtM += summary.totalOvertimeMinutes;
    totalPayDays += summary.payableDays;

    const joinDateFormatted = emp.join_date ? formatDisplayDate(emp.join_date) : '-';

    return [
      idx + 1,
      emp.employee_id,
      emp.name + (isInactive ? ' (Inactive)' : ''),
      joinDateFormatted,
      emp.job_title || '-',
      emp.category || 'Worker',
      summary.daysInMonth,
      summary.presentDays,
      summary.absentDays,
      summary.leaveDays,
      summary.offDays,
      summary.holidays,
      summary.osdDays,
      summary.totalLateMinutes > 0 ? `${summary.totalLateMinutes}m` : '-',
      summary.totalEarlyMinutes > 0 ? `${summary.totalEarlyMinutes}m` : '-',
      minutesToHHMM(summary.totalOvertimeMinutes),
      `${summary.payableDays}`,
    ];
  });

  // Footer row
  const footerRow = [
    'Total',
    '',
    `${employees.length} Guards`,
    '',
    '',
    '',
    '',
    totalPresent,
    totalAbsent,
    totalLeave,
    totalOff,
    totalHol,
    totalOsd,
    totalLateM > 0 ? `${totalLateM}m` : '-',
    totalEarlyM > 0 ? `${totalEarlyM}m` : '-',
    minutesToHHMM(totalOtM),
    `${totalPayDays}`,
  ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [
      [
        'SL',
        'ID',
        'Employee Name',
        'Join Date',
        'Designation',
        'Category',
        'Days',
        'Present',
        'Absent',
        'Leave',
        'Offday',
        'Holiday',
        'OSD',
        'Late Mins',
        'Early Mins',
        'Total OT',
        'Payable',
      ],
    ],
    body: tableBody,
    foot: [footerRow],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      valign: 'middle',
      cellPadding: 1.5,
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      valign: 'middle',
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 1.3,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 }, // SL
      1: { halign: 'center', cellWidth: 18, fontStyle: 'bold' }, // ID
      2: { halign: 'left', cellWidth: 38 }, // Name
      3: { halign: 'center', cellWidth: 18 }, // Join Date
      4: { halign: 'left', cellWidth: 32 }, // Designation
      5: { halign: 'center', cellWidth: 14 }, // Category
      6: { halign: 'center', cellWidth: 10 }, // Days
      7: { halign: 'center', cellWidth: 11, fontStyle: 'bold', textColor: [22, 101, 52] }, // Present
      8: { halign: 'center', cellWidth: 11, fontStyle: 'bold', textColor: [185, 28, 28] }, // Absent
      9: { halign: 'center', cellWidth: 11, textColor: [180, 83, 9] }, // Leave
      10: { halign: 'center', cellWidth: 11 }, // Offday
      11: { halign: 'center', cellWidth: 11, textColor: [126, 34, 206] }, // Holiday
      12: { halign: 'center', cellWidth: 10, textColor: [3, 105, 161] }, // OSD
      13: { halign: 'center', cellWidth: 14 }, // Late
      14: { halign: 'center', cellWidth: 14 }, // Early
      15: { halign: 'center', cellWidth: 16, fontStyle: 'bold', textColor: [180, 83, 9] }, // Total OT
      16: { halign: 'center', cellWidth: 14, fontStyle: 'bold', textColor: [22, 101, 52] }, // Payable
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    margin: { left: 8, right: 8 },
  });

  // Signatures on last page
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : currentY + 30;
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let sigY = finalY + 10;
  if (sigY + 15 > pageHeight) {
    doc.addPage();
    sigY = 22;
  }

  doc.setLineWidth(0.2);
  doc.setDrawColor(148, 163, 184);

  const sigSpacing = pageWidth / 4;
  
  // Line 1: Prepared By
  const p1 = 20;
  doc.line(p1, sigY, p1 + 45, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Prepared By', p1 + 22.5, sigY + 4, { align: 'center' });

  // Line 2: Checked By
  const p2 = p1 + sigSpacing;
  doc.line(p2, sigY, p2 + 45, sigY);
  doc.text('Checked By', p2 + 22.5, sigY + 4, { align: 'center' });

  // Line 3: Approved By (Vancot)
  const p3 = p2 + sigSpacing;
  doc.line(p3, sigY, p3 + 45, sigY);
  doc.text('Approved By (Vancot)', p3 + 22.5, sigY + 4, { align: 'center' });

  // Line 4: G4S Representative
  const p4 = p3 + sigSpacing;
  doc.line(p4, sigY, p4 + 45, sigY);
  doc.text('G4S Representative', p4 + 22.5, sigY + 4, { align: 'center' });

  if (saveToFile) {
    const filename =
      reportType === 'active'
        ? `G4S_Attendance_Summary_Active_${monthName}_${year}.pdf`
        : reportType === 'inactive'
        ? `G4S_Attendance_Summary_Inactive_${monthName}_${year}.pdf`
        : `G4S_Attendance_Summary_All_${monthName}_${year}.pdf`;

    doc.save(filename);
  }

  return doc;
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
    const isDutyActive = rec.status !== 'A' && rec.status !== 'CL' && rec.status !== 'SL' && rec.status !== 'EL';
    return [
      (idx + 1).toString(),
      formatDisplayDate(rec.attendance_date),
      rec.day_name ? rec.day_name.substring(0, 3) : '',
      isDutyActive && rec.in_time ? rec.in_time : '-',
      isDutyActive && rec.out_time ? rec.out_time : '-',
      isDutyActive && rec.duration_minutes > 0 ? minutesToHHMM(rec.duration_minutes) : '-',
      isDutyActive && rec.late_minutes > 0 ? `${rec.late_minutes}m` : '-',
      isDutyActive && rec.early_minutes > 0 ? `${rec.early_minutes}m` : '-',
      isDutyActive && rec.in_time && rec.out_time ? minutesToHHMM(rec.overtime_minutes) : '-',
      rec.status,
      isDutyActive ? rec.shift || '-' : '-',
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
      if (data.section === 'body') {
        const rowIndex = data.row.index;
        const rowRec = records[rowIndex];

        // Highlight Day in red for Weekly Offday (W)
        if (data.column.index === 2 && rowRec?.status === 'W') {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        }

        // Highlight Status colors
        if (data.column.index === 9) {
          const val = data.cell.raw;
          if (val === 'P') data.cell.styles.textColor = [22, 101, 52]; // Green
          else if (val === 'A') data.cell.styles.textColor = [185, 28, 28]; // Red
          else if (val === 'W') data.cell.styles.textColor = [225, 29, 72]; // Red/Rose Offday
          else if (val === 'H') data.cell.styles.textColor = [126, 34, 206]; // Purple
          else if (val === 'OSD') data.cell.styles.textColor = [3, 105, 161]; // Blue
        }
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
