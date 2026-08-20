import React, { useState } from 'react';
import { PortalUser, ShiftSettings } from '../types';
import { getShiftSettings, saveShiftSettings } from '../lib/db';
import { getSupabaseCredentials, isSupabaseConfigured, saveSupabaseCredentials } from '../lib/supabase';
import { Settings as SettingsIcon, Database, Clock, Save, Code, CheckCircle2, Users, Crown, Lock, ArrowRight } from 'lucide-react';

interface SettingsProps {
  onOpenSqlModal: () => void;
  currentUser?: PortalUser | null;
  onNavigateToUsers?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onOpenSqlModal, currentUser, onNavigateToUsers }) => {
  const [settings, setSettings] = useState<ShiftSettings>(getShiftSettings());
  const [supabaseCreds, setSupabaseCreds] = useState(getSupabaseCredentials());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const handleSaveShiftSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveShiftSettings(settings);
    setToastMsg('Shift settings updated successfully.');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(supabaseCreds.url.trim(), supabaseCreds.key.trim());
    setToastMsg('Supabase configuration saved.');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const isConnected = isSupabaseConfigured();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {toastMsg && (
        <div className="bg-emerald-600 text-white p-3 rounded-xl shadow flex items-center space-x-2 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Shift Timings Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <Clock className="w-5 h-5 text-slate-700" />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Shift & Duty Configuration</h3>
            <p className="text-xs text-slate-500">Configure standard duty hours and shift window bounds</p>
          </div>
        </div>

        <form onSubmit={handleSaveShiftSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">A Shift (Day Duty)</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Start Time</label>
                  <input
                    type="text"
                    value={settings.a_shift_start}
                    onChange={(e) => setSettings({ ...settings, a_shift_start: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">End Time</label>
                  <input
                    type="text"
                    value={settings.a_shift_end}
                    onChange={(e) => setSettings({ ...settings, a_shift_end: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">C Shift (Night Duty)</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Start Time</label>
                  <input
                    type="text"
                    value={settings.c_shift_start}
                    onChange={(e) => setSettings({ ...settings, c_shift_start: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">End Time</label>
                  <input
                    type="text"
                    value={settings.c_shift_end}
                    onChange={(e) => setSettings({ ...settings, c_shift_end: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Standard Duty Hours</label>
              <input
                type="number"
                value={settings.standard_duty_hours}
                onChange={(e) => setSettings({ ...settings, standard_duty_hours: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
              />
              <p className="text-[11px] text-slate-500 mt-1">Normal Day: 8 Hours Duty + 1 Hour Lunch (9h threshold). Friday/Offday/Holiday: 1 Hour Lunch deducted, rest is OT.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-md shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4 text-white" />
              <span>Save Shift Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Supabase Connection Settings - Restricted exclusively to Administrator */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Supabase Database Integration</h3>
                <p className="text-xs text-slate-500">Connect your Supabase PostgreSQL project for persistent storage</p>
              </div>
            </div>

            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                isConnected ? 'bg-[#dcfce7] text-[#166534]' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isConnected ? 'Supabase Connected' : 'Local Persistence Mode'}
            </span>
          </div>

          <form onSubmit={handleSaveSupabase} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Supabase Project URL</label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={supabaseCreds.url}
                onChange={(e) => setSupabaseCreds({ ...supabaseCreds, url: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Supabase Anon Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseCreds.key}
                onChange={(e) => setSupabaseCreds({ ...supabaseCreds, key: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-slate-400"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenSqlModal}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs px-4 py-2 rounded-md border border-slate-200 transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Code className="w-4 h-4 text-slate-600" />
                <span>Get Supabase SQL Setup DDL</span>
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2 rounded-md shadow-sm transition-colors flex items-center justify-center space-x-1.5"
              >
                <Save className="w-4 h-4 text-white" />
                <span>Save Connection Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Roles & Access Control Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Crown className="w-4 h-4 text-purple-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">User Roles & Security Access</h3>
              <p className="text-xs text-slate-500">
                Manage administrator accounts, user permissions, and record deletion privileges
              </p>
            </div>
          </div>

          {isAdmin ? (
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200 flex items-center space-x-1">
              <Crown className="w-3 h-3 text-amber-500" />
              <span>Admin Privileges Active</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 flex items-center space-x-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Admin Access Required</span>
            </span>
          )}
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">
                {isAdmin ? 'Portal User & Security Directory' : 'Role-Based Permission Policy'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                {isAdmin
                  ? 'Create new user accounts, modify role assignments (Admin / HR Officer / Viewer), toggle active or disabled statuses, and configure record deletion rights.'
                  : 'Your account is in standard operation mode. The ability to delete employee records and modify system accounts is reserved exclusively for Administrators.'}
              </p>
            </div>

            {isAdmin && onNavigateToUsers && (
              <button
                type="button"
                onClick={onNavigateToUsers}
                className="bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1.5 shrink-0"
              >
                <Users className="w-4 h-4" />
                <span>Manage Users & Roles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
