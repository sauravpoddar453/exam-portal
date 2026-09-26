import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Activity, 
  LayoutDashboard, 
  BookOpen, 
  LogIn, 
  LogOut, 
  User, 
  HelpCircle, 
  Sparkles, 
  FileCheck, 
  Menu, 
  X,
  Layers,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, loading: authLoading, logout, getRoleDashboard } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;
  const isStaff = user && (user.role === 'admin' || user.role === 'teacher');

  const scrollToSection = (id) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'teacher':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'student':
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <nav 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm py-3' 
          : 'bg-white/80 backdrop-blur-sm border-b border-gray-200/80 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-600 shadow-sm group-hover:border-red-400 group-hover:scale-105 transition-all duration-200">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-gray-900 tracking-wide leading-none">
                EXAM<span className="text-red-600 font-extrabold">PORTAL</span>
              </span>
              <span className="text-[10px] text-gray-500 font-medium tracking-widest uppercase mt-0.5">
                Assessment System
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {!isAuthenticated ? (
              /* Guest / Public Links ONLY */
              <>
                <button
                  onClick={() => scrollToSection('features')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-red-600" />
                  Features
                </button>

                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />
                  How It Works
                </button>
              </>
            ) : (
              /* Authenticated User Links */
              <>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      isActive('/admin')
                        ? 'bg-red-50 text-red-700 border border-red-200 font-semibold shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    Admin Panel
                  </Link>
                )}

                <Link
                  to="/exams"
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive('/exams')
                      ? 'bg-red-50 text-red-700 border border-red-200 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-red-600" />
                  Exams
                </Link>

                {isStaff && (
                  <>
                    <Link
                      to="/question-bank"
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        isActive('/question-bank')
                          ? 'bg-red-50 text-red-700 border border-red-200 font-semibold shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-red-600" />
                      Question Bank
                    </Link>

                    <Link
                      to="/exam-builder"
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        isActive('/exam-builder')
                          ? 'bg-red-50 text-red-700 border border-red-200 font-semibold shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-red-600" />
                      Exam Builder
                    </Link>

                    <Link
                      to="/grading"
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        isActive('/grading')
                          ? 'bg-red-50 text-red-700 border border-red-200 font-semibold shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Manual Grading
                    </Link>
                  </>
                )}

                <Link
                  to={getRoleDashboard(user.role)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive(getRoleDashboard(user.role))
                      ? 'bg-red-50 text-red-700 border border-red-200 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-red-600" />
                  My Dashboard
                </Link>
              </>
            )}
          </div>

          {/* User Auth State */}
          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="w-20 h-7 rounded-xl bg-gray-100 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                {/* User Pill */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                  <User className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-gray-900 font-semibold text-xs">{user.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold border ${getRoleBadgeStyle(user.role)}`}>
                    {user.role}
                  </span>
                </div>

                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 hover:bg-rose-50 hover:border-rose-200 text-gray-700 hover:text-rose-600 text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
                  title="Sign out of user account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-red-600 text-red-600 hover:bg-red-50 text-xs font-semibold transition-all duration-200 flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Link>

                <Link
                  to="/register"
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm shadow-red-600/20 hover:-translate-y-0.5 transition-all duration-200"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900"
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-gray-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg">
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => scrollToSection('features')}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <Layers className="w-4 h-4 text-red-600" />
                Features
              </button>

              <button
                onClick={() => scrollToSection('how-it-works')}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <CheckCircle2 className="w-4 h-4 text-red-600" />
                How It Works
              </button>
            </>
          ) : (
            <>
              <Link
                to="/exams"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <BookOpen className="w-4 h-4 text-red-600" />
                Exams List
              </Link>

              {isStaff && (
                <>
                  <Link
                    to="/question-bank"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <HelpCircle className="w-4 h-4 text-red-600" />
                    Question Bank
                  </Link>

                  <Link
                    to="/exam-builder"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Sparkles className="w-4 h-4 text-red-600" />
                    Exam Builder
                  </Link>

                  <Link
                    to="/grading"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    Manual Grading
                  </Link>
                </>
              )}

              <Link
                to={getRoleDashboard(user.role)}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <LayoutDashboard className="w-4 h-4 text-red-600" />
                My Dashboard
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
