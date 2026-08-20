import { AttendanceRecord, AttendanceStatus, G4SEmployee, ShiftSettings, ShiftType } from '../types';
import {
  DEFAULT_SETTINGS,
  getDaysInMonth,
  getDayName,
  formatDateString,
  generateSuggestedTimes,
  calculateRowMetrics,
} from '../utils/calculations';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const INITIAL_EMPLOYEES: G4SEmployee[] = [
  {
    id: 'emp-05016666',
    employee_id: '05016666',
    name: 'Md. Rabin',
    job_title: 'Security Supervisor (G4S)',
    category: 'Staff',
    join_date: '2022-03-15',
    business_unit: 'Security (G4S)',
    company_name: 'Vancot Limited.',
    line: 'Main Gate',
    active: true,
  },
  {
    id: 'emp-05016667',
    employee_id: '05016667',
    name: 'Abdul Karim',
    job_title: 'Security Guard (G4S)',
    category: 'Worker',
    join_date: '2023-01-10',
    business_unit: 'Security (G4S)',
    company_name: 'Vancot Limited.',
    line: 'Building A',
    active: true,
  },
  {
    id: 'emp-05016668',
    employee_id: '05016668',
    name: 'Nasrin Akter',
    job_title: 'Female Security Guard (G4S)',
    category: 'Worker',
    join_date: '2023-06-01',
    business_unit: 'Security (G4S)',
    company_name: 'Vancot Limited.',
    line: 'Main Entrance',
    active: true,
  },
  {
    id: 'emp-05016669',
    employee_id: '05016669',
    name: 'Shahadat Hossain',
    job_title: 'Security Guard (G4S)',
    category: 'Worker',
    join_date: '2023-09-20',
    business_unit: 'Security (G4S)',
    company_name: 'Vancot Limited.',
    line: 'Warehouse',
    active: true,
  },
  {
    id: 'emp-05016670',
    employee_id: '05016670',
    name: 'Mizanur Rahman',
    job_title: 'Assistant Supervisor (G4S)',
    category: 'Staff',
    join_date: '2022-11-05',
    business_unit: 'Security (G4S)',
    company_name: 'Vancot Limited.',
    line: 'KEPZ Gate 2',
    active: true,
  },
  {
    id: 'emp-05016678',
    employee_id: '05016678',
    name: 'Mong pu sha Marma',
    job_title: 'Jr. Security Guard (G4S)',
    category: 'Worker',
    join_date: '2023-12-01',
    business_unit: 'Security (G4S)',
    company_name: 'Vancot Limited.',
    line: 'Main Gate',
    active: true,
  },
];

const DELETED_EMPLOYEES_KEY = 'g4s_deleted_employee_ids';

function getDeletedEmployeeIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_EMPLOYEES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addDeletedEmployeeId(employee_id: string) {
  const list = getDeletedEmployeeIds();
  if (!list.includes(employee_id)) {
    list.push(employee_id);
    localStorage.setItem(DELETED_EMPLOYEES_KEY, JSON.stringify(list));
  }
}

function removeDeletedEmployeeId(employee_id: string) {
  const list = getDeletedEmployeeIds().filter((id) => id !== employee_id);
  localStorage.setItem(DELETED_EMPLOYEES_KEY, JSON.stringify(list));
}

function getLocalEmployees(): G4SEmployee[] {
  const deletedIds = getDeletedEmployeeIds();
  const data = localStorage.getItem('g4s_employees');
  if (!data) {
    const initial = INITIAL_EMPLOYEES.filter((e) => !deletedIds.includes(e.employee_id));
    localStorage.setItem('g4s_employees', JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = INITIAL_EMPLOYEES.filter((e) => !deletedIds.includes(e.employee_id));
      localStorage.setItem('g4s_employees', JSON.stringify(initial));
      return initial;
    }
    // Filter out any deleted employee
    return parsed.filter((e: G4SEmployee) => !deletedIds.includes(e.employee_id));
  } catch {
    return INITIAL_EMPLOYEES.filter((e) => !deletedIds.includes(e.employee_id));
  }
}

