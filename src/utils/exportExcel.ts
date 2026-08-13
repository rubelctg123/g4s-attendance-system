import * as XLSX from 'xlsx';
import { AttendanceRecord, G4SEmployee, MonthlySummary } from '../types';
import { calculateMonthlySummary, formatDisplayDate, minutesToHHMM } from './calculations';

export function exportSingleJobCardToExcel(
  employee: G4SEmployee,
  monthName: string,
  year: number,
  records: AttendanceRecord[],
  totalDaysInMonth: number
) {
  const summary: MonthlySummary = calculateMonthlySummary(records, totalDaysInMonth, employee.category);

  const headerRows = [
    ['VANCOT LIMITED.'],
    ['Plot No: 18-20, Sector: 3, KEPZ, North Patenga, Chittagong'],
    ['G4S SECURITY JOB CARD'],
    [],
    ['Employee ID:', employee.employee_id, 'Name:', employee.name, 'Report Month:', `${monthName} ${year}`],
    ['Job Title:', employee.job_title, 'Category:', employee.category || 'Worker', 'Company:', employee.company_name],
    ['Join Date:', employee.join_date, 'Duty Line:', employee.line || 'Main Gate', 'Print Date:', new Date().toISOString().split('T')[0]],
    [],
  ];

  const tableHeader = [
    'SL',
    'Date',
    'Day',
    'In Time',
    'Out Time',
    'Duration',
    'Late Min',
    'Early Min',
    'OT Hours',
    'Status',
    'Shift',
    'Remarks',
  ];

  const tableBody = records.map((rec, idx) => [
    idx + 1,
    formatDisplayDate(rec.attendance_date),
    rec.day_name || '',
    rec.in_time || '-',
    rec.out_time || '-',
    rec.duration_minutes > 0 ? minutesToHHMM(rec.duration_minutes) : '-',
    rec.late_minutes || 0,
    rec.early_minutes || 0,
    rec.overtime_minutes > 0 ? minutesToHHMM(rec.overtime_minutes) : '00:00',
    rec.status,
    rec.shift || '-',
    rec.remarks || '',
  ]);

  const summaryRows = [
    [],
    ['MONTHLY ATTENDANCE SUMMARY'],
    ['Days in Month', summary.daysInMonth, 'Holiday', summary.holidays, 'Leave', summary.leaveDays, 'Total Overtime', `${minutesToHHMM(summary.totalOvertimeMinutes)} Hrs`],
    ['Present Days', summary.presentDays, 'OSD Days', summary.osdDays, 'Late Days / Mins', `${summary.lateDays} D / ${summary.totalLateMinutes} M`, 'Early Days / Mins', `${summary.earlyDays} D / ${summary.totalEarlyMinutes} M`],
    ['Absent Days', summary.absentDays, 'Offdays', summary.offDays, 'Payable Days', `${summary.payableDays} Days`],
  ];

  const worksheetData = [...headerRows, tableHeader, ...tableBody, ...summaryRows];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 }, // SL
    { wch: 14 }, // Date
    { wch: 12 }, // Day
    { wch: 12 }, // In Time
    { wch: 12 }, // Out Time
    { wch: 12 }, // Duration
    { wch: 10 }, // Late Min
    { wch: 10 }, // Early Min
    { wch: 10 }, // OT Hours
    { wch: 10 }, // Status
    { wch: 8 }, // Shift
    { wch: 25 }, // Remarks
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Job Card');

  const filename = `G4S_JobCard_${employee.employee_id}_${monthName}_${year}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportBulkJobCardsToExcel(
  employees: G4SEmployee[],
  monthName: string,
  year: number,
  allRecordsMap: Record<string, AttendanceRecord[]>,
  totalDaysInMonth: number
) {
  const workbook = XLSX.utils.book_new();

  // Create a consolidated Master Sheet
  const consolidatedRows: any[][] = [
    ['VANCOT LIMITED - G4S ALL EMPLOYEES ATTENDANCE REPORT'],
    [`Month: ${monthName} ${year}`, `Export Date: ${new Date().toISOString().split('T')[0]}`],
    [],
    [
      'SL',
      'Employee ID',
      'Employee Name',
      'Job Title',
      'Date',
      'Day',
      'In Time',
      'Out Time',
      'Duration',
      'Late Min',
      'Early Min',
      'OT Hours',
      'Status',
      'Shift',
      'Remarks',
    ],
  ];

  let slCounter = 1;

  employees.forEach((emp) => {
    const records = allRecordsMap[emp.employee_id] || [];
    records.forEach((rec) => {
      consolidatedRows.push([
        slCounter++,
        emp.employee_id,
        emp.name,
        emp.job_title,
        formatDisplayDate(rec.attendance_date),
        rec.day_name || '',
        rec.in_time || '-',
        rec.out_time || '-',
        rec.duration_minutes > 0 ? minutesToHHMM(rec.duration_minutes) : '-',
        rec.late_minutes || 0,
        rec.early_minutes || 0,
        rec.overtime_minutes > 0 ? minutesToHHMM(rec.overtime_minutes) : '00:00',
        rec.status,
        rec.shift || '-',
        rec.remarks || '',
      ]);
    });
  });

  const masterSheet = XLSX.utils.aoa_to_sheet(consolidatedRows);
  masterSheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 20 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(workbook, masterSheet, 'All Attendance');

  const filename = `G4S_JobCards_${monthName}_${year}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
