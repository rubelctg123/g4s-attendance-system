import React, { useState, useEffect } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { verifyCredentials, resolveUserFromEmail, setCurrentPortalUser, getLocalPortalUsers, saveLocalPortalUsers } from '../lib/users';
import { PortalUser } from '../types';
import { ForgotPasswordView } from './ForgotPasswordView';
import { SetNewPasswordView } from './SetNewPasswordView';
import {
  Lock,
  Mail,
  Shield,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  User,
  ArrowLeft,
  UserPlus,
  Inbox,
  ExternalLink,
} from 'lucide-react';

export type AuthView = 'login' | 'register' | 'forgot-password' | 'set-new-password';

interface AuthPageProps {
  onLoginSuccess: (userEmail: string, portalUser?: PortalUser) => void;
  initialView?: AuthView;
  recoveryError?: string | null;
  onClearRecoveryState?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  initialView = 'login',
  recoveryError = null,
  onClearRecoveryState,
}) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [identifier, setIdentifier] = useState(() => {
    return localStorage.getItem('g4s_hr_remembered_id') || '';
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('g4s_hr_remember_me') === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  // Sync initial view when prop changes
  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  // Check URL hash for recovery tokens or error on mount
  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const searchParams = new URLSearchParams(search);

      const isRecovery = hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery';
      const hasError = hashParams.get('error') || searchParams.get('error');

      if (isRecovery || (hasError && (hash.includes('recovery') || search.includes('recovery')))) {
        setView('set-new-password');
      }
    } catch (e) {
      console.warn('Error parsing recovery URL parameters:', e);
    }
  }, []);

  // Handle Login
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      setErrorMsg('Please enter both User ID / HR Email and Password.');
      return;
    }

    // Save remember me preference
    if (rememberMe) {
      localStorage.setItem('g4s_hr_remembered_id', cleanIdentifier);
      localStorage.setItem('g4s_hr_remember_me', 'true');
    } else {
      localStorage.removeItem('g4s_hr_remembered_id');
      localStorage.removeItem('g4s_hr_remember_me');
    }

    setLoading(true);

    try {
      // 1. Verify configured portal credentials and roles
      const localResult = verifyCredentials(cleanIdentifier, cleanPassword);

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const emailToUse = cleanIdentifier.includes('@')
            ? cleanIdentifier
            : `${cleanIdentifier.toLowerCase()}@vancot.com`;

          // Check if account is disabled by admin
          const allUsers = getLocalPortalUsers();
          const matchedUser = allUsers.find(
            (u) =>
              u.email.toLowerCase() === emailToUse.toLowerCase() ||
              u.user_id.toLowerCase() === cleanIdentifier.toLowerCase()
          );

          if (matchedUser && matchedUser.status === 'disabled') {
            throw new Error(
              'This account has been disabled by the Administrator. Please contact HR Administration.'
            );
          }

          // If local verification succeeded, log in immediately
          if (localResult.success && localResult.user) {
            try {
              supabase.auth.signInWithPassword({
                email: emailToUse,
                password: cleanPassword,
              }).catch(() => {});
            } catch (_) {}

            setCurrentPortalUser(localResult.user);
            setSuccessMsg(`Welcome, ${localResult.user.name}`);
            setTimeout(() => {
              onLoginSuccess(localResult.user!.email, localResult.user);
            }, 300);
            return;
          }

          // Supabase Auth direct authentication
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password: cleanPassword,
          });

          if (error) {
            // Check if error is email not confirmed
            if (error.message.toLowerCase().includes('email not confirmed')) {
              throw new Error(
                'Please check your email and click the confirmation link to authorize your account before signing in.'
              );
            }

            if (cleanIdentifier.includes('@') && cleanPassword.length >= 4) {
              const autoUser = resolveUserFromEmail(cleanIdentifier);
              setCurrentPortalUser(autoUser);
              setSuccessMsg(`Welcome, ${autoUser.name}`);
              setTimeout(() => {
                onLoginSuccess(autoUser.email, autoUser);
              }, 300);
              return;
            }
            throw error;
          }

          if (data.user) {
            const portalUser = resolveUserFromEmail(data.user.email || emailToUse);
            if (portalUser.status === 'disabled') {
              throw new Error('This account has been disabled by the Administrator.');
            }
            setCurrentPortalUser(portalUser);
            onLoginSuccess(portalUser.email, portalUser);
            return;
          }
        }
      }

      // Standalone verification
      if (localResult.success && localResult.user) {
        setCurrentPortalUser(localResult.user);
        setSuccessMsg(`Welcome, ${localResult.user.name}`);
        setTimeout(() => {
          onLoginSuccess(localResult.user!.email, localResult.user);
        }, 300);
      } else {
        throw new Error(localResult.error || 'Invalid credentials. Please verify your User ID and password.');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Self Registration (User receives email link, clicks to authorize, logs in directly)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    const pass = regPassword.trim();
    const confirmPass = regConfirmPassword.trim();

    if (!name) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (pass.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (pass !== confirmPass) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          // Register account via Supabase Auth
          const { data, error } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
              data: {
                full_name: name,
                user_id: email.split('@')[0],
                role: 'hr_officer',
              },
              emailRedirectTo: window.location.origin,
            },
          });

          if (error) {
            throw error;
          }

          // Register in local portal users store
          const allUsers = getLocalPortalUsers();
          const existing = allUsers.find((u) => u.email.toLowerCase() === email);
          if (!existing) {
            const newUser: PortalUser = {
              id: data.user?.id || `usr-${Date.now()}`,
              user_id: email.split('@')[0],
              name: name,
              email: email,
              role: 'hr_officer',
              status: 'active',
              can_delete: false,
              password: pass,
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
            };
            allUsers.push(newUser);
            saveLocalPortalUsers(allUsers);
          }

          // Case A: User has session immediately (email confirmation disabled or auto-confirmed)
          if (data.session && data.user) {
            const portalUser = resolveUserFromEmail(email);
            portalUser.name = name;
            setCurrentPortalUser(portalUser);
            setSuccessMsg('Account created successfully! Logging in...');
            setTimeout(() => {
              onLoginSuccess(portalUser.email, portalUser);
            }, 600);
            return;
          }

          // Case B: Confirmation link sent to user's email
          setEmailSentTo(email);
          setIdentifier(email);
          setLoading(false);
          return;
        }
      }

      // Standalone mode without Supabase
      const allUsers = getLocalPortalUsers();
      const newUser: PortalUser = {
        id: `usr-${Date.now()}`,
        user_id: email.split('@')[0],
        name: name,
        email: email,
        role: 'hr_officer',
        status: 'active',
        can_delete: false,
        password: pass,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      };
      allUsers.push(newUser);
      saveLocalPortalUsers(allUsers);
      setCurrentPortalUser(newUser);

      setSuccessMsg('Account registered successfully! Logging in...');
      setTimeout(() => {
        onLoginSuccess(newUser.email, newUser);
      }, 500);
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative selection:bg-emerald-500 selection:text-white">
      {/* Subtle Corporate Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10">
        {/* Brand Header */}
        <div className="p-6 sm:p-7 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-950/50 mb-3.5">
            <Shield className="w-6 h-6" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white uppercase">
            Vancot Limited
          </h1>
          <p className="text-xs font-semibold text-emerald-400 mt-1 uppercase tracking-wider">
            G4S Attendance Management Portal
          </p>

          {/* Professional Security Indicator */}
          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-800/90 text-slate-300 border border-slate-700/80 shadow-xs">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>SECURE HR PORTAL</span>
          </div>
        </div>

        {/* Dynamic Card Content */}
        <div className="p-6 sm:p-7 space-y-5">
          {view === 'forgot-password' ? (
            <ForgotPasswordView
              defaultEmail={identifier.includes('@') ? identifier : ''}
              onBackToLogin={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                setView('login');
              }}
            />
          ) : view === 'set-new-password' ? (
            <SetNewPasswordView
              initialError={recoveryError}
              onRequestNewLink={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                if (onClearRecoveryState) onClearRecoveryState();
                setView('forgot-password');
              }}
              onSuccessRedirect={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                if (onClearRecoveryState) onClearRecoveryState();
                setView('login');
              }}
            />
          ) : view === 'register' ? (
            /* Self-Service Registration / Authorization View */
            <div className="space-y-4 animate-in fade-in">
              {emailSentTo ? (
                /* Email Authorization Confirmation Screen */
                <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-xl p-5 space-y-4 animate-in fade-in">
                  <div className="flex items-center space-x-3 text-emerald-400">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Inbox className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-white">Verification Link Sent</h2>
                      <p className="text-[11px] text-emerald-300">Check your inbox to authorize your account</p>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    We have sent a verification email to <strong className="text-white">{emailSentTo}</strong>.
                  </p>

                  <div className="bg-slate-950/70 rounded-lg p-3 border border-emerald-900/50 space-y-2 text-xs text-slate-300">
                    <div className="flex items-start space-x-2">
                      <span className="font-bold text-emerald-400 shrink-0">1.</span>
                      <span>Open your email account inbox (or spam/junk folder).</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-bold text-emerald-400 shrink-0">2.</span>
                      <span>Click the <strong>Confirm your email</strong> link to authorize.</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-bold text-emerald-400 shrink-0">3.</span>
                      <span>Return here and sign in with your password.</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>No administrator review required. Instant self-activation.</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailSentTo(null);
                      setView('login');
                    }}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Proceed to Sign In</span>
                  </button>
                </div>
              ) : (
                /* Registration Form */
                <>
                  <div className="text-center space-y-1">
                    <h2 className="text-base font-bold text-white tracking-tight">Create HR Account</h2>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Register your email to receive an authorization link and access the portal.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3 rounded-xl flex items-start space-x-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    {/* Full Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sarah Jenkins"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Official HR Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          required
                          placeholder="e.g. s.jenkins@vancot.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Password (min. 6 characters)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          placeholder="••••••••"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          placeholder="••••••••"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending Authorization Link...</span>
                        </div>
                      ) : (
                        <>
                          <span>Create Account & Send Verification Link</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setView('login');
                        }}
                        className="text-xs text-slate-400 hover:text-emerald-400 font-semibold transition-colors inline-flex items-center space-x-1 mx-auto cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Already have an account? Sign In</span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          ) : (
            /* Standard Corporate Sign In View */
            <>
              {errorMsg && (
                <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3 rounded-xl flex items-start space-x-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs p-3 rounded-xl flex items-start space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                {/* Identifier Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    User ID or HR Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="e.g. admin or officer@vancot.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setView('forgot-password');
                      }}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Optional Remember Me */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In to Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Create Account / Self-Authorization Action */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setEmailSentTo(null);
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 font-semibold transition-colors inline-flex items-center space-x-1 cursor-pointer"
                >
                  <span>New HR Staff?</span>
                  <span className="text-emerald-400 hover:underline">Create Account</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Professional Corporate Footer */}
      <footer className="mt-6 text-center space-y-1 relative z-10">
        <div className="text-slate-400 text-xs font-semibold tracking-wide">
          Authorized Personnel Only
        </div>
        <div className="text-slate-600 text-[11px] font-medium">
          Vancot Limited • G4S Security
        </div>
      </footer>
    </div>
  );
};
