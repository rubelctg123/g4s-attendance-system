import React, { useState } from 'react';
import { sendPasswordRecoveryEmail } from '../lib/supabase';
import { Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, KeyRound, Clock, ShieldCheck } from 'lucide-react';

interface ForgotPasswordViewProps {
  onBackToLogin: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  onBackToLogin,
  defaultEmail = '',
}) => {
  const [email, setEmail] = useState<string>(defaultEmail);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid HR email address.');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordRecoveryEmail(email.trim());
      setSubmitted(true);
      setCooldown(60);

      // Start cooldown countdown
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Password recovery error:', err);
      setErrorMsg(err.message || 'Unable to send recovery email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
          <KeyRound className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">Recover Account Password</h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Enter your registered HR email address and we will send you a secure link to reset your password.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3 rounded-xl flex items-start space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {submitted ? (
        <div className="space-y-4 animate-in fade-in">
          {/* Generic Success Notice */}
          <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center space-x-2.5 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="font-bold text-xs">Recovery Instructions Sent</span>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              If an account exists for <strong className="text-white font-mono">{email}</strong>, a password recovery link has been sent.
            </p>
            <div className="pt-2 text-[11px] text-slate-400 border-t border-emerald-900/60 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Please check your inbox (and spam folder) for the reset email.</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || cooldown > 0}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-semibold text-xs py-2.5 rounded-xl border border-slate-700 transition-colors flex items-center justify-center space-x-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {cooldown > 0 ? `Resend Recovery Email in (${cooldown}s)` : 'Resend Recovery Email'}
              </span>
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to HR Login</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Registered HR Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                autoFocus
                placeholder="e.g. hr.officer@vancot.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              The reset link will be sent to this email address if it is registered in the system.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending Recovery Email...</span>
              </div>
            ) : (
              <>
                <span>Send Recovery Email</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
