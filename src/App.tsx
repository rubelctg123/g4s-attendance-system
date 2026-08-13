import React, { useState, useEffect } from 'react';
import { ActiveTab, AttendanceRecord, G4SEmployee } from './types';
import { fetchEmployees, saveEmployee, deleteEmployee } from './lib/db';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AttendanceManager } from './components/AttendanceManager';
import { EmployeeMaster } from './components/EmployeeMaster';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { SupabaseSqlModal } from './components/SupabaseSqlModal';
import { JobCardPdfModal } from './components/JobCardPdfModal';
import { AuthPage } from './components/AuthPage';

export default function App() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [employees, setEmployees] = useState<G4SEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState<boolean>(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);

  // PDF Preview Modal State
  const [pdfModalData, setPdfModalData] = useState<{
    isOpen: boolean;
    employee: G4SEmployee | null;
    monthName: string;
    year: number;
    records: AttendanceRecord[];
    totalDays: number;
  }>({
    isOpen: false,
    employee: null,
    monthName: 'August',
    year: 2026,
    records: [],
    totalDays: 31,
  });

  // Check auth session on startup
  useEffect(() => {
    async function checkAuthSession() {
      setIsAuthChecking(true);
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            setCurrentUserEmail(data.session.user.email || 'hr@vancot.com');
          } else {
            const localUser = localStorage.getItem('g4s_hr_current_user');
            if (localUser) {
              setCurrentUserEmail(localUser);
            }
          }

          // Listen for auth state changes
          supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              setCurrentUserEmail(session.user.email || 'hr@vancot.com');
            }
          });
        }
      } else {
        const localUser = localStorage.getItem('g4s_hr_current_user');
        if (localUser) {
          setCurrentUserEmail(localUser);
        }
      }
      setIsAuthChecking(false);
    }

    checkAuthSession();
  }, []);

  // Load employees when logged in
  useEffect(() => {
    if (currentUserEmail) {
      loadEmployees();
    }
  }, [currentUserEmail]);

  const loadEmployees = async () => {
    const data = await fetchEmployees();
    setEmployees(data);
    if (data.length > 0) {
      if (!selectedEmployeeId || !data.some((e) => e.employee_id === selectedEmployeeId)) {
        setSelectedEmployeeId(data[0].employee_id);
      }
    } else {
      setSelectedEmployeeId('');
    }
  };

  const handleLoginSuccess = (email: string) => {
    setCurrentUserEmail(email);
    localStorage.setItem('g4s_hr_current_user', email);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    localStorage.removeItem('g4s_hr_current_user');
    setCurrentUserEmail(null);
  };

  const handleSaveEmployee = async (emp: G4SEmployee) => {
    await saveEmployee(emp);
    await loadEmployees();
  };

  const handleDeleteEmployee = async (id: string, empId: string) => {
    if (window.confirm(`Are you sure you want to delete employee ID ${empId}?`)) {
      await deleteEmployee(id, empId);
      await loadEmployees();
    }
  };

  const handleSelectEmployeeForAttendance = (empId: string) => {
    setSelectedEmployeeId(empId);
    setActiveTab('attendance');
  };

  const handleOpenPreviewPdf = (
    employee: G4SEmployee,
    monthName: string,
    year: number,
    records: AttendanceRecord[],
    totalDays: number
  ) => {
    setPdfModalData({
      isOpen: true,
      employee,
      monthName,
      year,
      records,
      totalDays,
    });
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Authenticating HR Portal...
        </p>
      </div>
    );
  }

  // Render Login Page if not authenticated
  if (!currentUserEmail) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        userEmail={currentUserEmail}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            employees={employees}
            setActiveTab={setActiveTab}
            onSelectEmployeeForAttendance={handleSelectEmployeeForAttendance}
            onOpenAddEmployee={() => {
              setActiveTab('employees');
              setIsAddEmployeeModalOpen(true);
            }}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceManager
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            setSelectedEmployeeId={setSelectedEmployeeId}
            onPreviewPdf={handleOpenPreviewPdf}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeMaster
            employees={employees}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            isAddModalOpen={isAddEmployeeModalOpen}
            setIsAddModalOpen={setIsAddEmployeeModalOpen}
          />
        )}

        {activeTab === 'reports' && <Reports employees={employees} />}

        {activeTab === 'settings' && <Settings onOpenSqlModal={() => setIsSqlModalOpen(true)} />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 text-center mt-auto">
        <p className="font-medium">
          Vancot Limited. — Security (G4S) Attendance & Job Card Management System
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Plot No: 18-20, Sector: 3, KEPZ, North Patenga, Chittagong</p>
      </footer>

      {/* Modals */}
      <SupabaseSqlModal isOpen={isSqlModalOpen} onClose={() => setIsSqlModalOpen(false)} />

      <JobCardPdfModal
        isOpen={pdfModalData.isOpen}
        onClose={() => setPdfModalData({ ...pdfModalData, isOpen: false })}
        employee={pdfModalData.employee}
        monthName={pdfModalData.monthName}
        year={pdfModalData.year}
        records={pdfModalData.records}
        totalDays={pdfModalData.totalDays}
      />
    </div>
  );
}

