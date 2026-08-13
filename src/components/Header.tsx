import React from 'react';
import { ActiveTab } from '../types';
import { ShieldCheck, Calendar, Users, FileText, Settings as SettingsIcon, Database, LogOut, User } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSqlModal: () => void;
  userEmail?: string | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSqlModal,
  userEmail,
  onLogout,
}) => {
  const isDbConnected = isSupabaseConfigured();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <Calendar className="w-4 h-4" /> },
    { id: 'employees', label: 'Employees', icon: <Users className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Company Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-extrabold text-white shadow-md shrink-0">
              G4S
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">Vancot Limited</span>
                <span className="text-[10px] uppercase font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                  KEPZ
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider mt-0.5">
                Attendance Management System
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Account & Supabase Status Indicator */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenSqlModal}
              title={isDbConnected ? 'Connected to Supabase PostgreSQL' : 'Click to configure Supabase'}
              className={`hidden sm:flex items-center space-x-2 text-xs px-2.5 py-1.5 rounded-md border font-medium transition-all shadow-xs ${
                isDbConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-bold">
                {isDbConnected ? 'Supabase Active' : 'Local Storage Mode'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </button>

            {userEmail && (
              <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-900 leading-none">{userEmail.split('@')[0]}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{userEmail}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
                  <User className="w-4 h-4" />
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex overflow-x-auto border-t border-slate-200 bg-white px-2 py-1 space-x-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
              activeTab === item.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
