import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Mail, Lock, Shield, AlertCircle, ArrowRight } from 'lucide-react';

export default function Register() {
  const { register, getRoleDashboard } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await register(name, email, password, role);
      // Redirect to OTP verification page
      navigate('/verify-otp', {
        state: {
          email: res?.email || email,
          message: res?.message || 'Registration successful! An OTP verification code was sent to your email.',
        },
      });
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      
      <div className="bg-white max-w-lg w-full p-8 space-y-6 border border-gray-200 rounded-2xl shadow-md relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/5 blur-3xl rounded-full pointer-events-none" />

        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 mb-3">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Create Account</h2>
          <p className="text-gray-500 text-xs mt-1">Register for the Exam Portal as a Student, Teacher, or Admin</p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Role selection dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Register As Role</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'student', label: 'Student' },
                { id: 'teacher', label: 'Teacher' },
                { id: 'admin', label: 'Admin' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                    role === r.id
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>
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
                Register Account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-red-600 font-semibold hover:underline">
            Sign In here
          </Link>
        </p>

      </div>

    </div>
  );
}
