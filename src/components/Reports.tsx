import React, { useState, useEffect } from 'react';
import { AttendanceRecord, G4SEmployee, MonthlySummary } from '../types';
import { fetchAttendanceRecords } from '../lib/db';
import { calculateMonthlySummary, getDaysInMonth, minutesToHHMM } from '../utils/calculations';
import { generateBulkJobCardsPdf, generateSingleJobCardPdf } from '../utils/exportPdf';
import { exportBulkJobCardsToExcel } from '../utils/exportExcel';
import { FileText, Download, FileSpreadsheet, RefreshCw, Users, Shield, ArrowUpRight } from 'lucide-react';

interface ReportsProps {
  employees: G4SEmployee[];
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export const Reports: React.FC<ReportsProps> = ({ employees }) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Map of empId -> records
  const [allRecordsMap, setAllRecordsMap] = useState<Record<string, AttendanceRecord[]>>({});

  const totalDays = getDaysInMonth(selectedYear, selectedMonth);
  const monthName = MONTHS[selectedMonth - 1];

  const loadAllAttendance = async () => {
    setIsLoading(true);
    const map: Record<string, AttendanceRecord[]> = {};

    for (const emp of employees) {
      const recs = await fetchAttendanceRecords(emp.employee_id, selectedYear, selectedMonth);
      map[emp.employee_id] = recs;
    }

    setAllRecordsMap(map);
    setIsLoading(false);
  };

  useEffect(() => {
    if (employees.length > 0) {
      loadAllAttendance();
    }
  }, [selectedYear, selectedMonth, employees]);

  const handleBulkPdfExport = () => {
    generateBulkJobCardsPdf(employees, monthName, selectedYear, allRecordsMap, totalDays);
  };

  const handleBulkExcelExport = () => {
    exportBulkJobCardsToExcel(employees, monthName, selectedYear, allRecordsMap, totalDays);
  };

  return (
    <div className="space-y-6">
      {/* Report Controls Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Monthly Bulk Job Card Reports</h2>
            <p className="text-xs text-slate-500">
              Generate and download combined PDF or Excel reports for all G4S security guards
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg p-2.5 outline-none focus:bg-white focus:border-slate-400"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg p-2.5 outline-none focus:bg-white focus:border-slate-400"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            <button
              onClick={loadAllAttendance}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              title="Refresh report data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
          <button
            id="bulk-pdf-export-btn"
            onClick={handleBulkPdfExport}
            disabled={isLoading || employees.length === 0}
            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs p-4 rounded-xl shadow-md flex items-center justify-between transition-all group disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Export All PDF Job Cards</p>
                <p className="font-bold text-xs text-white">Download Combined PDF ({monthName})</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-emerald-100 group-hover:translate-y-0.5 transition-transform" />
          </button>

          <button
            id="bulk-excel-export-btn"
            onClick={handleBulkExcelExport}
            disabled={isLoading || employees.length === 0}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-medium text-xs p-4 rounded-xl shadow-xs flex items-center justify-between transition-colors group disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Export All Excel Sheets</p>
                <p className="font-bold text-xs text-slate-900">Download Master Excel Workbook</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Summary Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-[#f8fafc] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Monthly Attendance Summary Matrix — {monthName} {selectedYear}
            </h3>
            <p className="text-xs text-slate-500">Calculated metrics for all deployed G4S security guards</p>
          </div>
          <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            {employees.length} Employees
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#f8fafc] text-[#64748b] font-semibold text-xs border-b-2 border-slate-200">
              <tr>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">Employee Name</th>
                <th className="px-3 py-3">Designation</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3 text-center">Days</th>
                <th className="px-3 py-3 text-center">Present</th>
                <th className="px-3 py-3 text-center">Absent</th>
                <th className="px-3 py-3 text-center">Leave</th>
                <th className="px-3 py-3 text-center">Offday (W)</th>
                <th className="px-3 py-3 text-center">Holiday (H)</th>
                <th className="px-3 py-3 text-center">OSD</th>
                <th className="px-3 py-3 text-center">Late Mins</th>
                <th className="px-3 py-3 text-center">Early Mins</th>
                <th className="px-3 py-3 text-center">Total OT</th>
                <th className="px-3 py-3 text-center">Payable Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => {
                const recs = allRecordsMap[emp.employee_id] || [];
                const summary: MonthlySummary = calculateMonthlySummary(recs, totalDays, emp.category);

                return (
                  <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-mono font-bold text-slate-900">{emp.employee_id}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">{emp.name}</td>
                    <td className="px-3 py-3 text-slate-600">{emp.job_title}</td>
                    <td className="px-3 py-3 font-semibold">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          emp.category === 'Staff'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {emp.category || 'Worker'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-500">{summary.daysInMonth}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-700">{summary.presentDays}</td>
                    <td className="px-3 py-3 text-center font-bold text-rose-700">{summary.absentDays}</td>
                    <td className="px-3 py-3 text-center font-bold text-amber-700">{summary.leaveDays}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-600">{summary.offDays}</td>
                    <td className="px-3 py-3 text-center font-bold text-purple-700">{summary.holidays}</td>
                    <td className="px-3 py-3 text-center font-bold text-sky-700">{summary.osdDays}</td>
                    <td className="px-3 py-3 text-center font-mono">
                      {summary.totalLateMinutes > 0 ? (
                        <span className="text-rose-700 font-bold">{summary.totalLateMinutes}m</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      {summary.totalEarlyMinutes > 0 ? (
                        <span className="text-amber-700 font-bold">{summary.totalEarlyMinutes}m</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-medium text-amber-600">
                      {minutesToHHMM(summary.totalOvertimeMinutes)}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-900 bg-emerald-50">
                      {summary.payableDays} Days
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
