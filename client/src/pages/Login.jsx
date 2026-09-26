import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, GraduationCap, CheckCircle2, KeyRound } from 'lucide-react';

export default function Login() {
  const { login, getRoleDashboard } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setUnverifiedEmail(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login(email, password);
      
      // Determine redirect location
      const from = location.state?.from?.pathname;
      const targetDashboard = from || getRoleDashboard(user.role);
      navigate(targetDashboard, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
      if (err.requiresVerification) {
        setUnverifiedEmail(err.email || email);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 space-y-6">
      
      <div className="bg-white max-w-md w-full p-8 space-y-6 border border-gray-200 rounded-2xl shadow-md relative overflow-hidden">
        
        {/* Ambient red backdrop */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl rounded-full pointer-events-none" />

        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 mb-3">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Portal Sign In</h2>
          <p className="text-gray-500 text-xs mt-1">Authenticate to access your examination workspace</p>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {unverifiedEmail && (
              <div className="pt-2 border-t border-rose-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/verify-otp', { state: { email: unverifiedEmail } })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Verify Email Now
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md shadow-red-600/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          Need an account?{' '}
          <Link to="/register" className="text-red-600 font-semibold hover:underline">
            Register Candidate Account
          </Link>
        </p>

      </div>

    </div>
  );
}

