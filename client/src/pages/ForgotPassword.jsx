import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setUnverifiedEmail(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await forgotPassword(cleanEmail);
      setSuccessMessage(
        res.message || 'If an account exists with this email, a reset code has been sent.'
      );
      setTimeout(() => {
        navigate('/verify-reset-otp', {
          state: { email: cleanEmail, message: res.message },
        });
      }, 1500);
    } catch (err) {
      if (err.requiresVerification) {
        setErrorMessage(err.message || 'Your account is not verified yet. Please verify your email address.');
        setUnverifiedEmail(err.email || cleanEmail);
      } else {
        setErrorMessage(err.message || 'Failed to request password reset code. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 space-y-6">
      <div className="glass-card max-w-md w-full p-8 space-y-6 border border-amber-500/20 rounded-2xl relative overflow-hidden shadow-2xl">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Forgot Password</h2>
          <p className="text-indigo-200/70 text-xs mt-1">
            Enter your registered email address to receive a 6-digit password reset code
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {unverifiedEmail && (
              <div className="pt-2 border-t border-rose-500/30 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/verify-otp', { state: { email: unverifiedEmail } })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-sm transition-all"
                >
                  Verify Email Now
                </button>
              </div>
            )}
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
            <label className="block text-xs font-semibold text-indigo-200 mb-1">Email Address</label>
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

          <button
            type="submit"
            disabled={isSubmitting || !!successMessage}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 text-sm font-bold shadow-lg shadow-amber-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-indigo-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Send Reset Code
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-indigo-900/60 text-center text-xs text-indigo-200/70">
          Remember your password?{' '}
          <Link to="/login" className="text-amber-400 font-semibold hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
