import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AttendanceRecord, AttendanceStatus, G4SEmployee, MonthlySummary, ShiftSettings, ShiftType } from '../types';
import {
  calculateMonthlySummary,
  calculateRowMetrics,
  formatDateString,
  formatDisplayDate,
  getDayName,
  getDaysInMonth,
  generateSuggestedTimes,
  minutesToHHMM,
} from '../utils/calculations';
import {
  fetchAttendanceRecords,
  saveAttendanceRecords,
  getShiftSettings,
  generateDefaultAttendanceForEmployee,
  subscribeToRealtimeChanges,
} from '../lib/db';
import { exportSingleJobCardToExcel } from '../utils/exportExcel';
import { SearchableEmployeeSelect } from './SearchableEmployeeSelect';
import {
  Calendar,
  Save,
  FileDown,
  FileText,
  Eye,
  Sparkles,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
  X,
  Filter,
  RotateCcw,
} from 'lucide-react';

interface AttendanceManagerProps {
  employees: G4SEmployee[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  onPreviewPdf: (
    employee: G4SEmployee,
    monthName: string,
    year: number,
    records: AttendanceRecord[],
    totalDays: number
  ) => void;
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

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  employees,
  selectedEmployeeId,
  setSelectedEmployeeId,
  onPreviewPdf,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<ShiftSettings>(getShiftSettings());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Feature 1: Custom Date Range for Applying Shifts
  const [shiftFromDate, setShiftFromDate] = useState<string>(() =>
    formatDateString(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
  );
  const [shiftToDate, setShiftToDate] = useState<string>(() =>
    formatDateString(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + 1)
    )
  );

  // Feature 2: Custom Date Range for Job Card View / Report Generation
  const [viewFromDate, setViewFromDate] = useState<string>(() =>
    formatDateString(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
  );
  const [viewToDate, setViewToDate] = useState<string>(() =>
    formatDateString(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + 1)
    )
  );
  const [isViewRangeActive, setIsViewRangeActive] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const selectedEmployee = employees.find((e) => e.employee_id === selectedEmployeeId) || employees[0];

  // Sync when employee selection changes
  useEffect(() => {
    if (selectedEmployee && selectedEmployee.employee_id !== selectedEmployeeId) {
      setSelectedEmployeeId(selectedEmployee.employee_id);
    }
  }, [employees]);

  const totalDaysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const monthName = MONTHS[selectedMonth - 1];

  // Helper to load job card from DB / local or initialize blank calendar
  const loadMonthJobCard = useCallback(async () => {
    if (!selectedEmployee) return;

    setSettings(getShiftSettings());
    const existingRecords = await fetchAttendanceRecords(selectedEmployee.employee_id, selectedYear, selectedMonth);

    const fullMonthRecords = generateDefaultAttendanceForEmployee(
      selectedEmployee,
      selectedYear,
      selectedMonth,
      existingRecords
    );

    setRecords(fullMonthRecords);

    // If records were generated for the first time, save them in the background
    if (existingRecords.length === 0 && fullMonthRecords.length > 0) {
      saveAttendanceRecords(fullMonthRecords).catch(() => {});
    }

    const isInactive = !selectedEmployee.active || Boolean(selectedEmployee.inactive_date);
    const deactivationDate = isInactive && selectedEmployee.inactive_date ? selectedEmployee.inactive_date : null;

    // Sync default dates for date pickers when month/year changes
    const firstDateStr = formatDateString(selectedYear, selectedMonth, 1);
    const monthLastDateStr = formatDateString(selectedYear, selectedMonth, totalDaysInMonth);
    const maxAllowedDateStr = deactivationDate && deactivationDate < monthLastDateStr ? deactivationDate : monthLastDateStr;

    const defaultFrom = deactivationDate && firstDateStr > deactivationDate ? deactivationDate : firstDateStr;
    const defaultTo = maxAllowedDateStr < defaultFrom ? defaultFrom : maxAllowedDateStr;

    setShiftFromDate(defaultFrom);
    setShiftToDate(defaultTo);
    setViewFromDate(defaultFrom);
    setViewToDate(defaultTo);
    setIsViewRangeActive(false);
  }, [selectedEmployee, selectedYear, selectedMonth, totalDaysInMonth]);

  // Load attendance data whenever employee, year, or month changes
  useEffect(() => {
    if (selectedEmployee) {
      loadMonthJobCard();
    }
  }, [loadMonthJobCard]);

  // Realtime subscription for external attendance updates
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeChanges(
      undefined,
      () => {
        // Attendance changed in cloud
        if (selectedEmployee) {
          loadMonthJobCard();
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [loadMonthJobCard, selectedEmployee]);

  // Update a single field in a row (identified by attendance_date for filtered view safety)
  const handleRowChange = (attendanceDate: string, field: keyof AttendanceRecord, value: any) => {
    const index = records.findIndex((r) => r.attendance_date === attendanceDate);
    if (index === -1) return;

    const updated = [...records];
    const row = { ...updated[index], [field]: value };

    // If status changed to W, H, A, CL, SL, EL: clear shift and times
    if (field === 'status') {
      const newStatus = value as AttendanceStatus;
      if (newStatus === 'W' || newStatus === 'H' || newStatus === 'A' || newStatus === 'CL' || newStatus === 'SL' || newStatus === 'EL') {
        row.shift = '';
        row.in_time = '';
        row.out_time = '';
      } else if (!row.shift && (newStatus === 'P' || newStatus === 'OSD' || newStatus === 'REP' || newStatus === 'ADJ')) {
        row.shift = 'A';
        const suggested = generateSuggestedTimes('A', row.attendance_date);
        row.in_time = suggested.inTime;
        row.out_time = suggested.outTime;
      }
    }

    // If shift changed to A or C, regenerate suggested times
    if (field === 'shift') {
      const newShift = value as ShiftType;
      if (newShift === 'A' || newShift === 'C') {
        const suggested = generateSuggestedTimes(newShift, row.attendance_date);
        row.in_time = suggested.inTime;
        row.out_time = suggested.outTime;
        // If status was an absent/leave status, flip to Present. If it was W or H, KEEP W or H!
        if (row.status === 'A' || row.status === 'CL' || row.status === 'SL' || row.status === 'EL') {
          row.status = 'P';
        }
      } else {
        row.shift = '';
        row.in_time = '';
        row.out_time = '';
      }
    }

    // Recalculate metrics
    const metrics = calculateRowMetrics(row.status, row.shift, row.in_time, row.out_time, settings, row.day_name, row.attendance_date, selectedEmployee?.category);
    updated[index] = { ...row, ...metrics };
    setRecords(updated);
  };

  // Feature 1: Bulk Quick Fill Actions for Custom Date Range
  const handleBulkFillShift = (shiftType: 'A' | 'C') => {
    if (!shiftFromDate || !shiftToDate) {
      showToast('Please select both From Date and To Date to apply shift.', 'error');
      return;
    }
    if (shiftFromDate > shiftToDate) {
      showToast('From Date cannot be later than To Date.', 'error');
      return;
    }

    let modifiedCount = 0;
    const updated = records.map((rec) => {
      // Apply to all dates within the inclusive custom range (daily shifting)
      if (rec.attendance_date >= shiftFromDate && rec.attendance_date <= shiftToDate) {
        modifiedCount++;
        const suggested = generateSuggestedTimes(shiftType, rec.attendance_date);
        const metrics = calculateRowMetrics('P', shiftType, suggested.inTime, suggested.outTime, settings, rec.day_name, rec.attendance_date, selectedEmployee?.category);
        return {
          ...rec,
          status: 'P' as AttendanceStatus,
          shift: shiftType as ShiftType,
          in_time: suggested.inTime,
          out_time: suggested.outTime,
          ...metrics,
        };
      }
      return rec;
    });

    if (modifiedCount === 0) {
      showToast('No records matched the selected date range in this month.', 'error');
      return;
    }

    setRecords(updated);
    showToast(`Applied Shift ${shiftType} for ${modifiedCount} day(s) (${formatDisplayDate(shiftFromDate)} – ${formatDisplayDate(shiftToDate)}).`, 'success');
  };

  const handleRegenerateSuggestedTimes = () => {
    if (shiftFromDate && shiftToDate && shiftFromDate > shiftToDate) {
      showToast('From Date cannot be later than To Date.', 'error');
      return;
    }

    let modifiedCount = 0;
    const updated = records.map((rec) => {
      const inRange = !shiftFromDate || !shiftToDate || (rec.attendance_date >= shiftFromDate && rec.attendance_date <= shiftToDate);
      if (inRange && (rec.status === 'P' || rec.status === 'OSD' || rec.status === 'REP' || rec.status === 'ADJ') && rec.shift) {
        modifiedCount++;
        const suggested = generateSuggestedTimes(rec.shift, rec.attendance_date);
        const metrics = calculateRowMetrics(rec.status, rec.shift, suggested.inTime, suggested.outTime, settings, rec.day_name, rec.attendance_date, selectedEmployee?.category);
        return {
          ...rec,
          in_time: suggested.inTime,
          out_time: suggested.outTime,
          ...metrics,
        };
      }
      return rec;
    });
    setRecords(updated);
    showToast(`Regenerated suggested duty times for ${modifiedCount} day(s).`, 'success');
  };

  // Feature 2: Handlers for Job Card Custom View Range
  const handleApplyViewRange = () => {
    if (!viewFromDate || !viewToDate) {
      showToast('Please select both From Date and To Date for custom range.', 'error');
      return;
    }
    if (viewFromDate > viewToDate) {
      showToast('From Date cannot be later than To Date.', 'error');
      return;
    }

    setIsViewRangeActive(true);
    showToast(`Job Card filtered: ${formatDisplayDate(viewFromDate)} – ${formatDisplayDate(viewToDate)}.`, 'success');
  };

  const handleClearViewRange = () => {
    setIsViewRangeActive(false);
    const firstDateStr = formatDateString(selectedYear, selectedMonth, 1);
    const lastDateStr = formatDateString(selectedYear, selectedMonth, totalDaysInMonth);
    setViewFromDate(firstDateStr);
    setViewToDate(lastDateStr);
    showToast('Restored full month Job Card view.', 'success');
  };

  // Save Job Card (saves full monthly records state)
  const handleSave = async () => {
    if (!selectedEmployee) return;
    setIsSaving(true);
    try {
      await saveAttendanceRecords(records);
      showToast('Changes saved successfully.', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Error saving Job Card.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered records for Table, PDF, Excel, and Summary calculations
  const isInactive = selectedEmployee && (!selectedEmployee.active || Boolean(selectedEmployee.inactive_date));
  const deactivationDate = isInactive && selectedEmployee?.inactive_date ? selectedEmployee.inactive_date : null;

  const activeLifecycleRecords = deactivationDate
    ? records.filter((r) => r.attendance_date <= deactivationDate)
    : records;

  const displayedRecords = isViewRangeActive
    ? activeLifecycleRecords.filter((r) => r.attendance_date >= viewFromDate && r.attendance_date <= viewToDate)
    : activeLifecycleRecords;

  const maxSelectableDate = deactivationDate && deactivationDate < formatDateString(selectedYear, selectedMonth, totalDaysInMonth)
    ? deactivationDate
    : formatDateString(selectedYear, selectedMonth, totalDaysInMonth);

  // Monthly / Range summary
  const summary: MonthlySummary = calculateMonthlySummary(displayedRecords, displayedRecords.length, selectedEmployee?.category);

  return (
    <div className="space-y-6">
      {/* Floating Top-Right Toast Notification for Save Changes Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-50 pointer-events-auto transition-all duration-300 transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-top-3"
        >
          <div
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl shadow-2xl border ${
              toast.type === 'success'
                ? 'bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/40'
                : 'bg-slate-900/95 text-white border-rose-500/40 shadow-rose-950/40'
            } backdrop-blur-md min-w-[280px] max-w-sm`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                toast.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-bold text-white tracking-tight">
                {toast.type === 'success' ? 'Saved' : 'Save Failed'}
              </p>
              <p className="text-[11px] text-slate-300 truncate">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                setToast(null);
              }}
              className="text-slate-400 hover:text-white text-xs font-semibold p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* Employee Picker */}
          <div className="lg:col-span-5 relative">
            <SearchableEmployeeSelect
              id="attendance-employee-select"
              label="Select Employee"
              employees={employees}
              selectedEmployeeId={selectedEmployeeId}
              onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
            />
          </div>

          {/* Year Picker */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Year</label>
            <select
              id="attendance-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg p-2.5 focus:bg-white focus:outline-none focus:border-slate-400"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Month Picker */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Month</label>
            <select
              id="attendance-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg p-2.5 focus:bg-white focus:outline-none focus:border-slate-400"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m} ({idx + 1})
                </option>
              ))}
            </select>
          </div>

          {/* Load Button */}
          <div className="lg:col-span-3">
            <button
              id="attendance-load-jobcard-btn"
              onClick={loadMonthJobCard}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4 text-white" />
              <span>Load Job Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Employee Info Strip & Quick Tools */}
      {selectedEmployee && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-xl p-4 text-white shadow-md border border-emerald-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] bg-emerald-900/90 text-emerald-200 border border-emerald-700 px-2.5 py-0.5 rounded font-mono font-bold">
                  ID: {selectedEmployee.employee_id}
                </span>
                <h2 className="text-sm font-bold text-white">{selectedEmployee.name}</h2>
                {isInactive && (
                  <span className="text-[10px] bg-rose-900/90 text-rose-200 border border-rose-700 px-2 py-0.5 rounded font-mono font-semibold">
                    Inactive {deactivationDate ? `(Deactivated: ${formatDisplayDate(deactivationDate)})` : ''}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-200/80 mt-1">
                {selectedEmployee.job_title}
                {!isInactive && ` • ${selectedEmployee.company_name} (${selectedEmployee.business_unit})`}
                {deactivationDate && (
                  <span className="text-rose-300 font-medium ml-2">
                    • Attendance terminates on {formatDisplayDate(deactivationDate)}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Preset Actions with Custom Shift Date Range */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-emerald-700/60 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Shift Range:</span>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-300 font-semibold">From</span>
                <input
                  type="date"
                  id="shift-from-date"
                  value={shiftFromDate}
                  min={formatDateString(selectedYear, selectedMonth, 1)}
                  max={maxSelectableDate}
                  onChange={(e) => setShiftFromDate(e.target.value)}
                  className="bg-white text-slate-900 font-semibold text-xs border border-slate-300 rounded px-2 py-1 outline-none font-mono shadow-xs focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 cursor-pointer"
                />
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-300 font-semibold">To</span>
                <input
                  type="date"
                  id="shift-to-date"
                  value={shiftToDate}
                  min={formatDateString(selectedYear, selectedMonth, 1)}
                  max={maxSelectableDate}
                  onChange={(e) => setShiftToDate(e.target.value)}
                  className="bg-white text-slate-900 font-semibold text-xs border border-slate-300 rounded px-2 py-1 outline-none font-mono shadow-xs focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <button
              id="preset-a-shift-btn"
              onClick={() => handleBulkFillShift('A')}
              className="text-xs bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1 cursor-pointer font-medium"
              title="Fill Day Shift A (08:00-20:00) for selected date range"
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Fill A Shift</span>
            </button>

            <button
              id="preset-c-shift-btn"
              onClick={() => handleBulkFillShift('C')}
              className="text-xs bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1 cursor-pointer font-medium"
              title="Fill Night Shift C (20:00-08:00) for selected date range"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-300" />
              <span>Fill C Shift</span>
            </button>

            <button
              id="preset-suggest-times-btn"
              onClick={handleRegenerateSuggestedTimes}
              className="text-xs bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1 font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Auto-Suggest Times</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Attendance Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-emerald-50/50">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Job Card Register — {monthName} {selectedYear}
              </h3>
              {isViewRangeActive && (
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                  Custom View: {formatDisplayDate(viewFromDate)} – {formatDisplayDate(viewToDate)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Total {displayedRecords.length} Days {isViewRangeActive ? `(Selected Range)` : `(Full Month)`} • Edit status, shift & duty timestamps directly below
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Feature 2: Job Card Date Range Selector */}
            <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Job Card Range:</span>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-600 font-semibold">From</span>
                <input
                  type="date"
                  id="view-from-date"
                  value={viewFromDate}
                  min={formatDateString(selectedYear, selectedMonth, 1)}
                  max={maxSelectableDate}
                  onChange={(e) => setViewFromDate(e.target.value)}
                  className="text-xs text-slate-900 font-mono font-semibold bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 shadow-xs cursor-pointer"
                />
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-600 font-semibold">To</span>
                <input
                  type="date"
                  id="view-to-date"
                  value={viewToDate}
                  min={formatDateString(selectedYear, selectedMonth, 1)}
                  max={maxSelectableDate}
                  onChange={(e) => setViewToDate(e.target.value)}
                  className="text-xs text-slate-900 font-mono font-semibold bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 shadow-xs cursor-pointer"
                />
              </div>
              <button
                type="button"
                id="apply-job-card-range-btn"
                onClick={handleApplyViewRange}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
              >
                <Filter className="w-3 h-3" />
                <span>Apply Range</span>
              </button>
              {isViewRangeActive && (
                <button
                  type="button"
                  id="clear-job-card-range-btn"
                  onClick={handleClearViewRange}
                  className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-1 rounded hover:bg-slate-100 border border-slate-200 transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Show Full Month"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Full Month</span>
                </button>
              )}
            </div>

            <button
              id="save-jobcard-main-btn"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-md shadow-sm flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>

            <button
              id="preview-pdf-btn"
              onClick={() =>
                onPreviewPdf(
                  selectedEmployee,
                  isViewRangeActive
                    ? `${monthName} (${formatDisplayDate(viewFromDate)} - ${formatDisplayDate(viewToDate)})`
                    : monthName,
                  selectedYear,
                  displayedRecords,
                  displayedRecords.length
                )
              }
              className="bg-white hover:bg-rose-50/80 text-slate-800 border border-slate-300 hover:border-rose-300 font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs flex items-center space-x-2 transition-all cursor-pointer group"
            >
              <FileText className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
              <span>Generate PDF Report</span>
            </button>

            <button
              id="export-excel-btn"
              onClick={() =>
                exportSingleJobCardToExcel(
                  selectedEmployee,
                  isViewRangeActive
                    ? `${monthName} (${formatDisplayDate(viewFromDate)} - ${formatDisplayDate(viewToDate)})`
                    : monthName,
                  selectedYear,
                  displayedRecords,
                  displayedRecords.length
                )
              }
              className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-medium text-xs px-3.5 py-2 rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel Export</span>
            </button>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#f8fafc] text-[#64748b] font-semibold text-[11px] uppercase tracking-wider border-b-2 border-slate-200">
              <tr>
                <th className="px-2.5 py-1.5 text-center w-10">SL</th>
                <th className="px-2.5 py-1.5 w-28">Date</th>
                <th className="px-2.5 py-1.5 w-24">Day</th>
                <th className="px-2.5 py-1.5 w-20 text-center">Status</th>
                <th className="px-2.5 py-1.5 w-20 text-center">Shift</th>
                <th className="px-2.5 py-1.5 w-28">In Time</th>
                <th className="px-2.5 py-1.5 w-28">Out Time</th>
                <th className="px-2.5 py-1.5 w-20 text-center">Duration</th>
                <th className="px-2.5 py-1.5 w-16 text-center">Late</th>
                <th className="px-2.5 py-1.5 w-16 text-center">Early</th>
                <th className="px-2.5 py-1.5 w-20 text-center">OT Hrs</th>
                <th className="px-2.5 py-1.5 min-w-[110px]">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-amber-500/80" />
                      <p className="text-sm font-semibold text-slate-700">
                        {deactivationDate
                          ? `Employee was deactivated on ${formatDisplayDate(deactivationDate)}.`
                          : 'No attendance records found.'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {deactivationDate
                          ? 'Attendance tracking ends at deactivation date; no further dates are shown.'
                          : 'Try adjusting the date filter or clicking "Load Job Card".'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedRecords.map((row, idx) => {
                const isOffDay = row.status === 'W';
                const isDutyAllowed = row.status !== 'A' && row.status !== 'CL' && row.status !== 'SL' && row.status !== 'EL';

                return (
                  <tr
                    key={row.attendance_date}
                    className={`transition-colors ${
                      isOffDay ? 'bg-rose-50/35 hover:bg-rose-50/60' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* SL */}
                    <td className="px-2.5 py-1 text-center font-bold text-slate-400">{idx + 1}</td>

                    {/* Date */}
                    <td className="px-2.5 py-1 font-medium text-slate-900">
                      {formatDisplayDate(row.attendance_date)}
                    </td>

                    {/* Day */}
                    <td className="px-2.5 py-1 font-medium">
                      <span className={isOffDay ? 'font-bold text-rose-600' : 'text-slate-600'}>{row.day_name}</span>
                    </td>

                    {/* Status Dropdown */}
                    <td className="px-2.5 py-1 text-center">
                      <select
                        id={`status-select-row-${idx}`}
                        value={row.status}
                        onChange={(e) => handleRowChange(row.attendance_date, 'status', e.target.value as AttendanceStatus)}
                        className={`font-bold text-[11px] rounded px-1.5 py-0.5 outline-none border transition-colors leading-tight ${
                          row.status === 'P'
                            ? 'bg-[#dcfce7] text-[#166534] border-emerald-200'
                            : row.status === 'A'
                            ? 'bg-[#fee2e2] text-[#991b1b] border-red-200'
                            : row.status === 'W'
                            ? 'bg-rose-100 text-rose-700 border-rose-300 font-bold'
                            : row.status === 'H'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : row.status === 'OSD'
                            ? 'bg-sky-100 text-sky-800 border-sky-200'
                            : row.status === 'CL'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : row.status === 'SL'
                            ? 'bg-teal-100 text-teal-800 border-teal-200'
                            : row.status === 'EL'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : row.status === 'REP'
                            ? 'bg-orange-100 text-orange-800 border-orange-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}
                      >
                        <option value="P">P</option>
                        <option value="A">A</option>
                        <option value="W">W</option>
                        <option value="H">H</option>
                        <option value="OSD">OSD</option>
                        <option value="CL">CL</option>
                        <option value="SL">SL</option>
                        <option value="EL">EL</option>
                        <option value="REP">REP</option>
                        <option value="ADJ">ADJ</option>
                      </select>
                    </td>

                    {/* Shift Dropdown */}
                    <td className="px-2.5 py-1 text-center">
                      <select
                        id={`shift-select-row-${idx}`}
                        value={row.shift}
                        disabled={!isDutyAllowed}
                        onChange={(e) => handleRowChange(row.attendance_date, 'shift', e.target.value as ShiftType)}
                        className="font-medium text-[11px] rounded px-1.5 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 outline-none disabled:opacity-40 leading-tight cursor-pointer"
                      >
                        <option value="">—</option>
                        <option value="A">Shift A</option>
                        <option value="C">Shift C</option>
                      </select>
                    </td>

                    {/* In Time Input */}
                    <td className="px-2.5 py-1">
                      <input
                        id={`intime-input-row-${idx}`}
                        type="text"
                        placeholder="HH:MM:SS"
                        value={isDutyAllowed ? row.in_time : ''}
                        disabled={!isDutyAllowed}
                        onChange={(e) => handleRowChange(row.attendance_date, 'in_time', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono rounded px-2 py-0.5 focus:border-slate-400 focus:bg-white outline-none disabled:opacity-40 disabled:bg-transparent disabled:border-transparent text-slate-400 leading-tight"
                      />
                    </td>

                    {/* Out Time Input */}
                    <td className="px-2.5 py-1">
                      <input
                        id={`outtime-input-row-${idx}`}
                        type="text"
                        placeholder="HH:MM:SS"
                        value={isDutyAllowed ? row.out_time : ''}
                        disabled={!isDutyAllowed}
                        onChange={(e) => handleRowChange(row.attendance_date, 'out_time', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono rounded px-2 py-0.5 focus:border-slate-400 focus:bg-white outline-none disabled:opacity-40 disabled:bg-transparent disabled:border-transparent text-slate-400 leading-tight"
                      />
                    </td>

                    {/* Duration */}
                    <td className="px-2.5 py-1 text-center font-mono font-medium text-slate-800">
                      {isDutyAllowed && row.in_time && row.out_time && row.duration_minutes > 0 ? (
                        minutesToHHMM(row.duration_minutes)
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Late Min */}
                    <td className="px-2.5 py-1 text-center font-mono">
                      {isDutyAllowed && row.late_minutes > 0 ? (
                        <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
                          {row.late_minutes}m
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Early Min */}
                    <td className="px-2.5 py-1 text-center font-mono">
                      {isDutyAllowed && row.early_minutes > 0 ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                          {row.early_minutes}m
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Overtime */}
                    <td className="px-2.5 py-1 text-center font-mono font-semibold text-amber-600">
                      {isDutyAllowed && row.in_time && row.out_time ? (
                        minutesToHHMM(row.overtime_minutes)
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>

                    {/* Remarks */}
                    <td className="px-2.5 py-1">
                      <input
                        type="text"
                        placeholder="Optional remarks"
                        value={row.remarks || ''}
                        onChange={(e) => handleRowChange(row.attendance_date, 'remarks', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-slate-300 text-slate-700 text-xs py-0.5 outline-none leading-tight"
                      />
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {displayedRecords.length} days {isViewRangeActive ? `(Filtered: ${formatDisplayDate(viewFromDate)} – ${formatDisplayDate(viewToDate)})` : `for ${monthName} ${selectedYear}`}
          </p>
          <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 py-2 rounded-md shadow-sm transition-colors cursor-pointer">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Monthly Summary Box (Professional Polish Theme Card) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Monthly Attendance Summary — {monthName} {selectedYear}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono font-medium">
            {selectedEmployee?.name} ({selectedEmployee?.employee_id})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Days In Month</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{summary.daysInMonth} Days</span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Present</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block">{summary.presentDays} Days</span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Absent</span>
            <span className="text-xl font-bold text-rose-700 mt-1 block">{summary.absentDays} Days</span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Weekly Offday</span>
            <span className="text-xl font-bold text-slate-700 mt-1 block">{summary.offDays} Days</span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Holiday</span>
            <span className="text-xl font-bold text-purple-700 mt-1 block">{summary.holidays} Days</span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">OSD (Outside Duty)</span>
            <span className="text-xl font-bold text-sky-700 mt-1 block">{summary.osdDays} Days</span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Late Days / Min</span>
            <span className="text-xl font-bold text-rose-700 mt-1 block">
              {summary.lateDays} D / {summary.totalLateMinutes} M
            </span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Early Days / Min</span>
            <span className="text-xl font-bold text-amber-700 mt-1 block">
              {summary.earlyDays} D / {summary.totalEarlyMinutes} M
            </span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Leave</span>
            <span className="text-xl font-bold text-slate-700 mt-1 block">{summary.leaveDays} Days</span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Total Overtime</span>
            <span className="text-xl font-bold text-amber-600 mt-1 block">
              {minutesToHHMM(summary.totalOvertimeMinutes)} Hour
            </span>
          </div>

          <div className="bg-emerald-50 rounded-lg p-3.5 border border-emerald-200 sm:col-span-2">
            <span className="text-emerald-800 font-bold block uppercase text-[10px]">Payable Days</span>
            <span className="text-2xl font-bold text-emerald-900 mt-1 block">{summary.payableDays} Days</span>
          </div>
        </div>
      </div>
    </div>
  );
};
