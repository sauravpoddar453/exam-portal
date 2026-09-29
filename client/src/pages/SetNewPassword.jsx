import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function SetNewPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email] = useState(
    location.state?.email || sessionStorage.getItem('resetEmail') || ''
  );
  const [resetToken] = useState(
    location.state?.resetToken || sessionStorage.getItem('resetToken') || ''
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email) {
      setErrorMessage('Missing email address. Please restart the password reset process.');
      return;
    }

    if (!resetToken) {
      setErrorMessage('Missing or invalid reset token. Please verify your OTP code again.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await resetPassword(email, resetToken, newPassword, confirmPassword);

      sessionStorage.removeItem('resetToken');
      sessionStorage.removeItem('resetEmail');

      setSuccessMessage(res.message || 'Password reset successful! Redirecting to login...');

      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Your password has been reset successfully! Please sign in with your new password.' },
        });
      }, 2000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset password. Token may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!resetToken && !errorMessage) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="glass-card max-w-md w-full p-8 space-y-4 border border-rose-500/30 rounded-2xl text-center">
          <div className="inline-flex p-3 rounded-2xl bg-rose-500/15 text-rose-300 mb-2">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Session Expired or Missing Token</h2>
          <p className="text-xs text-indigo-200/70">
            Please verify your OTP reset code first before setting a new password.
          </p>
          <div className="pt-4">
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs transition-all"
            >
              Restart Forgot Password
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="glass-card max-w-md w-full p-8 space-y-6 border border-amber-500/20 rounded-2xl relative overflow-hidden shadow-2xl">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Set New Password</h2>
          <p className="text-indigo-200/70 text-xs mt-1">
            Create a new strong password (minimum 8 characters) for <span className="font-semibold text-amber-400">{email}</span>
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-indigo-200 mb-1">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-900/80 text-white placeholder-indigo-300/40 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-200 mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-900/80 text-white placeholder-indigo-300/40 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-rose-400 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !!successMessage}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 text-sm font-bold shadow-lg shadow-amber-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-indigo-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Reset Password & Finish
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-indigo-200/70">
          Cancel and return to{' '}
          <Link to="/login" className="text-amber-400 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
