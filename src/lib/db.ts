import { AttendanceRecord, G4SEmployee, ShiftSettings } from '../types';
import { DEFAULT_SETTINGS } from '../utils/calculations';
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

function getLocalEmployees(): G4SEmployee[] {
  const data = localStorage.getItem('g4s_employees');
  if (!data) {
    localStorage.setItem('g4s_employees', JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  }
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem('g4s_employees', JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    // Merge any missing initial employees
    let changed = false;
    INITIAL_EMPLOYEES.forEach((initEmp) => {
      if (!parsed.some((e: G4SEmployee) => e.employee_id === initEmp.employee_id)) {
        parsed.push(initEmp);
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem('g4s_employees', JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_EMPLOYEES;
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
  const localList = getLocalEmployees();
  const employeeMap = new Map<string, G4SEmployee>();

  // Initialize map with local storage employees first
  localList.forEach((e) => {
    if (e.employee_id) {
      employeeMap.set(e.employee_id, e);
    }
  });

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('g4s_employees')
          .select('*')
          .order('employee_id');

        if (!error && Array.isArray(data)) {
          // Merge Supabase employees with local employees
          for (const dbEmp of data) {
            if (dbEmp.employee_id) {
              const localMatch = employeeMap.get(dbEmp.employee_id);
              const merged: G4SEmployee = {
                id: dbEmp.id || localMatch?.id || `emp-${Date.now()}`,
                employee_id: dbEmp.employee_id,
                name: dbEmp.name || localMatch?.name || 'Unknown',
                job_title: dbEmp.job_title || localMatch?.job_title || 'Security Guard (G4S)',
                category: dbEmp.category || localMatch?.category || 'Worker',
                join_date: dbEmp.join_date || localMatch?.join_date || new Date().toISOString().split('T')[0],
                inactive_date: dbEmp.inactive_date || localMatch?.inactive_date || '',
                business_unit: dbEmp.business_unit || localMatch?.business_unit || 'Security (G4S)',
                company_name: dbEmp.company_name || localMatch?.company_name || 'Vancot Limited.',
                line: dbEmp.line || localMatch?.line || 'Main Gate',
                active: dbEmp.active !== undefined ? Boolean(dbEmp.active) : (localMatch?.active ?? true),
              };
              employeeMap.set(dbEmp.employee_id, merged);
            }
          }

          // Try syncing any local employee that Supabase doesn't have yet
          for (const localEmp of localList) {
            if (!data.some((d: any) => d.employee_id === localEmp.employee_id)) {
              try {
                const payload: Record<string, any> = {
                  employee_id: localEmp.employee_id,
                  name: localEmp.name,
                  job_title: localEmp.job_title,
                  category: localEmp.category || 'Worker',
                  join_date: localEmp.join_date,
                  inactive_date: localEmp.inactive_date || null,
                  business_unit: localEmp.business_unit || 'Security (G4S)',
                  company_name: localEmp.company_name || 'Vancot Limited.',
                  line: localEmp.line || 'Main Gate',
                  active: localEmp.active !== undefined ? localEmp.active : true,
                };
                if (localEmp.id && !localEmp.id.startsWith('emp-')) {
                  payload.id = localEmp.id;
                }

                const { data: upserted } = await supabase
                  .from('g4s_employees')
                  .upsert(payload, { onConflict: 'employee_id' })
                  .select()
                  .single();

                if (upserted && upserted.employee_id) {
                  const current = employeeMap.get(upserted.employee_id) || localEmp;
                  employeeMap.set(upserted.employee_id, { ...current, ...upserted });
                }
              } catch (e) {
                console.warn('Background sync employee to Supabase warning:', e);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Supabase fetch employees failed, using local storage:', e);
      }
    }
  }

  const combinedList = Array.from(employeeMap.values());
  combinedList.sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  saveLocalEmployees(combinedList);
  return combinedList;
}

// Add or update an employee with double-layer storage (Local + Supabase sync)
export async function saveEmployee(emp: G4SEmployee): Promise<G4SEmployee> {
  let updated: G4SEmployee = { ...emp };
  if (!updated.id) {
    updated.id = `emp-${Date.now()}`;
  }

  // 1. Always save/update in local storage immediately
  const localList = getLocalEmployees();
  const idx = localList.findIndex((e) => e.employee_id === emp.employee_id || e.id === emp.id);
  if (idx >= 0) {
    localList[idx] = updated;
  } else {
    localList.push(updated);
  }
  saveLocalEmployees(localList);

  // 2. Sync to Supabase
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
          updated = { ...emp, ...data };
          const freshList = getLocalEmployees();
          const fIdx = freshList.findIndex((e) => e.employee_id === data.employee_id);
          if (fIdx >= 0) {
            freshList[fIdx] = updated;
            saveLocalEmployees(freshList);
          }
        }
      } catch (e) {
        console.warn('Supabase save employee failed:', e);
      }
    }
  }

  return updated;
}

// Delete an employee from Local Storage & Supabase
export async function deleteEmployee(id: string, employee_id: string): Promise<boolean> {
  const localList = getLocalEmployees().filter((e) => e.id !== id && e.employee_id !== employee_id);
  saveLocalEmployees(localList);

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('g4s_employees')
          .delete()
          .eq('employee_id', employee_id);

        if (error) {
          console.warn('Supabase delete employee warning:', error.message);
        }
      } catch (e) {
        console.warn('Supabase delete employee failed:', e);
      }
    }
  }

  return true;
}

// Fetch attendance records with Supabase & Local storage fallback
export async function fetchAttendanceRecords(
  employeeId: string,
  year: number,
  month: number
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

        if (!error && data) {
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

  return records;
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