function saveLocalEmployees(employees: G4SEmployee[]) {
  localStorage.setItem('g4s_employees', JSON.stringify(employees));
}

function getLocalAttendance(): Record<string, AttendanceRecord> {
  const data = localStorage.getItem('g4s_attendance_map');
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveLocalAttendance(attendanceMap: Record<string, AttendanceRecord>) {
  localStorage.setItem('g4s_attendance_map', JSON.stringify(attendanceMap));
}

// Fetch all G4S employees from Supabase with automatic bidirectional synchronization and fail-safe local persistence
export async function fetchEmployees(): Promise<G4SEmployee[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('g4s_employees')
          .select('*')
          .order('employee_id');

        if (!error && Array.isArray(data)) {
          if (data.length > 0) {
            // Supabase is the single source of truth
            const remoteEmployees: G4SEmployee[] = data.map((dbEmp) => ({
              id: dbEmp.id || `emp-${Date.now()}`,
              employee_id: dbEmp.employee_id,
              name: dbEmp.name || 'Unknown',
              job_title: dbEmp.job_title || 'Security Guard (G4S)',
              category: dbEmp.category || 'Worker',
              join_date: dbEmp.join_date || new Date().toISOString().split('T')[0],
              inactive_date: dbEmp.inactive_date || '',
              business_unit: dbEmp.business_unit || 'Security (G4S)',
              company_name: dbEmp.company_name || 'Vancot Limited.',
              line: dbEmp.line || 'Main Gate',
              active: dbEmp.active !== undefined ? Boolean(dbEmp.active) : true,
            }));

            remoteEmployees.sort((a, b) => a.employee_id.localeCompare(b.employee_id));
            saveLocalEmployees(remoteEmployees);
            return remoteEmployees;
          } else {
            // Supabase table is empty: Auto-seed initial employees to cloud
            const seedList = getLocalEmployees();
            const payload = seedList.map((emp) => ({
              employee_id: emp.employee_id,
              name: emp.name,
              job_title: emp.job_title,
              category: emp.category || 'Worker',
              join_date: emp.join_date,
              inactive_date: emp.inactive_date && emp.inactive_date.trim() !== '' ? emp.inactive_date : null,
              business_unit: emp.business_unit || 'Security (G4S)',
              company_name: emp.company_name || 'Vancot Limited.',
              line: emp.line || 'Main Gate',
              active: emp.active !== undefined ? emp.active : true,
            }));

            const { data: insertedData, error: insertError } = await supabase
              .from('g4s_employees')
              .upsert(payload, { onConflict: 'employee_id' })
              .select();

            if (!insertError && insertedData && insertedData.length > 0) {
              const seededEmployees: G4SEmployee[] = insertedData.map((dbEmp) => ({
                id: dbEmp.id,
                employee_id: dbEmp.employee_id,
                name: dbEmp.name,
                job_title: dbEmp.job_title,
                category: dbEmp.category || 'Worker',
                join_date: dbEmp.join_date,
                inactive_date: dbEmp.inactive_date || '',
                business_unit: dbEmp.business_unit || 'Security (G4S)',
                company_name: dbEmp.company_name || 'Vancot Limited.',
                line: dbEmp.line || 'Main Gate',
                active: Boolean(dbEmp.active),
              }));
              saveLocalEmployees(seededEmployees);
              return seededEmployees;
            }
          }
        }
      } catch (e) {
        console.warn('Supabase fetch employees failed, falling back to local storage:', e);
      }
    }
  }

  // Fallback for offline / local-only mode
  const localList = getLocalEmployees();
  localList.sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  return localList;
}

