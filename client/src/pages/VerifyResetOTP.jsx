import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, ArrowRight, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function VerifyResetOTP() {
  const { verifyResetOtp, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || 'A 6-digit reset code has been sent to your email.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [timer, setTimer] = useState(60);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter a valid 6-digit numeric OTP code.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await verifyResetOtp(cleanEmail, cleanOtp);

      if (res.resetToken) {
        sessionStorage.setItem('resetToken', res.resetToken);
        sessionStorage.setItem('resetEmail', cleanEmail);
      }

      setSuccessMessage(res.message || 'Code verified successfully! Proceeding to password reset...');
      setTimeout(() => {
        navigate('/set-new-password', {
          state: { email: cleanEmail, resetToken: res.resetToken },
        });
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please check your code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || isResending) return;
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter your email address to resend the reset code.');
      return;
    }

    try {
      setIsResending(true);
      const res = await forgotPassword(cleanEmail);
      setSuccessMessage(res.message || 'A new 6-digit reset code has been sent to your email.');
      setTimer(60);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend reset code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="glass-card max-w-md w-full p-8 space-y-6 border border-amber-500/20 rounded-2xl relative overflow-hidden shadow-2xl">
        
        {/* Ambient glow backdrop */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Verify Reset Code</h2>
          <p className="text-indigo-200/70 text-xs mt-1">
            Enter the 6-digit OTP code sent to your email to verify password reset ownership
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
            <label className="block text-xs font-semibold text-indigo-200 mb-1">Target Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-900/80 text-white placeholder-indigo-300/40 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-200 mb-1">6-Digit Reset Code</label>
            <input
              type="text"
              maxLength={6}
              required
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 rounded-xl bg-indigo-950/80 border border-amber-500/30 text-amber-400 text-2xl font-mono font-bold tracking-[0.4em] text-center focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
            <p className="text-[11px] text-indigo-300/60 mt-1 text-center">
              Check your inbox for the 6-digit OTP reset code.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || successMessage.includes('Proceeding')}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 text-sm font-bold shadow-lg shadow-amber-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-indigo-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Verify Code
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-indigo-900/60 flex items-center justify-between text-xs text-indigo-200/70">
          <span>Didn't receive code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={timer > 0 || isResending}
            className="inline-flex items-center gap-1.5 font-bold text-amber-400 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {isResending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {timer > 0 ? `Resend Code (${timer}s)` : 'Resend Code'}
          </button>
        </div>

        <p className="text-center text-xs text-indigo-200/70">
          Remember password?{' '}
          <Link to="/login" className="text-amber-400 font-semibold hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
