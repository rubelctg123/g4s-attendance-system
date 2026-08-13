import React, { useState, useEffect } from 'react';
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
import { fetchAttendanceRecords, saveAttendanceRecords, getShiftSettings } from '../lib/db';
import { exportSingleJobCardToExcel } from '../utils/exportExcel';
import {
  Calendar,
  Save,
  FileDown,
  Eye,
  Sparkles,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
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
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => e.employee_id === selectedEmployeeId) || employees[0];

  // Sync when employee selection changes
  useEffect(() => {
    if (selectedEmployee && selectedEmployee.employee_id !== selectedEmployeeId) {
      setSelectedEmployeeId(selectedEmployee.employee_id);
    }
  }, [employees]);

  // Load attendance data whenever employee, year, or month changes
  useEffect(() => {
    if (selectedEmployee) {
      loadMonthJobCard();
    }
  }, [selectedEmployeeId, selectedYear, selectedMonth]);

  const totalDaysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const monthName = MONTHS[selectedMonth - 1];

  // Helper to load job card from DB / local or initialize blank calendar
  const loadMonthJobCard = async () => {
    if (!selectedEmployee) return;

    setSettings(getShiftSettings());
    const existingRecords = await fetchAttendanceRecords(selectedEmployee.employee_id, selectedYear, selectedMonth);

    const existingMap = new Map<string, AttendanceRecord>();
    existingRecords.forEach((r) => existingMap.set(r.attendance_date, r));

    const fullMonthRecords: AttendanceRecord[] = [];

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = formatDateString(selectedYear, selectedMonth, day);
      const dayName = getDayName(selectedYear, selectedMonth, day);
      const isFriday = dayName.toLowerCase() === 'friday';

      if (existingMap.has(dateStr)) {
        const rec = existingMap.get(dateStr)!;
        // Ensure metrics are re-calculated with current settings
        const metrics = calculateRowMetrics(rec.status, rec.shift, rec.in_time, rec.out_time, settings, dayName, dateStr, selectedEmployee?.category);
        fullMonthRecords.push({
          ...rec,
          day_name: dayName,
          ...metrics,
        });
      } else {
        // Default new row
        const defaultStatus: AttendanceStatus = isFriday ? 'W' : 'P';
        const defaultShift: ShiftType = isFriday ? '' : 'A';
        const suggested = isFriday ? { inTime: '', outTime: '' } : generateSuggestedTimes(defaultShift, dateStr);

        const metrics = calculateRowMetrics(defaultStatus, defaultShift, suggested.inTime, suggested.outTime, settings, dayName, dateStr, selectedEmployee?.category);

        fullMonthRecords.push({
          id: `rec-${selectedEmployee.employee_id}-${dateStr}`,
          employee_id: selectedEmployee.employee_id,
          attendance_date: dateStr,
          day_name: dayName,
          status: defaultStatus,
          shift: defaultShift,
          in_time: suggested.inTime,
          out_time: suggested.outTime,
          duration_minutes: metrics.duration_minutes,
          late_minutes: metrics.late_minutes,
          early_minutes: metrics.early_minutes,
          overtime_minutes: metrics.overtime_minutes,
          remarks: '',
        });
      }
    }

    setRecords(fullMonthRecords);
  };

  // Update a single field in a row
  const handleRowChange = (index: number, field: keyof AttendanceRecord, value: any) => {
    const updated = [...records];
    const row = { ...updated[index], [field]: value };

    // If status changed to leave or absent, clear shift and times
    if (field === 'status') {
      const newStatus = value as AttendanceStatus;
      if (newStatus === 'A' || newStatus === 'CL' || newStatus === 'SL' || newStatus === 'EL') {
        row.shift = '';
        row.in_time = '';
        row.out_time = '';
      } else if ((newStatus === 'P' || newStatus === 'OSD' || newStatus === 'REP' || newStatus === 'ADJ') && !row.shift) {
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
        if (row.status === 'A' || row.status === 'CL' || row.status === 'SL' || row.status === 'EL') {
          row.status = 'P';
        }
      } else {
        row.in_time = '';
        row.out_time = '';
      }
    }

    // Recalculate metrics
    const metrics = calculateRowMetrics(row.status, row.shift, row.in_time, row.out_time, settings, row.day_name, row.attendance_date, selectedEmployee?.category);
    updated[index] = { ...row, ...metrics };
    setRecords(updated);
  };

  // Bulk Quick Fill Actions
  const handleBulkFillShift = (shiftType: 'A' | 'C') => {
    const updated = records.map((rec) => {
      const isFriday = rec.day_name?.toLowerCase() === 'friday';
      if (isFriday) {
        return {
          ...rec,
          status: 'W' as AttendanceStatus,
          shift: '' as ShiftType,
          in_time: '',
          out_time: '',
          duration_minutes: 0,
          late_minutes: 0,
          early_minutes: 0,
          overtime_minutes: 0,
        };
      }
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
    });
    setRecords(updated);
  };

  const handleSetFridaysOff = () => {
    const updated = records.map((rec) => {
      const isFriday = rec.day_name?.toLowerCase() === 'friday';
      if (isFriday) {
        return {
          ...rec,
          status: 'W' as AttendanceStatus,
          shift: '' as ShiftType,
          in_time: '',
          out_time: '',
          duration_minutes: 0,
          late_minutes: 0,
          early_minutes: 0,
          overtime_minutes: 0,
        };
      }
      return rec;
    });
    setRecords(updated);
  };

  const handleRegenerateSuggestedTimes = () => {
    const updated = records.map((rec) => {
      if ((rec.status === 'P' || rec.status === 'OSD' || rec.status === 'REP' || rec.status === 'ADJ') && rec.shift) {
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
  };

  // Save Job Card
  const handleSave = async () => {
    if (!selectedEmployee) return;
    setIsSaving(true);
    try {
      await saveAttendanceRecords(records);
      setSaveToast('Job Card saved successfully.');
      setTimeout(() => setSaveToast(null), 3500);
    } catch (e) {
      console.error(e);
      setSaveToast('Error saving Job Card.');
      setTimeout(() => setSaveToast(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  // Monthly summary
  const summary: MonthlySummary = calculateMonthlySummary(records, totalDaysInMonth, selectedEmployee?.category);

  return (
    <div className="space-y-6">
      {/* Save Success Toast Banner */}
      {saveToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between transition-all animate-bounce">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span className="font-semibold text-sm">{saveToast}</span>
          </div>
          <button onClick={() => setSaveToast(null)} className="text-emerald-200 hover:text-white text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* Employee Picker */}
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Select Employee
            </label>
            <select
              id="attendance-employee-select"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg p-2.5 focus:bg-white focus:outline-none focus:border-slate-400"
            >
              {employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.employee_id} — {emp.name} ({emp.job_title})
                </option>
              ))}
            </select>
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
          <div className="lg:col-span-3">
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
          <div className="flex items-center space-x-4">
            <div className="w-11 h-11 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              {selectedEmployee.employee_id.substring(selectedEmployee.employee_id.length - 4)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">{selectedEmployee.name}</h2>
                <span className="text-[10px] bg-emerald-900/80 text-emerald-200 border border-emerald-700 px-2 py-0.5 rounded font-mono font-semibold">
                  ID: {selectedEmployee.employee_id}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 mt-0.5">
                {selectedEmployee.job_title} • {selectedEmployee.company_name} ({selectedEmployee.business_unit})
              </p>
            </div>
          </div>

          {/* Quick Preset Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="preset-a-shift-btn"
              onClick={() => handleBulkFillShift('A')}
              className="text-xs bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1"
              title="Fill Day Shift A (08:00-20:00) for all working days"
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Fill A Shift</span>
            </button>

            <button
              id="preset-c-shift-btn"
              onClick={() => handleBulkFillShift('C')}
              className="text-xs bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1"
              title="Fill Night Shift C (20:00-08:00) for all working days"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-300" />
              <span>Fill C Shift</span>
            </button>

            <button
              id="preset-fridays-off-btn"
              onClick={handleSetFridaysOff}
              className="text-xs bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1"
            >
              <Calendar className="w-3.5 h-3.5 text-rose-300" />
              <span>Fridays = Offday</span>
            </button>

            <button
              id="preset-suggest-times-btn"
              onClick={handleRegenerateSuggestedTimes}
              className="text-xs bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1 font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Auto-Suggest Times</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Attendance Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Job Card Register — {monthName} {selectedYear}
            </h3>
            <p className="text-xs text-slate-500">
              Total {totalDaysInMonth} Days • Edit status, shift & duty timestamps directly below
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="save-jobcard-main-btn"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-md shadow-sm flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>

            <button
              id="preview-pdf-btn"
              onClick={() => onPreviewPdf(selectedEmployee, monthName, selectedYear, records, totalDaysInMonth)}
              className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-medium text-xs px-3.5 py-2 rounded-md shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              <span>Generate PDF Report</span>
            </button>

            <button
              id="export-excel-btn"
              onClick={() =>
                exportSingleJobCardToExcel(selectedEmployee, monthName, selectedYear, records, totalDaysInMonth)
              }
              className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-medium text-xs px-3.5 py-2 rounded-md shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel Export</span>
            </button>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#f8fafc] text-[#64748b] font-semibold text-xs border-b-2 border-slate-200">
              <tr>
                <th className="px-3 py-3 text-center w-10">SL</th>
                <th className="px-3 py-3 w-28">Date</th>
                <th className="px-3 py-3 w-24">Day</th>
                <th className="px-3 py-3 w-24 text-center">Status</th>
                <th className="px-3 py-3 w-20 text-center">Shift</th>
                <th className="px-3 py-3 w-32">In Time</th>
                <th className="px-3 py-3 w-32">Out Time</th>
                <th className="px-3 py-3 w-24 text-center">Duration</th>
                <th className="px-3 py-3 w-20 text-center">Late</th>
                <th className="px-3 py-3 w-20 text-center">Early</th>
                <th className="px-3 py-3 w-24 text-center">OT Hrs</th>
                <th className="px-3 py-3 min-w-[120px]">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((row, idx) => {
                const isFriday = row.day_name?.toLowerCase() === 'friday';
                const isPresent = row.status === 'P' || row.status === 'OSD' || row.status === 'W' || row.status === 'H' || row.status === 'REP' || row.status === 'ADJ';

                return (
                  <tr
                    key={row.attendance_date}
                    className={`transition-colors hover:bg-slate-50 ${
                      isFriday ? 'bg-slate-50/60' : 'bg-white'
                    }`}
                  >
                    {/* SL */}
                    <td className="px-3 py-2.5 text-center font-bold text-slate-400">{idx + 1}</td>

                    {/* Date */}
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {formatDisplayDate(row.attendance_date)}
                    </td>

                    {/* Day */}
                    <td className="px-3 py-2.5 font-medium">
                      <span className={isFriday ? 'font-bold text-rose-600' : 'text-slate-500'}>{row.day_name}</span>
                    </td>

                    {/* Status Dropdown */}
                    <td className="px-3 py-2.5 text-center">
                      <select
                        id={`status-select-row-${idx}`}
                        value={row.status}
                        onChange={(e) => handleRowChange(idx, 'status', e.target.value as AttendanceStatus)}
                        className={`font-bold text-[11px] rounded px-2 py-0.5 outline-none border transition-colors ${
                          row.status === 'P'
                            ? 'bg-[#dcfce7] text-[#166534] border-emerald-200'
                            : row.status === 'A'
                            ? 'bg-[#fee2e2] text-[#991b1b] border-red-200'
                            : row.status === 'W'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
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
                    <td className="px-3 py-2.5 text-center">
                      <select
                        id={`shift-select-row-${idx}`}
                        value={row.shift}
                        disabled={!isPresent}
                        onChange={(e) => handleRowChange(idx, 'shift', e.target.value as ShiftType)}
                        className="font-medium text-xs rounded px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 outline-none disabled:opacity-40"
                      >
                        <option value="">—</option>
                        <option value="A">Shift A</option>
                        <option value="C">Shift C</option>
                      </select>
                    </td>

                    {/* In Time Input */}
                    <td className="px-3 py-2.5">
                      <input
                        id={`intime-input-row-${idx}`}
                        type="text"
                        placeholder="HH:MM:SS"
                        value={row.in_time}
                        disabled={!isPresent}
                        onChange={(e) => handleRowChange(idx, 'in_time', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono rounded px-2 py-1 focus:border-slate-400 focus:bg-white outline-none disabled:opacity-40 disabled:bg-transparent disabled:border-transparent text-slate-400"
                      />
                    </td>

                    {/* Out Time Input */}
                    <td className="px-3 py-2.5">
                      <input
                        id={`outtime-input-row-${idx}`}
                        type="text"
                        placeholder="HH:MM:SS"
                        value={row.out_time}
                        disabled={!isPresent}
                        onChange={(e) => handleRowChange(idx, 'out_time', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono rounded px-2 py-1 focus:border-slate-400 focus:bg-white outline-none disabled:opacity-40 disabled:bg-transparent disabled:border-transparent text-slate-400"
                      />
                    </td>

                    {/* Duration */}
                    <td className="px-3 py-2.5 text-center font-mono font-medium text-slate-800">
                      {row.duration_minutes > 0 ? minutesToHHMM(row.duration_minutes) : '0.0h'}
                    </td>

                    {/* Late Min */}
                    <td className="px-3 py-2.5 text-center font-mono">
                      {row.late_minutes > 0 ? (
                        <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                          {row.late_minutes}m
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Early Min */}
                    <td className="px-3 py-2.5 text-center font-mono">
                      {row.early_minutes > 0 ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {row.early_minutes}m
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Overtime */}
                    <td className="px-3 py-2.5 text-center font-mono font-medium text-amber-600">
                      {row.overtime_minutes > 0 ? minutesToHHMM(row.overtime_minutes) : '0.0h'}
                    </td>

                    {/* Remarks */}
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        placeholder="Optional remarks"
                        value={row.remarks || ''}
                        onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-slate-300 text-slate-700 text-xs py-0.5 outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">Showing {records.length} days for {monthName} {selectedYear}</p>
          <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 py-2 rounded-md shadow-sm transition-colors">
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
