import { AttendanceRecord, AttendanceStatus, MonthlySummary, ShiftSettings, ShiftType } from '../types';

export const DEFAULT_SETTINGS: ShiftSettings = {
  a_shift_start: '08:00',
  a_shift_end: '20:00',
  c_shift_start: '20:00',
  c_shift_end: '08:00',
  standard_duty_hours: 12,
  suggested_time_variance_mins: 15,
};

// Returns number of days in a given year and month (1-indexed month: 1=Jan, 12=Dec)
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Returns full day name (e.g. "Saturday")
export function getDayName(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// Formats YYYY-MM-DD
export function formatDateString(year: number, month: number, day: number): string {
  const m = month < 10 ? `0${month}` : `${month}`;
  const d = day < 10 ? `0${day}` : `${day}`;
  return `${year}-${m}-${d}`;
}

// Format display date DD/MM/YYYY
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Convert "HH:mm:ss" or "HH:mm" to total minutes from midnight
export function timeToMinutes(timeStr: string): number | null {
  if (!timeStr || !timeStr.trim()) return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Convert minutes to "HH:MM"
export function minutesToHHMM(mins: number): string {
  if (isNaN(mins) || mins <= 0) return '00:00';
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const hStr = h < 10 ? `0${h}` : `${h}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${hStr}:${mStr}`;
}

// Generate realistic suggested In and Out times based on Shift
// Shift A: 08:00 - 20:00
// Shift C: 20:00 - 08:00 (Overnight)
export function generateSuggestedTimes(shift: ShiftType, dateStr: string): { inTime: string; outTime: string } {
  if (!shift) return { inTime: '', outTime: '' };

  // Use date string as seed for pseudo-random variance so it's consistent per date but varies day to day
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed += dateStr.charCodeAt(i);
  }

  const pseudoRandom = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  if (shift === 'A') {
    // Expected In: 08:00. Suggested In: 07:45:00 to 07:58:00
    const inOffsetMins = Math.floor(pseudoRandom(1) * 12) + 2; // 2 to 14 mins before 08:00
    const inSecs = Math.floor(pseudoRandom(2) * 60);
    const inTotalMins = 8 * 60 - inOffsetMins;
    const inH = Math.floor(inTotalMins / 60);
    const inM = inTotalMins % 60;

    // Expected Out: 20:00. Suggested Out: 20:02:00 to 20:14:00
    const outOffsetMins = Math.floor(pseudoRandom(3) * 12) + 2; // 2 to 14 mins after 20:00
    const outSecs = Math.floor(pseudoRandom(4) * 60);
    const outTotalMins = 20 * 60 + outOffsetMins;
    const outH = Math.floor(outTotalMins / 60);
    const outM = outTotalMins % 60;

    return {
      inTime: `${inH < 10 ? '0' : ''}${inH}:${inM < 10 ? '0' : ''}${inM}:${inSecs < 10 ? '0' : ''}${inSecs}`,
      outTime: `${outH < 10 ? '0' : ''}${outH}:${outM < 10 ? '0' : ''}${outM}:${outSecs < 10 ? '0' : ''}${outSecs}`,
    };
  } else if (shift === 'C') {
    // Expected In: 20:00. Suggested In: 19:46:00 to 19:58:00
    const inOffsetMins = Math.floor(pseudoRandom(1) * 12) + 2;
    const inSecs = Math.floor(pseudoRandom(2) * 60);
    const inTotalMins = 20 * 60 - inOffsetMins;
    const inH = Math.floor(inTotalMins / 60);
    const inM = inTotalMins % 60;

    // Expected Out: 08:00 (Next day). Suggested Out: 08:02:00 to 08:14:00
    const outOffsetMins = Math.floor(pseudoRandom(3) * 12) + 2;
    const outSecs = Math.floor(pseudoRandom(4) * 60);
    const outTotalMins = 8 * 60 + outOffsetMins;
    const outH = Math.floor(outTotalMins / 60);
    const outM = outTotalMins % 60;

    return {
      inTime: `${inH < 10 ? '0' : ''}${inH}:${inM < 10 ? '0' : ''}${inM}:${inSecs < 10 ? '0' : ''}${inSecs}`,
      outTime: `${outH < 10 ? '0' : ''}${outH}:${outM < 10 ? '0' : ''}${outM}:${outSecs < 10 ? '0' : ''}${outSecs}`,
    };
  }

  return { inTime: '', outTime: '' };
}

// Calculate row duration, late minutes, early minutes, and overtime
export function calculateRowMetrics(
  status: AttendanceStatus,
  shift: ShiftType,
  inTime: string,
  outTime: string,
  settings: ShiftSettings = DEFAULT_SETTINGS,
  dayName?: string,
  attendanceDate?: string,
  category?: string
) {
  let duration_minutes = 0;
  let late_minutes = 0;
  let early_minutes = 0;
  let overtime_minutes = 0;

  // Statuses that don't calculate duty times if absent or on official leave
  if (status === 'A' || status === 'CL' || status === 'SL' || status === 'EL') {
    return { duration_minutes: 0, late_minutes: 0, early_minutes: 0, overtime_minutes: 0 };
  }

  const inMins = timeToMinutes(inTime);
  const outMins = timeToMinutes(outTime);

  if (inMins === null || outMins === null) {
    return { duration_minutes: 0, late_minutes: 0, early_minutes: 0, overtime_minutes: 0 };
  }

  // Calculate Duration:
  if (outMins >= inMins) {
    // Same day shift (e.g. A shift: 07:47 to 20:08)
    duration_minutes = outMins - inMins;
  } else {
    // Overnight shift (e.g. C shift: 19:54 to 08:11)
    duration_minutes = (24 * 60 - inMins) + outMins;
  }

  // Special Holiday / Off-day Working Rule:
  // Apply ONLY when (Status === 'W' || Status === 'H') AND (Shift === 'A' || Shift === 'C')
  const isHolidayDuty = (status === 'W' || status === 'H') && (shift === 'A' || shift === 'C');

  // Helper for stepped OT rounding (25m => 30m, 55m => 60m, 85m => 90m, 115m => 120m, etc.)
  const calculateSteppedOT = (extraMins: number): number => {
    if (extraMins < 25) return 0;
    const steps = Math.floor((extraMins - 25) / 30) + 1;
    return steps * 30;
  };

  if (isHolidayDuty) {
    // 1. Holiday / Weekend ('W' or 'H') Working Days with Shift A or Shift C:
    // Voluntary / holiday duty: no late or early departure penalties.
    // The ENTIRE WORKING PERIOD is OT. Normal 8-hour duty is NOT deducted.
    late_minutes = 0;
    early_minutes = 0;

    let otWorkedMins = 0;
    if (shift === 'A') {
      // Shift A duty starts at 08:00 AM (480 mins).
      // Everything worked from 08:00 AM onward is considered OT.
      if (outMins >= 8 * 60) {
        otWorkedMins = outMins - 8 * 60;
      } else if (outMins < inMins) {
        // Overnight rollover edge case
        otWorkedMins = (24 * 60 - 8 * 60) + outMins;
      } else {
        otWorkedMins = 0;
      }
    } else if (shift === 'C') {
      // Shift C duty starts at 20:00 (1200 mins) and works overnight into next day.
      // Everything worked from 20:00 onward is considered OT.
      if (outMins < 12 * 60 || outMins < inMins) {
        // Rollover into next calendar day (e.g. out at 08:09:33 next morning)
        otWorkedMins = (24 * 60 - 20 * 60) + outMins;
      } else if (outMins >= 20 * 60) {
        otWorkedMins = outMins - 20 * 60;
      } else {
        otWorkedMins = 0;
      }
    }

    overtime_minutes = calculateSteppedOT(otWorkedMins);
  } else if (status === 'W' || status === 'H') {
    // Status W or H without Shift A or C: No duty, no OT
    late_minutes = 0;
    early_minutes = 0;
    overtime_minutes = 0;
  } else {
    // 2. Regular Working Days (P, OSD, REP, ADJ, etc.):
    // Expected start and end times in minutes (Shift A: 08:00 - 17:00, Shift C: 20:00 - 05:00)
    let expectedStartMins = 8 * 60; // 08:00 for A
    let expectedEndMins = 17 * 60; // 17:00 for A (8 hours general duty + 1 hour lunch = 9 hours)

    if (shift === 'C') {
      expectedStartMins = 20 * 60; // 20:00 for C
      expectedEndMins = 5 * 60; // 05:00 for C
    }

    // Late calculation
    if (inMins > expectedStartMins) {
      if (shift === 'C' && inMins < 12 * 60) {
        late_minutes = (24 * 60 - expectedStartMins) + inMins;
      } else {
        late_minutes = inMins - expectedStartMins;
      }
    }

    // Early departure calculation:
    if (shift === 'C') {
      if (outMins < 5 * 60) {
        early_minutes = 5 * 60 - outMins;
      } else {
        early_minutes = 0;
      }
    } else {
      if (outMins < 17 * 60) {
        early_minutes = 17 * 60 - outMins;
      } else {
        early_minutes = 0;
      }
    }

    // Overtime calculation: beyond standard shift end time (17:00 for A, 05:00 for C)
    let extraMins = 0;
    if (shift === 'C') {
      extraMins = outMins - 5 * 60; // Extra mins beyond 05:00 AM
    } else {
      extraMins = outMins - 17 * 60; // Extra mins beyond 17:00 PM
    }
    overtime_minutes = calculateSteppedOT(extraMins);
  }

  // Staff category employees do not get overtime
  if (category === 'Staff') {
    overtime_minutes = 0;
  }

  return {
    duration_minutes,
    late_minutes,
    early_minutes,
    overtime_minutes,
  };
}

// Compute full monthly summary from records
export function calculateMonthlySummary(records: AttendanceRecord[], totalDaysInMonth: number, category?: string): MonthlySummary {
  let presentDays = 0;
  let absentDays = 0;
  let offDays = 0;
  let holidays = 0;
  let osdDays = 0;
  let clDays = 0;
  let slDays = 0;
  let elDays = 0;
  let repDays = 0;
  let adjDays = 0;
  let lateDays = 0;
  let totalLateMinutes = 0;
  let earlyDays = 0;
  let totalEarlyMinutes = 0;
  let leaveDays = 0;
  let totalOvertimeMinutes = 0;

  records.forEach((rec) => {
    switch (rec.status) {
      case 'P':
        presentDays++;
        break;
      case 'A':
        absentDays++;
        break;
      case 'W':
        offDays++;
        break;
      case 'H':
        holidays++;
        break;
      case 'OSD':
        osdDays++;
        break;
      case 'CL':
        clDays++;
        leaveDays++;
        break;
      case 'SL':
        slDays++;
        leaveDays++;
        break;
      case 'EL':
        elDays++;
        leaveDays++;
        break;
      case 'REP':
        repDays++;
        break;
      case 'ADJ':
        adjDays++;
        break;
    }

    if (rec.late_minutes > 0) {
      lateDays++;
      totalLateMinutes += rec.late_minutes;
    }

    if (rec.early_minutes > 0) {
      earlyDays++;
      totalEarlyMinutes += rec.early_minutes;
    }

    if (rec.overtime_minutes > 0 && category !== 'Staff') {
      totalOvertimeMinutes += rec.overtime_minutes;
    }
  });

  if (category === 'Staff') {
    totalOvertimeMinutes = 0;
  }

  // Payable days calculation = Present + Offday + Holiday + OSD + Leaves + Replacement + Adjustment
  const payableDays = presentDays + offDays + holidays + osdDays + leaveDays + repDays + adjDays;

  return {
    daysInMonth: totalDaysInMonth,
    presentDays,
    absentDays,
    offDays,
    holidays,
    osdDays,
    clDays,
    slDays,
    elDays,
    repDays,
    adjDays,
    lateDays,
    totalLateMinutes,
    earlyDays,
    totalEarlyMinutes,
    leaveDays,
    totalOvertimeMinutes,
    payableDays,
  };
}
