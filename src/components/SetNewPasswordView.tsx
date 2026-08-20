import React, { useState, useMemo } from 'react';
import { updateUserPassword } from '../lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';

interface SetNewPasswordViewProps {
  onSuccessRedirect: () => void;
  onRequestNewLink: () => void;
  initialError?: string | null;
}

export const SetNewPasswordView: React.FC<SetNewPasswordViewProps> = ({
  onSuccessRedirect,
  onRequestNewLink,
  initialError = null,
}) => {
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Requirements verification
  const requirements = useMemo(() => {
    const hasMinLength = newPassword.length >= 6;
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (hasLetter) score += 1;
    if (hasNumberOrSymbol) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;

    let strengthLabel = 'Weak';
    let strengthColor = 'bg-rose-500';
    let strengthWidth = '25%';

    if (score >= 4) {
      strengthLabel = 'Strong';
      strengthColor = 'bg-emerald-500';
      strengthWidth = '100%';
    } else if (score >= 2) {
      strengthLabel = 'Moderate';
      strengthColor = 'bg-amber-500';
      strengthWidth = '60%';
    }

    return {
      hasMinLength,
      hasLetter,
      hasNumberOrSymbol,
      passwordsMatch,
      strengthLabel,
      strengthColor,
      strengthWidth,
      isValid: hasMinLength && passwordsMatch,
    };
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newPassword) {
      setErrorMsg('Please enter your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);

    try {
      await updateUserPassword(newPassword);
      setIsSuccess(true);

      // Clean up recovery tokens from browser address bar
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err: any) {
      console.error('Update password error:', err);
      const msg = err.message || '';
      if (
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('token') ||
        msg.toLowerCase().includes('session') ||
        msg.toLowerCase().includes('not logged in')
      ) {
        setErrorMsg('The recovery session is invalid or has expired. Please request a new password recovery link.');
      } else {
        setErrorMsg(msg || 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearAndRequestNew = () => {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    onRequestNewLink();
  };

  // If already succeeded
  if (isSuccess) {
    return (
      <div className="space-y-5 animate-in fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-1">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">Password Changed Successfully</h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            Your HR portal password has been updated securely. You can now use your new password to sign in.
          </p>
        </div>

        <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-3.5 flex items-center space-x-2.5 text-emerald-300 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Your active credentials are encrypted and protected.</span>
        </div>

        <button
          type="button"
          onClick={onSuccessRedirect}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center space-x-2"
        >
          <span>Continue to HR Login</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
          <KeyRound className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">Set New Password</h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Create a secure new password for your Vancot G4S HR Management account.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3.5 rounded-xl space-y-2 animate-in fade-in">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-tight">{errorMsg}</span>
          </div>

          {(errorMsg.toLowerCase().includes('expired') ||
            errorMsg.toLowerCase().includes('invalid') ||
            errorMsg.toLowerCase().includes('session') ||
            initialError) && (
            <div className="pt-1.5 border-t border-rose-900/60 flex justify-end">
              <button
                type="button"
                onClick={handleClearAndRequestNew}
                className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-rose-300 hover:text-white bg-rose-900/60 hover:bg-rose-900 px-2.5 py-1 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Request New Recovery Link</span>
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoFocus
              placeholder="Enter new password (min. 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-0.5 rounded focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength Bar */}
          {newPassword && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Strength: <strong className="text-slate-200">{requirements.strengthLabel}</strong></span>
                <span>{newPassword.length} characters</span>
              </div>
              <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${requirements.strengthColor}`}
                  style={{ width: requirements.strengthWidth }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full bg-slate-900 border ${
                confirmPassword && !requirements.passwordsMatch
                  ? 'border-rose-500/70 focus:border-rose-500'
                  : 'border-slate-700 focus:border-emerald-500'
              } focus:ring-1 focus:ring-emerald-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-medium`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-0.5 rounded focus:outline-none"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Password Requirements Checklist */}
        <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-1.5 text-[11px]">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Password Criteria:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <div className={`flex items-center space-x-1.5 ${requirements.hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${requirements.hasMinLength ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span>At least 6 chars</span>
            </div>
            <div className={`flex items-center space-x-1.5 ${requirements.hasNumberOrSymbol ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${requirements.hasNumberOrSymbol ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span>Number or symbol</span>
            </div>
            <div className={`flex items-center space-x-1.5 ${confirmPassword && requirements.passwordsMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${confirmPassword && requirements.passwordsMatch ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span>Passwords match</span>
            </div>
            <div className={`flex items-center space-x-1.5 ${requirements.hasLetter ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${requirements.hasLetter ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span>Letters included</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading || (confirmPassword.length > 0 && !requirements.passwordsMatch)}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Updating Password...</span>
            </div>
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
