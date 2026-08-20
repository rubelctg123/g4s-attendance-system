import React, { useState } from 'react';
import { ActiveTab, G4SEmployee } from '../types';
import { Users, Calendar, Clock, FileCheck, ArrowRight, Shield, PlusCircle, CheckCircle2, UserX, Filter, Check, Search, X } from 'lucide-react';
import { formatDisplayDate } from '../utils/calculations';

interface DashboardProps {
  employees: G4SEmployee[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectEmployeeForAttendance: (empId: string) => void;
  onOpenAddEmployee: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  employees,
  setActiveTab,
  onSelectEmployeeForAttendance,
  onOpenAddEmployee,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeEmployees = employees.filter((e) => e.active);
  const inactiveEmployees = employees.filter((e) => !e.active);

  const displayedEmployees = employees.filter((e) => {
    if (filterMode === 'active' && !e.active) return false;
    if (filterMode === 'inactive' && e.active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesId = e.employee_id.toLowerCase().includes(q);
      const matchesName = e.name.toLowerCase().includes(q);
      const matchesJob = e.job_title?.toLowerCase().includes(q);
      const matchesLine = e.line?.toLowerCase().includes(q);
      return matchesId || matchesName || matchesJob || matchesLine;
    }
    return true;
  });

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-emerald-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-semibold mb-3 border border-emerald-700">
              <Shield className="w-3.5 h-3.5 text-emerald-300" />
              <span>Security Service Provider: G4S Bangladesh</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Vancot Limited — G4S Job Card System
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Dedicated attendance and job card management for G4S security personnel at Vancot Factory (KEPZ). Update shifts, generate suggested duty times, and export official monthly job cards.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              id="dashboard-manage-attendance-btn"
              onClick={() => setActiveTab('attendance')}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-4 py-2.5 rounded-lg shadow-md transition-all text-xs sm:text-sm cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-white" />
              <span>Manage Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards with Interactive Filtering */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div
          id="stat-card-total-employees"
          onClick={() => setFilterMode('all')}
          className={`rounded-xl p-5 border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            filterMode === 'all'
              ? 'bg-slate-900 text-white border-slate-700 ring-2 ring-slate-400 ring-offset-2'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center space-x-1.5">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${filterMode === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
                Total G4S Employees
              </p>
              {filterMode === 'all' && (
                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-bold">Selected</span>
              )}
            </div>
            <h3 className={`text-2xl font-bold mt-1 ${filterMode === 'all' ? 'text-white' : 'text-slate-900'}`}>{employees.length}</h3>
            <p className={`text-xs mt-0.5 ${filterMode === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Click to view all employees
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
              filterMode === 'all' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Employees */}
        <div
          id="stat-card-active-employees"
          onClick={() => setFilterMode('active')}
          className={`rounded-xl p-5 border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            filterMode === 'active'
              ? 'bg-emerald-900 text-white border-emerald-700 ring-2 ring-emerald-400 ring-offset-2'
              : 'bg-white text-slate-900 border-slate-200 hover:border-emerald-300 hover:shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center space-x-1.5">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${filterMode === 'active' ? 'text-emerald-200' : 'text-slate-500'}`}>
                Active Employees
              </p>
              {filterMode === 'active' && (
                <span className="text-[10px] bg-emerald-400 text-emerald-950 px-1.5 py-0.2 rounded font-bold">Selected</span>
              )}
            </div>
            <h3 className={`text-2xl font-bold mt-1 ${filterMode === 'active' ? 'text-white' : 'text-emerald-700'}`}>
              {activeEmployees.length}
            </h3>
            <p className={`text-xs mt-0.5 ${filterMode === 'active' ? 'text-emerald-200' : 'text-slate-500'}`}>
              Click to show active employees
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
              filterMode === 'active' ? 'bg-emerald-800 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Inactive Employees */}
        <div
          id="stat-card-inactive-employees"
          onClick={() => setFilterMode('inactive')}
          className={`rounded-xl p-5 border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            filterMode === 'inactive'
              ? 'bg-rose-900 text-white border-rose-700 ring-2 ring-rose-400 ring-offset-2'
              : 'bg-white text-slate-900 border-slate-200 hover:border-rose-300 hover:shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center space-x-1.5">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${filterMode === 'inactive' ? 'text-rose-200' : 'text-slate-500'}`}>
                Inactive Employees
              </p>
              {filterMode === 'inactive' && (
                <span className="text-[10px] bg-rose-300 text-rose-950 px-1.5 py-0.2 rounded font-bold">Selected</span>
              )}
            </div>
            <h3 className={`text-2xl font-bold mt-1 ${filterMode === 'inactive' ? 'text-white' : 'text-rose-700'}`}>
              {inactiveEmployees.length}
            </h3>
            <p className={`text-xs mt-0.5 ${filterMode === 'inactive' ? 'text-rose-200' : 'text-slate-500'}`}>
              Click to show inactive employees
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
              filterMode === 'inactive' ? 'bg-rose-800 text-rose-200' : 'bg-rose-50 text-rose-700'
            }`}
          >
            <UserX className="w-5 h-5" />
          </div>
        </div>

        {/* Active Period */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Period</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {currentMonthName} {currentYear}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Dynamic Monthly Days</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-slate-700" />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Employee Selection List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">G4S Security Employees</h2>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    filterMode === 'active'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : filterMode === 'inactive'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {filterMode === 'active' ? 'Active Only' : filterMode === 'inactive' ? 'Inactive Only' : 'All Employees'} ({displayedEmployees.length})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Click any employee row to automatically open their monthly Job Card</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterMode === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({employees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('active')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterMode === 'active' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  Active ({activeEmployees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('inactive')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterMode === 'inactive' ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  Inactive ({inactiveEmployees.length})
                </button>
              </div>

              <button
                id="dashboard-add-employee-btn"
                onClick={onOpenAddEmployee}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
                <span>Add Employee</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                id="dashboard-employee-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guard by Name or Employee ID (e.g. 05016669)..."
                className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 placeholder-slate-400 text-xs font-medium pl-10 pr-9 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1">
                <span>
                  Found <strong className="text-emerald-700 font-bold">{displayedEmployees.length}</strong> matching guard{displayedEmployees.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {displayedEmployees.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                {searchQuery ? (
                  <div>
                    <p>No employees matching &ldquo;<span className="font-semibold text-slate-700">{searchQuery}</span>&rdquo;</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                    >
                      Clear search filter
                    </button>
                  </div>
                ) : (
                  <div>
                    No {filterMode === 'inactive' ? 'inactive' : filterMode === 'active' ? 'active' : ''} G4S employees found.
                    {filterMode !== 'all' && (
                      <div className="mt-2">
                        <button
                          onClick={() => setFilterMode('all')}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                        >
                          Show all employees
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              displayedEmployees.map((emp) => {
                const isInactive = !emp.active || Boolean(emp.inactive_date);
                return (
                  <div
                    key={emp.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-emerald-50/60 transition-colors group cursor-pointer"
                    onClick={() => onSelectEmployeeForAttendance(emp.employee_id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                          isInactive ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {emp.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            ID: {emp.employee_id}
                          </span>
                          <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                            {emp.name}
                          </span>
                          {isInactive && (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                              Inactive {emp.inactive_date ? `(${formatDisplayDate(emp.inactive_date)})` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {emp.job_title} • {emp.line || 'Main Gate'}
                        </p>
                      </div>
                    </div>

                    <button
                      id={`open-jobcard-emp-${emp.employee_id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEmployeeForAttendance(emp.employee_id);
                      }}
                      className="inline-flex items-center justify-center space-x-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 px-3.5 py-1.5 rounded-md shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Open Job Card</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Workflow Guide */}
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 rounded-xl p-6 text-white shadow-md border border-emerald-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Main Workflow</span>
            </div>
            <h3 className="text-base font-bold text-white">How to process G4S Job Cards</h3>
            <p className="text-emerald-200/80 text-xs mt-1 mb-5 leading-relaxed">
              Standard operating procedure for Vancot Limited's security gate log verification.
            </p>

            <ol className="space-y-3 text-xs text-emerald-100">
              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center shrink-0 text-[10px] border border-emerald-700">
                  1
                </span>
                <span>Select Year, Month & G4S Employee in Attendance tab.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center shrink-0 text-[10px] border border-emerald-700">
                  2
                </span>
                <span>The system auto-generates all calendar dates for that month.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center shrink-0 text-[10px] border border-emerald-700">
                  3
                </span>
                <span>Set Status (P, A, H, OSD, W) and Shift (A or C).</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center shrink-0 text-[10px] border border-emerald-700">
                  4
                </span>
                <span>System suggests In/Out times. Verify or edit manually.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center shrink-0 text-[10px] border border-emerald-700">
                  5
                </span>
                <span>Click Save Changes to sync data and Export official PDF or Excel.</span>
              </li>
            </ol>
          </div>

          <div className="mt-6 pt-4 border-t border-emerald-900/80 text-[11px] text-emerald-300 flex items-center justify-between">
            <span>Vancot KEPZ Unit</span>
            <span className="font-semibold text-emerald-200">G4S Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};
