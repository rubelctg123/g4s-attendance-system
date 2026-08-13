import React, { useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured, saveSupabaseCredentials, getSupabaseCredentials } from '../lib/supabase';
import { Lock, Mail, ShieldCheck, UserCheck, Key, Database, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess: (userEmail: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDbSettings, setShowDbSettings] = useState(false);

  const [dbUrl, setDbUrl] = useState(getSupabaseCredentials().url);
  const [dbKey, setDbKey] = useState(getSupabaseCredentials().key);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({
              email: email.trim(),
              password: password.trim(),
            });

            if (error) {
              throw error;
            }

            if (data.session?.user) {
              setSuccessMsg('Account created successfully! Logging in...');
              setTimeout(() => {
                onLoginSuccess(data.session?.user.email || email.trim());
              }, 1000);
            } else {
              setSuccessMsg('Registration successful! Check your email to confirm or sign in now.');
              setIsSignUp(false);
            }
          } else {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password: password.trim(),
            });

            if (error) {
              throw error;
            }

            if (data.user) {
              onLoginSuccess(data.user.email || email.trim());
            }
          }
        }
      } else {
        // Local HR Session fallback if Supabase URL is not configured yet
        localStorage.setItem('g4s_hr_current_user', email.trim());
        setSuccessMsg('Authenticated in HR Local Mode.');
        setTimeout(() => {
          onLoginSuccess(email.trim());
        }, 500);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoEmail = 'hr.admin@vancot.com';
    localStorage.setItem('g4s_hr_current_user', demoEmail);
    onLoginSuccess(demoEmail);
  };

  const handleSaveDbSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(dbUrl.trim(), dbKey.trim());
    setSuccessMsg('Supabase credentials saved successfully.');
    setShowDbSettings(false);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const isConnected = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative selection:bg-emerald-500 selection:text-white">
      {/* Background Graphic Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden relative z-10">
        {/* Header Header Banner */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-700/80 text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-white uppercase">Vancot Limited.</h1>
          <p className="text-xs font-semibold text-emerald-400 mt-0.5 uppercase tracking-wider">
            Security (G4S) HR Management Portal
          </p>
          <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-800 text-slate-300 border border-slate-700">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            <span>{isConnected ? 'Supabase Auth & Database Active' : 'HR Portal Security'}</span>
          </div>
        </div>

        {/* Content Form */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3 rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs p-3 rounded-xl flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                HR Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="e.g. hr.officer@vancot.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{isSignUp ? 'Create HR Account' : 'Sign In to Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign in / Sign up */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 font-semibold underline underline-offset-4 transition-colors"
            >
              {isSignUp ? 'Already registered? Sign In instead' : 'New HR Staff? Create an Account'}
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-700/80"></div>
            <span className="shrink mx-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">OR</span>
            <div className="flex-grow border-t border-slate-700/80"></div>
          </div>

          {/* Quick Demo Login Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick HR Demo Login (hr.admin@vancot.com)</span>
          </button>

          {/* Optional Database Connection Config */}
          <div className="pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={() => setShowDbSettings(!showDbSettings)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-200 py-1 transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Supabase PostgreSQL Credentials</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">
                {isConnected ? 'Configured' : 'Configure'}
              </span>
            </button>

            {showDbSettings && (
              <form onSubmit={handleSaveDbSettings} className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-slate-700 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://your-project.supabase.co"
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Supabase Anon Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI..."
                    value={dbKey}
                    onChange={(e) => setDbKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs py-2 rounded-lg border border-slate-600 transition-colors"
                >
                  Save Connection Settings
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-6 text-center text-slate-500 text-[11px] relative z-10">
        Vancot Limited. — Security (G4S) Attendance & Job Card Management System
      </footer>
    </div>
  );
};
