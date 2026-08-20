import React, { useState } from 'react';
import { X, Copy, Check, Database } from 'lucide-react';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQL_SCRIPT = `-- =========================================================
-- G4S ATTENDANCE MANAGEMENT SYSTEM — SUPABASE DDL & RLS SCHEMA
-- Target Database: Supabase PostgreSQL
-- =========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Table: g4s_employees
CREATE TABLE IF NOT EXISTS g4s_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  category TEXT DEFAULT 'Worker',
  join_date DATE NOT NULL,
  inactive_date DATE,
  business_unit TEXT DEFAULT 'Security (G4S)',
  company_name TEXT DEFAULT 'Vancot Limited.',
  line TEXT DEFAULT 'Main Gate',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Table: g4s_attendance
CREATE TABLE IF NOT EXISTS g4s_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL,
  shift TEXT,
  in_time TEXT,
  out_time TEXT,
  duration_minutes INT DEFAULT 0,
  late_minutes INT DEFAULT 0,
  early_minutes INT DEFAULT 0,
  overtime_minutes INT DEFAULT 0,
  remarks TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_emp_date UNIQUE (employee_id, attendance_date)
);

-- 4. Create Table: g4s_portal_users (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS g4s_portal_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL DEFAULT 'Admin@2026',
  role TEXT NOT NULL DEFAULT 'hr_officer', -- 'admin', 'hr_officer', 'viewer'
  status TEXT NOT NULL DEFAULT 'active',   -- 'active', 'disabled'
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default Admin and Staff accounts
INSERT INTO g4s_portal_users (user_id, email, name, password, role, status, can_delete)
VALUES 
  ('admin', 'admin@vancot.com', 'System Administrator', 'Admin@2026', 'admin', 'active', true),
  ('hr.officer', 'hr.officer@vancot.com', 'HR Security Officer', 'Officer@2026', 'hr_officer', 'active', false)
ON CONFLICT (user_id) DO NOTHING;

-- 5. Configure Row Level Security (RLS) & Define Permissive Access
ALTER TABLE g4s_employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE g4s_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE g4s_portal_users DISABLE ROW LEVEL SECURITY;

-- 6. Grant explicit permissions to public/anon and authenticated roles
GRANT ALL ON g4s_employees TO public, anon, authenticated, service_role;
GRANT ALL ON g4s_attendance TO public, anon, authenticated, service_role;
GRANT ALL ON g4s_portal_users TO public, anon, authenticated, service_role;

-- 7. Enable Realtime Replication for instant multi-user & multi-device sync
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE g4s_employees;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE g4s_attendance;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE g4s_portal_users;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
`;

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 text-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Supabase Database Setup SQL Script</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300">
            Copy and paste the following SQL script into your <strong>Supabase SQL Editor</strong> to create the required <code>g4s_employees</code> and <code>g4s_attendance</code> tables automatically.
          </p>

          <div className="relative bg-slate-950 rounded-xl p-4 border border-slate-800 max-h-80 overflow-y-auto">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow flex items-center space-x-1 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
            </button>
            <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">{SQL_SCRIPT}</pre>
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
