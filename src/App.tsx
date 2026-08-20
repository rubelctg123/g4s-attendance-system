import React, { useState, useEffect } from 'react';
import { ActiveTab, AttendanceRecord, G4SEmployee, PortalUser } from './types';
import { fetchEmployees, saveEmployee, deleteEmployee, subscribeToRealtimeChanges } from './lib/db';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import {
  getCurrentPortalUser,
  setCurrentPortalUser,
  clearCurrentPortalUser,
  resolveUserFromEmail,
  syncPortalUsersFromSupabase,
} from './lib/users';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AttendanceManager } from './components/AttendanceManager';
import { EmployeeMaster } from './components/EmployeeMaster';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { SupabaseSqlModal } from './components/SupabaseSqlModal';
import { JobCardPdfModal } from './components/JobCardPdfModal';
import { AuthPage } from './components/AuthPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<PortalUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

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

  // Check auth session & recovery parameters on startup
  useEffect(() => {
    async function checkAuthSession() {
      setIsAuthChecking(true);

      // Check URL parameters & hash for password recovery or error
      try {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const searchParams = new URLSearchParams(search);

        const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');
        const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
        const error = hashParams.get('error') || searchParams.get('error');
        const type = hashParams.get('type') || searchParams.get('type');

        const isRecovery = type === 'recovery' || hash.includes('type=recovery') || search.includes('type=recovery');
        const isSignupConfirm = type === 'signup' || type === 'email_confirmation' || hash.includes('type=signup');

        if (isRecovery) {
          setIsRecoveryMode(true);
          if (error || errorCode || errorDesc) {
            setRecoveryError(
              decodeURIComponent(errorDesc || 'The password recovery link is invalid or has expired.')
            );
          } else {
            setRecoveryError(null);
          }
        }
      } catch (err) {
        console.warn('Error reading auth hash:', err);
      }

      // Sync Supabase users if configured
      if (isSupabaseConfigured()) {
        try {
          await syncPortalUsersFromSupabase();
        } catch (e) {
          console.warn('Supabase users sync skipped:', e);
        }

        const supabase = getSupabaseClient();
        if (supabase) {
          const { data } = await supabase.auth.getSession();

          // Listen for auth state changes (especially PASSWORD_RECOVERY)
          supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
              setIsRecoveryMode(true);
              setRecoveryError(null);
            } else if (event === 'SIGNED_IN' && !isRecoveryMode) {
              if (session?.user) {
                const user = resolveUserFromEmail(session.user.email || 'admin@vancot.com');
                setCurrentUser(user);
                setCurrentPortalUser(user);
              }
            } else if (event === 'SIGNED_OUT') {
              setCurrentUser(null);
              clearCurrentPortalUser();
            }
          });

          if (data.session?.user) {
            const user = resolveUserFromEmail(data.session.user.email || 'admin@vancot.com');
            setCurrentUser(user);
            setCurrentPortalUser(user);
          } else {
            const localUser = getCurrentPortalUser();
            if (localUser) {
              setCurrentUser(localUser);
            }
          }
        }
      } else {
        const localUser = getCurrentPortalUser();
        if (localUser) {
          setCurrentUser(localUser);
        }
      }
      setIsAuthChecking(false);
    }

    checkAuthSession();
  }, []);

  // Load employees and set up Realtime Sync across all connected users/devices
  useEffect(() => {
    if (!currentUser) return;

    // 1. Initial load
    loadEmployees();

    // 2. Realtime listener for Postgres changes in Supabase
    const unsubscribe = subscribeToRealtimeChanges(
      () => {
        loadEmployees();
      },
      undefined,
      async () => {
        try {
          await syncPortalUsersFromSupabase();
        } catch (_) {}
      }
    );

    // 3. Interval background check (every 20 seconds) for network catch-up
    const syncInterval = setInterval(() => {
      loadEmployees();
    }, 20000);

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, [currentUser]);

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

  const handleLoginSuccess = (email: string, portalUser?: PortalUser) => {
    const user = portalUser || resolveUserFromEmail(email);
    setCurrentUser(user);
    setCurrentPortalUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    clearCurrentPortalUser();
    setCurrentUser(null);
  };

  const handleSaveEmployee = async (emp: G4SEmployee) => {
    await saveEmployee(emp);
    await loadEmployees();
  };

  const handleDeleteEmployee = async (id: string, empId: string) => {
    await deleteEmployee(id, empId);
    await loadEmployees();
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

  // Render Auth or Password Recovery Page if in recovery mode or not authenticated
  if (isRecoveryMode || !currentUser) {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        initialView={isRecoveryMode ? 'set-new-password' : 'login'}
        recoveryError={recoveryError}
        onClearRecoveryState={() => {
          setIsRecoveryMode(false);
          setRecoveryError(null);
        }}
      />
    );
  }

  const canDelete = currentUser.can_delete ?? (currentUser.role === 'admin');

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSqlModal={() => {
          if (currentUser?.role === 'admin') setIsSqlModalOpen(true);
        }}
        userEmail={currentUser.email}
        currentUser={currentUser}
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
            canDelete={canDelete}
          />
        )}

        {activeTab === 'reports' && <Reports employees={employees} />}

        {activeTab === 'users' && <UserManagement currentUser={currentUser} />}

        {activeTab === 'settings' && (
          <Settings
            onOpenSqlModal={() => {
              if (currentUser?.role === 'admin') setIsSqlModalOpen(true);
            }}
            currentUser={currentUser}
            onNavigateToUsers={() => setActiveTab('users')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 text-center mt-auto">
        <p className="font-medium">
          Vancot Limited. — Security (G4S) Attendance & Job Card Management System
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Plot No: 18-20, Sector: 3, KEPZ, North Patenga, Chittagong</p>
      </footer>

      {/* Modals - Only accessible by admin */}
      {currentUser?.role === 'admin' && (
        <SupabaseSqlModal isOpen={isSqlModalOpen} onClose={() => setIsSqlModalOpen(false)} />
      )}

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