// Add or update an employee with double-layer storage (Supabase Cloud Sync + Local Cache)
export async function saveEmployee(emp: G4SEmployee): Promise<G4SEmployee> {
  // If previously deleted, unmark it
  removeDeletedEmployeeId(emp.employee_id);

  let updated: G4SEmployee = { ...emp };
  if (!updated.id) {
    updated.id = `emp-${Date.now()}`;
  }

  // 1. Sync to Supabase cloud first
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const payload: Record<string, any> = {
          employee_id: emp.employee_id,
          name: emp.name,
          job_title: emp.job_title,
          category: emp.category || 'Worker',
          join_date: emp.join_date,
          inactive_date: emp.inactive_date && emp.inactive_date.trim() !== '' ? emp.inactive_date : null,
          business_unit: emp.business_unit || 'Security (G4S)',
          company_name: emp.company_name || 'Vancot Limited.',
          line: emp.line || 'Main Gate',
          active: emp.active !== undefined ? emp.active : true,
        };

        if (emp.id && !emp.id.startsWith('emp-')) {
          payload.id = emp.id;
        }

        const { data, error } = await supabase
          .from('g4s_employees')
          .upsert(payload, { onConflict: 'employee_id' })
          .select()
          .single();

        if (error) {
          console.warn('Supabase save employee warning:', error.message);
        } else if (data) {
          updated = {
            id: data.id || updated.id,
            employee_id: data.employee_id,
            name: data.name,
            job_title: data.job_title,
            category: data.category || 'Worker',
            join_date: data.join_date,
            inactive_date: data.inactive_date || '',
            business_unit: data.business_unit || 'Security (G4S)',
            company_name: data.company_name || 'Vancot Limited.',
            line: data.line || 'Main Gate',
            active: Boolean(data.active),
          };
        }
      } catch (e) {
        console.warn('Supabase save employee failed:', e);
      }
    }
  }

  // 2. Always update local storage cache immediately
  const localList = getLocalEmployees();
  const idx = localList.findIndex((e) => e.employee_id === updated.employee_id || e.id === updated.id);
  if (idx >= 0) {
    localList[idx] = updated;
  } else {
    localList.push(updated);
  }
  saveLocalEmployees(localList);

  return updated;
}

// Delete an employee from Supabase Cloud & Local Storage
export async function deleteEmployee(id: string, employee_id: string): Promise<boolean> {
  // Track as deleted locally
  addDeletedEmployeeId(employee_id);

  // 1. Delete from Supabase Cloud
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Delete associated attendance rows first
        await supabase
          .from('g4s_attendance')
          .delete()
          .eq('employee_id', employee_id);

        // Delete the employee row
        await supabase
          .from('g4s_employees')
          .delete()
          .eq('employee_id', employee_id);

        if (id && !id.startsWith('emp-')) {
          await supabase.from('g4s_employees').delete().eq('id', id);
        }
      } catch (e) {
        console.warn('Supabase delete employee failed:', e);
      }
    }
  }

  // 2. Remove from local employee cache
  const localList = getLocalEmployees().filter((e) => e.id !== id && e.employee_id !== employee_id);
  saveLocalEmployees(localList);

  // 3. Remove attendance records from local cache
  const localAttendance = getLocalAttendance();
  let attendanceChanged = false;
  Object.keys(localAttendance).forEach((key) => {
    if (key.startsWith(`${employee_id}_`) || localAttendance[key]?.employee_id === employee_id) {
      delete localAttendance[key];
      attendanceChanged = true;
    }
  });
  if (attendanceChanged) {
    saveLocalAttendance(localAttendance);
  }

  return true;
}

