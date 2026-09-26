import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, ArrowRight, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function VerifyOTP() {
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // 60-second resend countdown timer
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

    if (!email.trim() || !email.includes('@')) {
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
      const res = await verifyOtp(email, cleanOtp);
      setSuccessMessage(res.message || 'Email verified successfully! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Email verified successfully! You can now sign in to your account.' },
        });
      }, 2000);
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

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter your registered email address to resend OTP.');
      return;
    }

    try {
      setIsResending(true);
      const res = await resendOtp(email);
      setSuccessMessage(res.message || 'A new 6-digit OTP code has been sent to your email address.');
      setTimer(60); // Reset 60s timer
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend OTP code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white max-w-md w-full p-8 space-y-6 border border-gray-200 rounded-2xl shadow-md relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/5 blur-3xl rounded-full pointer-events-none" />

        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 mb-3">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Email Verification</h2>
          <p className="text-gray-500 text-xs mt-1">
            Enter the 6-digit OTP sent to your registered email address
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Target Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">6-Digit Verification Code</label>
            <input
              type="text"
              maxLength={6}
              required
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-2xl font-mono font-bold tracking-[0.4em] text-center focus:outline-none focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600"
            />
            <p className="text-[11px] text-gray-400 mt-1 text-center">
              Check your inbox (or terminal console log in dev mode) for the 6-digit OTP.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || successMessage.includes('Redirecting')}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md shadow-red-600/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Verify Code & Activate
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        {/* Resend Section */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Didn't receive the code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={timer > 0 || isResending}
            className="inline-flex items-center gap-1.5 font-semibold text-red-600 hover:text-red-700 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
          >
            {isResending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {timer > 0 ? `Resend Code (${timer}s)` : 'Resend Code'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-500">
          Already verified?{' '}
          <Link to="/login" className="text-red-600 font-semibold hover:underline">
            Back to Sign In
          </Link>
        </p>

      </div>
    </div>
  );
}
