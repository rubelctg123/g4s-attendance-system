import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceRecord, G4SEmployee, MonthlySummary } from '../types';
import { fetchAllEmployeesAttendanceForMonth, subscribeToRealtimeChanges } from '../lib/db';
import { calculateMonthlySummary, formatDisplayDate, getDaysInMonth, minutesToHHMM } from '../utils/calculations';
import { generateAttendanceSummaryPdf, generateBulkJobCardsPdf } from '../utils/exportPdf';
import { exportBulkJobCardsToExcel } from '../utils/exportExcel';
import { ReportPdfPreviewModal } from './ReportPdfPreviewModal';
import { FileText, Download, FileSpreadsheet, RefreshCw, Eye, Search, X, Calendar } from 'lucide-react';
import type { jsPDF } from 'jspdf';

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

interface PreviewState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  filename: string;
  pdfDocGenerator: () => jsPDF | null;
}

export const Reports: React.FC<ReportsProps> = ({ employees }) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Map of empId -> records
  const [allRecordsMap, setAllRecordsMap] = useState<Record<string, AttendanceRecord[]>>({});

  // PDF Preview Modal State
  const [previewState, setPreviewState] = useState<PreviewState>({
    isOpen: false,
    title: '',
    subtitle: '',
    filename: '',
    pdfDocGenerator: () => null,
  });

  const totalDays = getDaysInMonth(selectedYear, selectedMonth);
  const monthName = MONTHS[selectedMonth - 1];

  const activeEmployees = employees.filter((e) => e.active);
  const inactiveEmployees = employees.filter((e) => !e.active);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      (emp.job_title && emp.job_title.toLowerCase().includes(searchTerm.toLowerCase().trim()))
  );

  const loadAllAttendance = useCallback(async () => {
    if (employees.length === 0) return;
    setIsLoading(true);
    try {
      const map = await fetchAllEmployeesAttendanceForMonth(employees, selectedYear, selectedMonth);
      setAllRecordsMap(map);
    } catch (e) {
      console.warn('Error loading all attendance records:', e);
    } finally {
      setIsLoading(false);
    }
  }, [employees, selectedYear, selectedMonth]);

  useEffect(() => {
    loadAllAttendance();

    // Subscribe to realtime changes so reports update immediately whenever attendance is modified
    const unsubscribe = subscribeToRealtimeChanges(
      undefined,
      () => {
        loadAllAttendance();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [loadAllAttendance]);

  // Handlers for the 5 Report Cards (Download)
  const handleActiveJobCardsPdf = () => {
    generateBulkJobCardsPdf(
      activeEmployees,
      monthName,
      selectedYear,
      allRecordsMap,
      totalDays,
      `G4S_Active_JobCards_${monthName}_${selectedYear}.pdf`
    );
  };

  const handleInactiveJobCardsPdf = () => {
    generateBulkJobCardsPdf(
      inactiveEmployees,
      monthName,
      selectedYear,
      allRecordsMap,
      totalDays,
      `G4S_Inactive_JobCards_${monthName}_${selectedYear}.pdf`
    );
  };

  const handleAllSummaryPdf = () => {
    generateAttendanceSummaryPdf(
      employees,
      monthName,
      selectedYear,
      allRecordsMap,
      totalDays,
      'all'
    );
  };

  const handleActiveSummaryPdf = () => {
    generateAttendanceSummaryPdf(
      activeEmployees,
      monthName,
      selectedYear,
      allRecordsMap,
      totalDays,
      'active'
    );
  };

  const handleInactiveSummaryPdf = () => {
    generateAttendanceSummaryPdf(
      inactiveEmployees,
      monthName,
      selectedYear,
      allRecordsMap,
      totalDays,
      'inactive'
    );
  };

  // Preview Handlers for the 5 Report Cards
  const openActiveJobCardsPreview = () => {
    setPreviewState({
      isOpen: true,
      title: 'Active Employee Job Cards',
      subtitle: `${monthName} ${selectedYear} • ${activeEmployees.length} Active Guards`,
      filename: `G4S_Active_JobCards_${monthName}_${selectedYear}.pdf`,
      pdfDocGenerator: () =>
        generateBulkJobCardsPdf(
          activeEmployees,
          monthName,
          selectedYear,
          allRecordsMap,
          totalDays,
          `G4S_Active_JobCards_${monthName}_${selectedYear}.pdf`,
          false
        ),
    });
  };

  const openInactiveJobCardsPreview = () => {
    setPreviewState({
      isOpen: true,
      title: 'Inactive Employee Job Cards',
      subtitle: `${monthName} ${selectedYear} • ${inactiveEmployees.length} Inactive Guards`,
      filename: `G4S_Inactive_JobCards_${monthName}_${selectedYear}.pdf`,
      pdfDocGenerator: () =>
        generateBulkJobCardsPdf(
          inactiveEmployees,
          monthName,
          selectedYear,
          allRecordsMap,
          totalDays,
          `G4S_Inactive_JobCards_${monthName}_${selectedYear}.pdf`,
          false
        ),
    });
  };

  const openAllSummaryPreview = () => {
    setPreviewState({
      isOpen: true,
      title: 'Complete Attendance Summary',
      subtitle: `${monthName} ${selectedYear} • All ${employees.length} Guards (Active & Inactive)`,
      filename: `G4S_Attendance_Summary_All_${monthName}_${selectedYear}.pdf`,
      pdfDocGenerator: () =>
        generateAttendanceSummaryPdf(
          employees,
          monthName,
          selectedYear,
          allRecordsMap,
          totalDays,
          'all',
          false
        ),
    });
  };

  const openActiveSummaryPreview = () => {
    setPreviewState({
      isOpen: true,
      title: 'Active Employee Attendance Summary',
      subtitle: `${monthName} ${selectedYear} • ${activeEmployees.length} Active Guards`,
      filename: `G4S_Attendance_Summary_Active_${monthName}_${selectedYear}.pdf`,
      pdfDocGenerator: () =>
        generateAttendanceSummaryPdf(
          activeEmployees,
          monthName,
          selectedYear,
          allRecordsMap,
          totalDays,
          'active',
          false
        ),
    });
  };

  const openInactiveSummaryPreview = () => {
    setPreviewState({
      isOpen: true,
      title: 'Inactive Employee Attendance Summary',
      subtitle: `${monthName} ${selectedYear} • ${inactiveEmployees.length} Inactive Guards`,
      filename: `G4S_Attendance_Summary_Inactive_${monthName}_${selectedYear}.pdf`,
      pdfDocGenerator: () =>
        generateAttendanceSummaryPdf(
          inactiveEmployees,
          monthName,
          selectedYear,
          allRecordsMap,
          totalDays,
          'inactive',
          false
        ),
    });
  };

  const handleBulkExcelExport = () => {
    exportBulkJobCardsToExcel(employees, monthName, selectedYear, allRecordsMap, totalDays);
  };

  return (
    <div className="space-y-6">
      {/* Top Report / Export Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h2 className="text-base font-bold text-slate-900">Attendance & Job Card Reports</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate official printable PDF reports, interactive previews, and summary analytics for {monthName} {selectedYear}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 space-x-1.5">
              <Calendar className="w-4 h-4 text-slate-400 ml-1.5" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-slate-800 text-xs font-semibold px-2 py-1.5 outline-none cursor-pointer"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-slate-800 text-xs font-semibold px-2 py-1.5 outline-none cursor-pointer border-l border-slate-200"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadAllAttendance}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Refresh report data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              id="bulk-excel-export-btn"
              onClick={handleBulkExcelExport}
              disabled={isLoading || employees.length === 0}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              title="Export complete master workbook in Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Master Excel</span>
            </button>
          </div>
        </div>

        {/* 5 Distinct Export / Report Cards with Preview & Download */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 mt-5">
          {/* Card 1: Active Job Cards */}
          <div className="bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-emerald-500/50 hover:shadow-sm p-4 flex flex-col justify-between transition-all group">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                  ACTIVE JOB CARD PDF
                </span>
                <span className="text-[11px] font-bold font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {activeEmployees.length} Guards
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-xs group-hover:text-emerald-700 transition-colors">
                Active Employee Job Cards
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Combined PDF containing monthly job cards ONLY for active guards.
              </p>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                onClick={openActiveJobCardsPreview}
                disabled={isLoading || activeEmployees.length === 0}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Preview Active Job Cards"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Preview</span>
              </button>
              <button
                onClick={handleActiveJobCardsPdf}
                disabled={isLoading || activeEmployees.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Download Active Job Cards"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Card 2: Inactive Job Cards */}
          <div className="bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-rose-400/50 hover:shadow-sm p-4 flex flex-col justify-between transition-all group">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold tracking-wider text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200">
                  INACTIVE JOB CARD PDF
                </span>
                <span className="text-[11px] font-bold font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {inactiveEmployees.length} Guards
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-xs group-hover:text-rose-700 transition-colors">
                Inactive Employee Job Cards
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Combined PDF containing monthly job cards ONLY for deactivated guards.
              </p>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                onClick={openInactiveJobCardsPreview}
                disabled={isLoading || inactiveEmployees.length === 0}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Preview Inactive Job Cards"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Preview</span>
              </button>
              <button
                onClick={handleInactiveJobCardsPdf}
                disabled={isLoading || inactiveEmployees.length === 0}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Download Inactive Job Cards"
              >
                <Download className="w-3.5 h-3.5 text-rose-300" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Card 3: All Attendance Summary */}
          <div className="bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-indigo-500/50 hover:shadow-sm p-4 flex flex-col justify-between transition-all group">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200">
                  ALL ATTENDANCE SUMMARY
                </span>
                <span className="text-[11px] font-bold font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {employees.length} Guards
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-xs group-hover:text-indigo-700 transition-colors">
                Complete Attendance Summary
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                One master summary report containing ALL guards (Active & Inactive).
              </p>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                onClick={openAllSummaryPreview}
                disabled={isLoading || employees.length === 0}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Preview Complete Summary"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Preview</span>
              </button>
              <button
                onClick={handleAllSummaryPdf}
                disabled={isLoading || employees.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Download Complete Summary"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Card 4: Active Attendance Summary */}
          <div className="bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-teal-500/50 hover:shadow-sm p-4 flex flex-col justify-between transition-all group">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold tracking-wider text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded border border-teal-200">
                  ACTIVE ATTENDANCE SUMMARY
                </span>
                <span className="text-[11px] font-bold font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {activeEmployees.length} Guards
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-xs group-hover:text-teal-700 transition-colors">
                Active Employee Summary
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Attendance summary matrix report containing ONLY active guards.
              </p>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                onClick={openActiveSummaryPreview}
                disabled={isLoading || activeEmployees.length === 0}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Preview Active Summary"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Preview</span>
              </button>
              <button
                onClick={handleActiveSummaryPdf}
                disabled={isLoading || activeEmployees.length === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Download Active Summary"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Card 5: Inactive Attendance Summary */}
          <div className="bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-sm p-4 flex flex-col justify-between transition-all group">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-700 bg-slate-200/90 px-2 py-0.5 rounded border border-slate-300">
                  INACTIVE ATTENDANCE SUMMARY
                </span>
                <span className="text-[11px] font-bold font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {inactiveEmployees.length} Guards
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-xs group-hover:text-slate-700 transition-colors">
                Inactive Employee Summary
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Attendance summary matrix report containing ONLY inactive guards.
              </p>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                onClick={openInactiveSummaryPreview}
                disabled={isLoading || inactiveEmployees.length === 0}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Preview Inactive Summary"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Preview</span>
              </button>
              <button
                onClick={handleInactiveSummaryPdf}
                disabled={isLoading || inactiveEmployees.length === 0}
                className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Download Inactive Summary"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-[#f8fafc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Monthly Attendance Summary Matrix — {monthName} {selectedYear}
            </h3>
            <p className="text-xs text-slate-500">Calculated metrics for all deployed G4S security guards</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ID or Name..."
                className="bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-44 sm:w-56 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <span className="text-xs font-bold font-mono px-2.5 py-1.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              {filteredEmployees.length} / {employees.length} Guards
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#f8fafc] text-[#64748b] font-semibold text-xs border-b-2 border-slate-200">
              <tr>
                <th className="px-3 py-3 text-center w-12">SL</th>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">Employee Name</th>
                <th className="px-3 py-3 text-center">Join Date</th>
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
              {filteredEmployees.map((emp, idx) => {
                let recs = allRecordsMap[emp.employee_id] || [];
                const isInactive = !emp.active || Boolean(emp.inactive_date);
                const deactivationDate = isInactive && emp.inactive_date ? emp.inactive_date : null;
                if (deactivationDate) {
                  recs = recs.filter((r) => r.attendance_date <= deactivationDate);
                }
                const summary: MonthlySummary = calculateMonthlySummary(
                  recs,
                  deactivationDate ? recs.length : totalDays,
                  emp.category
                );

                return (
                  <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center font-mono text-slate-500 font-semibold">{idx + 1}</td>
                    <td className="px-3 py-3 font-mono font-bold text-slate-900">{emp.employee_id}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">
                      <div className="flex items-center space-x-1.5">
                        <span>{emp.name}</span>
                        {isInactive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200" title={`Deactivated: ${emp.inactive_date || 'Yes'}`}>
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-center text-slate-700">
                      {emp.join_date ? formatDisplayDate(emp.join_date) : '-'}
                    </td>
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

      {/* Interactive PDF Preview Modal */}
      <ReportPdfPreviewModal
        isOpen={previewState.isOpen}
        onClose={() => setPreviewState((prev) => ({ ...prev, isOpen: false }))}
        title={previewState.title}
        subtitle={previewState.subtitle}
        filename={previewState.filename}
        pdfDocGenerator={previewState.pdfDocGenerator}
      />
    </div>
  );
};