// Generate full month default attendance records for an employee if not customized yet
export function generateDefaultAttendanceForEmployee(
  employee: G4SEmployee,
  year: number,
  month: number,
  existingRecords: AttendanceRecord[] = []
): AttendanceRecord[] {
  const totalDays = getDaysInMonth(year, month);
  const settings = getShiftSettings();
  const isInactive = !employee.active || Boolean(employee.inactive_date);
  const deactivationDate = isInactive && employee.inactive_date ? employee.inactive_date : null;

  const existingMap = new Map<string, AttendanceRecord>();
  existingRecords.forEach((r) => {
    if (r.attendance_date) {
      existingMap.set(r.attendance_date, r);
    }
  });

  const fullMonth: AttendanceRecord[] = [];

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = formatDateString(year, month, day);

    // Stop generating records beyond deactivation date
    if (deactivationDate && dateStr > deactivationDate) {
      continue;
    }

    const dayName = getDayName(year, month, day);

    if (existingMap.has(dateStr)) {
      const rec = existingMap.get(dateStr)!;
      const metrics = calculateRowMetrics(
        rec.status,
        rec.shift,
        rec.in_time,
        rec.out_time,
        settings,
        dayName,
        dateStr,
        employee.category
      );
      fullMonth.push({
        ...rec,
        day_name: dayName,
        ...metrics,
      });
    } else {
      const defaultStatus: AttendanceStatus = 'P';
      const defaultShift: ShiftType = 'A';
      const suggested = generateSuggestedTimes(defaultShift, dateStr);
      const metrics = calculateRowMetrics(
        defaultStatus,
        defaultShift,
        suggested.inTime,
        suggested.outTime,
        settings,
        dayName,
        dateStr,
        employee.category
      );

      fullMonth.push({
        id: `rec-${employee.employee_id}-${dateStr}`,
        employee_id: employee.employee_id,
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

  return fullMonth;
}

// Fetch all attendance records for ALL employees for a given month in a single fast Supabase query
export async function fetchAllEmployeesAttendanceForMonth(
  employees: G4SEmployee[],
  year: number,
  month: number
): Promise<Record<string, AttendanceRecord[]>> {
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const monthPrefix = `${year}-${monthStr}`;
  const totalDays = getDaysInMonth(year, month);
  const startDate = `${monthPrefix}-01`;
  const endDate = `${monthPrefix}-${totalDays < 10 ? '0' + totalDays : totalDays}`;

  const recordsByEmp: Record<string, AttendanceRecord[]> = {};
  const localMap = getLocalAttendance();

  // 1. Fetch all records from Supabase in ONE query
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('g4s_attendance')
          .select('*')
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate);

        if (!error && Array.isArray(data)) {
          data.forEach((rec) => {
            if (!recordsByEmp[rec.employee_id]) {
              recordsByEmp[rec.employee_id] = [];
            }
            recordsByEmp[rec.employee_id].push(rec);
            localMap[`${rec.employee_id}_${rec.attendance_date}`] = rec;
          });
          saveLocalAttendance(localMap);
        }
      } catch (e) {
        console.warn('Supabase bulk attendance fetch failed:', e);
      }
    }
  }

  // 2. Check local storage for any employees without Supabase records
  employees.forEach((emp) => {
    if (!recordsByEmp[emp.employee_id] || recordsByEmp[emp.employee_id].length === 0) {
      const localRecs: AttendanceRecord[] = [];
      Object.keys(localMap).forEach((key) => {
        if (key.startsWith(`${emp.employee_id}_${monthPrefix}`)) {
          localRecs.push(localMap[key]);
        }
      });
      if (localRecs.length > 0) {
        recordsByEmp[emp.employee_id] = localRecs;
      }
    }
  });

  // 3. Guarantee full month records for every employee (generate standard defaults if missing or partial)
  const resultMap: Record<string, AttendanceRecord[]> = {};
  const recordsToSync: AttendanceRecord[] = [];

  employees.forEach((emp) => {
    const existing = recordsByEmp[emp.employee_id] || [];
    const full = generateDefaultAttendanceForEmployee(emp, year, month, existing);
    resultMap[emp.employee_id] = full;

    // If this employee had missing or empty records in DB, queue them for cloud background sync
    if (existing.length < full.length) {
      recordsToSync.push(...full);
    }
  });

  // 4. Auto-sync to Supabase in background so all other users immediately see the exact same numbers
  if (recordsToSync.length > 0) {
    saveAttendanceRecords(recordsToSync).catch((err) => {
      console.warn('Background attendance auto-sync warning:', err);
    });
  }

  return resultMap;
}

