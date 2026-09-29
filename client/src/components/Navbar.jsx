import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  LogIn, 
  LogOut, 
  User, 
  Sparkles, 
  FileCheck, 
  Menu, 
  X,
  Layers,
  CheckCircle2,
  ShieldAlert,
  HelpCircle
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
      setScrolled(window.scrollY > 10);
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
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'teacher':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'student':
      default:
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
    }
  };

  return (
    <nav 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#0b0a26]/95 backdrop-blur-md border-b border-amber-500/20 shadow-lg shadow-black/40 py-3' 
          : 'bg-[#0b0a26]/80 backdrop-blur-sm border-b border-amber-500/15 py-4'
      }`}
    >
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm group-hover:scale-105 group-hover:border-amber-400 transition-all duration-200">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-white tracking-wide leading-none">
                EXAM<span className="text-amber-400 font-extrabold">PORTAL</span>
              </span>
              <span className="text-[10px] text-indigo-200/60 font-medium tracking-widest uppercase mt-0.5">
                Assessment System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => scrollToSection('features')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-indigo-200/80 hover:text-white hover:bg-indigo-900/40 transition-all duration-200 flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Features
                </button>

                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-indigo-200/80 hover:text-white hover:bg-indigo-900/40 transition-all duration-200 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  How It Works
                </button>
              </>
            ) : (
              <>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      isActive('/admin')
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold shadow-sm'
                        : 'text-indigo-200/80 hover:text-white hover:bg-indigo-900/40'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Admin Panel
                  </Link>
                )}

                <Link
                  to="/exams"
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive('/exams')
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold shadow-sm'
                      : 'text-indigo-200/80 hover:text-white hover:bg-indigo-900/40'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  Exams
                </Link>

                {isStaff && (
                  <>
                    <Link
                      to="/question-bank"
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        isActive('/question-bank')
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold shadow-sm'
                          : 'text-indigo-200/80 hover:text-white hover:bg-indigo-900/40'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      Question Bank
                    </Link>

                    <Link
                      to="/exam-builder"
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        isActive('/exam-builder')
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold shadow-sm'
                          : 'text-indigo-200/80 hover:text-white hover:bg-indigo-900/40'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Exam Builder
                    </Link>

                    <Link
                      to="/grading"
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        isActive('/grading')
                          ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold shadow-sm'
                          : 'text-indigo-200/80 hover:text-white hover:bg-indigo-900/40'
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5 text-teal-400" />
                      Manual Grading
                    </Link>
                  </>
                )}

                <Link
                  to={getRoleDashboard(user.role)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive(getRoleDashboard(user.role))
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold shadow-sm'
                      : 'text-indigo-200/80 hover:text-white hover:bg-indigo-900/40'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                  My Dashboard
                </Link>
              </>
            )}
          </div>

          {/* User Auth State */}
          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="w-20 h-7 rounded-xl bg-indigo-900/50 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                {/* User Pill */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-900/40 border border-amber-500/20 text-xs">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-white font-semibold text-xs">{user.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold border ${getRoleBadgeStyle(user.role)}`}>
                    {user.role}
                  </span>
                </div>

                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-xl bg-indigo-900/40 border border-indigo-700/50 hover:bg-rose-500/15 hover:border-rose-500/40 text-indigo-200 hover:text-rose-300 text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
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
                  className="px-3.5 py-1.5 rounded-xl bg-transparent border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-semibold transition-all duration-200 flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Link>

                <Link
                  to="/register"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:scale-[1.02] transition-all duration-200"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl bg-indigo-900/40 border border-indigo-700/50 text-indigo-200 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-amber-500/20 bg-[#0b0a26] px-4 pt-3 pb-6 space-y-2 shadow-2xl">
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => scrollToSection('features')}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-indigo-200 hover:bg-indigo-900/50"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                Features
              </button>

              <button
                onClick={() => scrollToSection('how-it-works')}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-indigo-200 hover:bg-indigo-900/50"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                How It Works
              </button>
            </>
          ) : (
            <>
              <Link
                to="/exams"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-indigo-200 hover:bg-indigo-900/50"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                Exams List
              </Link>

              {isStaff && (
                <>
                  <Link
                    to="/question-bank"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-indigo-200 hover:bg-indigo-900/50"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    Question Bank
                  </Link>

                  <Link
                    to="/exam-builder"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-indigo-200 hover:bg-indigo-900/50"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Exam Builder
                  </Link>

                  <Link
                    to="/grading"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-indigo-200 hover:bg-indigo-900/50"
                  >
                    <FileCheck className="w-4 h-4 text-teal-400" />
                    Manual Grading
                  </Link>
                </>
              )}

              <Link
                to={getRoleDashboard(user.role)}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-indigo-200 hover:bg-indigo-900/50"
              >
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                My Dashboard
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
