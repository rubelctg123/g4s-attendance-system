import React from 'react';
import { ActiveTab, G4SEmployee } from '../types';
import { Users, Calendar, Clock, FileCheck, ArrowRight, Shield, PlusCircle, CheckCircle2 } from 'lucide-react';

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
  const activeEmployees = employees.filter((e) => e.active);
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
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-4 py-2.5 rounded-lg shadow-md transition-all text-xs sm:text-sm"
            >
              <Calendar className="w-4 h-4 text-white" />
              <span>Manage Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total G4S Staff</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{employees.length}</h3>
            <p className="text-xs text-slate-500 mt-0.5">G4S Security Team</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
            <Users className="w-5 h-5 text-slate-700" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Staff</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">{activeEmployees.length}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Deployed at Vancot</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

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

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Standard Shift</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">12 Hours Duty</h3>
            <p className="text-xs text-slate-500 mt-0.5">Shift A (Day) & Shift C (Night)</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
            <Clock className="w-5 h-5 text-slate-700" />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Employee Selection List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">G4S Security Personnel</h2>
              <p className="text-xs text-slate-500">Select an employee to open and update their monthly Job Card</p>
            </div>
            <button
              id="dashboard-add-employee-btn"
              onClick={onOpenAddEmployee}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
              <span>Add Employee</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {employees.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No G4S employees found. Click "Add Employee" to create one.
              </div>
            ) : (
              employees.map((emp) => (
                <div
                  key={emp.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-emerald-50/50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{emp.name}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          ID: {emp.employee_id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {emp.job_title} • {emp.line || 'Main Gate'}
                      </p>
                    </div>
                  </div>

                  <button
                    id={`open-jobcard-emp-${emp.employee_id}`}
                    onClick={() => onSelectEmployeeForAttendance(emp.employee_id)}
                    className="inline-flex items-center justify-center space-x-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 px-3.5 py-1.5 rounded-md shadow-xs transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Open Job Card</span>
                  </button>
                </div>
              ))
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