// Fetch attendance records with Supabase & Local storage fallback
export async function fetchAttendanceRecords(
  employeeId: string,
  year: number,
  month: number,
  employeeObj?: G4SEmployee
): Promise<AttendanceRecord[]> {
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const monthPrefix = `${year}-${monthStr}`;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const startDate = `${monthPrefix}-01`;
        const endDate = `${monthPrefix}-31`;
        const { data, error } = await supabase
          .from('g4s_attendance')
          .select('*')
          .eq('employee_id', employeeId)
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate);

        if (!error && data && data.length > 0) {
          const localMap = getLocalAttendance();
          data.forEach((rec) => {
            localMap[`${rec.employee_id}_${rec.attendance_date}`] = rec;
          });
          saveLocalAttendance(localMap);
          return data;
        }
      } catch (e) {
        console.warn('Supabase attendance fetch failed:', e);
      }
    }
  }

  const localMap = getLocalAttendance();
  const records: AttendanceRecord[] = [];
  Object.keys(localMap).forEach((key) => {
    if (key.startsWith(`${employeeId}_${monthPrefix}`)) {
      records.push(localMap[key]);
    }
  });

  if (records.length > 0) {
    return records;
  }

  // If no saved records exist yet and employee object is supplied, generate default and auto-save
  if (employeeObj) {
    const generated = generateDefaultAttendanceForEmployee(employeeObj, year, month, []);
    saveAttendanceRecords(generated).catch(() => {});
    return generated;
  }

  return [];
}

// Save attendance records to Local Storage & Supabase
export async function saveAttendanceRecords(records: AttendanceRecord[]): Promise<boolean> {
  if (!records || records.length === 0) return true;

  const localMap = getLocalAttendance();
  records.forEach((rec) => {
    const key = `${rec.employee_id}_${rec.attendance_date}`;
    localMap[key] = {
      ...rec,
      updated_at: new Date().toISOString(),
    };
  });
  saveLocalAttendance(localMap);

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const payload = records.map((rec) => ({
          employee_id: rec.employee_id,
          attendance_date: rec.attendance_date,
          status: rec.status,
          shift: rec.shift,
          in_time: rec.in_time,
          out_time: rec.out_time,
          duration_minutes: rec.duration_minutes,
          late_minutes: rec.late_minutes,
          early_minutes: rec.early_minutes,
          overtime_minutes: rec.overtime_minutes,
          remarks: rec.remarks || '',
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('g4s_attendance')
          .upsert(payload, { onConflict: 'employee_id,attendance_date' });

        if (error) {
          console.warn('Supabase attendance upsert warning:', error.message);
        }
      } catch (e) {
        console.warn('Supabase attendance save failed:', e);
      }
    }
  }

  return true;
}

// Shift settings read/write
export function getShiftSettings(): ShiftSettings {
  const data = localStorage.getItem('g4s_shift_settings');
  if (!data) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveShiftSettings(settings: ShiftSettings): void {
  localStorage.setItem('g4s_shift_settings', JSON.stringify(settings));
}

/**
 * Subscribe to realtime changes on Supabase tables: g4s_employees, g4s_attendance, g4s_portal_users
 */
export function subscribeToRealtimeChanges(
  onEmployeesChanged?: () => void,
  onAttendanceChanged?: () => void,
  onUsersChanged?: () => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('g4s_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'g4s_employees' },
        () => {
          if (onEmployeesChanged) onEmployeesChanged();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'g4s_attendance' },
        () => {
          if (onAttendanceChanged) onAttendanceChanged();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'g4s_portal_users' },
        () => {
          if (onUsersChanged) onUsersChanged();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Could not establish Supabase realtime channel:', err);
    return () => {};
  }
}

