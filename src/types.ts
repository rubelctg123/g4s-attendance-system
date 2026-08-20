export type AttendanceStatus = 'P' | 'A' | 'H' | 'OSD' | 'W' | 'CL' | 'SL' | 'EL' | 'REP' | 'ADJ';
export type ShiftType = 'A' | 'C' | '';
export type EmployeeCategory = 'Worker' | 'Staff';

export interface G4SEmployee {
  id: string;
  employee_id: string; // e.g., "05016666"
  name: string; // e.g., "Md. Rabin"
  job_title: string; // e.g., "Security Supervisor (G4S)"
  category?: EmployeeCategory; // "Worker" | "Staff"
  join_date: string; // YYYY-MM-DD
  inactive_date?: string; // YYYY-MM-DD (when employee is inactive)
  business_unit: string; // "Security (G4S)"
  company_name: string; // "Vancot Limited."
  line?: string; // "Main Gate", "Line-1"
  active: boolean;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string; // Matches employee_id
  attendance_date: string; // YYYY-MM-DD
  day_name?: string; // "Saturday", "Sunday", etc.
  status: AttendanceStatus;
  shift: ShiftType;
  in_time: string; // "07:52:14"
  out_time: string; // "20:08:31"
  duration_minutes: number;
  late_minutes: number;
  early_minutes: number;
  overtime_minutes: number;
  remarks: string;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftSettings {
  a_shift_start: string; // "08:00"
  a_shift_end: string; // "20:00"
  c_shift_start: string; // "20:00"
  c_shift_end: string; // "08:00"
  standard_duty_hours: number; // 12
  suggested_time_variance_mins: number; // 15 mins offset
}

export interface MonthlySummary {
  daysInMonth: number;
  presentDays: number;
  absentDays: number;
  offDays: number; // W
  holidays: number; // H
  osdDays: number; // OSD
  clDays?: number; // CL
  slDays?: number; // SL
  elDays?: number; // EL
  repDays?: number; // REP
  adjDays?: number; // ADJ
  lateDays: number;
  totalLateMinutes: number;
  earlyDays: number;
  totalEarlyMinutes: number;
  leaveDays: number;
  totalOvertimeMinutes: number;
  payableDays: number;
}

export type UserRole = 'admin' | 'hr_officer' | 'viewer';
export type UserAccountStatus = 'active' | 'disabled';

export interface PortalUser {
  id: string;
  user_id: string; // e.g. "admin", "05016666", "hr.officer"
  name: string; // e.g. "HR System Administrator"
  email: string; // e.g. "admin@vancot.com"
  role: UserRole; // "admin" | "hr_officer" | "viewer"
  status: UserAccountStatus; // "active" | "disabled"
  can_delete: boolean; // true for admin, false for others
  password?: string; // used for internal credential matching
  created_at: string;
  last_login?: string;
}

export type ActiveTab = 'dashboard' | 'attendance' | 'employees' | 'reports' | 'settings' | 'users';
