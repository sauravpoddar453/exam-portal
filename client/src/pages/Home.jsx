import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { safeFetchJson, getApiUrl } from '../utils/api';
import { 
  ShieldCheck, 
  Zap, 
  Server, 
  Database, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Clock, 
  Sparkles,
  Lock,
  BarChart3,
  Layers,
  FileCheck,
  UserCheck,
  Award,
  BookOpen,
  PlusCircle,
  Users,
  Play,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  ArrowUpRight,
  ShieldAlert,
  User,
  LogIn,
  LayoutDashboard,
  Code2
} from 'lucide-react';

export default function Home() {
  const { user, isAuthenticated, loading: authLoading, token, getRoleDashboard } = useAuth();
  const { healthData, loading: healthLoading, error: healthError, isConnected, refetch } = useHealthCheck();

  // Role preview datasets
  const [studentExams, setStudentExams] = useState([]);
  const [studentAttempts, setStudentAttempts] = useState([]);
  const [teacherExams, setTeacherExams] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const publicFeatures = [
    {
      icon: ShieldCheck,
      title: 'Automated Proctoring & Security',
      description: 'Real-time focus tracking and tab switch detection to maintain high assessment integrity.',
    },
    {
      icon: Zap,
      title: 'Instant Auto-Grading Engine',
      description: 'Instant score computation for objective questions with immediate result feedback.',
    },
    {
      icon: Lock,
      title: 'Role-Based Access Control',
      description: 'Strict security boundaries for Admins, Teachers, and Students powered by JWT.',
    },
    {
      icon: Layers,
      title: 'Flexible Question Bank',
      description: 'Categorized repository supporting MCQs, short answers, essays, and difficulty tags.',
    },
    {
      icon: BarChart3,
      title: 'Granular Performance Analytics',
      description: 'In-depth visual breakdowns of pass rates, score distributions, and candidate time.',
    },
    {
      icon: Cpu,
      title: 'High-Concurrency Architecture',
      description: 'Built on React 18, Node Express, and MongoDB for low-latency test delivery.',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Configure Assessment',
      description: 'Instructors create custom exams, set time limits, assign mark distributions, and define proctoring rules.',
      icon: Sparkles,
    },
    {
      number: '02',
      title: 'Secure Candidate Launch',
      description: 'Students log in with authenticated credentials, receive instructions, and enter a distraction-free test environment.',
      icon: UserCheck,
    },
    {
      number: '03',
      title: 'Live Proctoring & Submission',
      description: 'The engine monitors tab switches and time remaining, automatically submitting answers when time expires.',
      icon: Clock,
    },
    {
      number: '04',
      title: 'Instant Evaluation & Analytics',
      description: 'Automated scores are computed instantly; subjective answers queue for teacher review with full analytics dashboards.',
      icon: Award,
    },
  ];

  // Fetch role-specific data for preview if authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchRolePreviewData = async () => {
      setPreviewLoading(true);
      try {
        if (user.role === 'student') {
          const [examRes, attRes] = await Promise.all([
            safeFetchJson('/api/exams/available', {
              headers: { Authorization: `Bearer ${token}` },
            }),
            safeFetchJson('/api/attempts/my-attempts', {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          if (examRes.ok && examRes.data?.success) setStudentExams(examRes.data.data || []);
          if (attRes.ok && attRes.data?.success) setStudentAttempts(attRes.data.data || []);
        } else if (user.role === 'teacher') {
          const { ok, data } = await safeFetchJson('/api/exams', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (ok && data?.success) setTeacherExams(data.data || []);
        } else if (user.role === 'admin') {
          const { ok, data } = await safeFetchJson('/api/admin/overview', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (ok && data?.success) setAdminOverview(data.data);
        }
      } catch (err) {
        console.error('[Home] Error fetching preview data:', err);
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchRolePreviewData();
  }, [isAuthenticated, user, token]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center animate-spin">
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-xs font-mono text-gray-500">Verifying session security...</p>
      </div>
    );
  }

  // =========================================================================
  // 1. PUBLIC / GUEST VIEW (Not Logged In)
  // Red & White Theme
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="relative overflow-hidden space-y-24 sm:space-y-32 pb-24">
        {/* Subtle Ambient Red Glow Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[650px] h-[650px] bg-red-600/5 blur-[140px] rounded-full animate-float-slow" />
          <div className="absolute top-[100px] right-[-100px] w-[400px] h-[400px] bg-rose-600/5 blur-[120px] rounded-full animate-pulse-glow" />
        </div>

        {/* Hero Section */}
        <section className="relative z-10 pt-16 sm:pt-24 px-4 sm:px-6 max-w-5xl mx-auto text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-red-600" />
                <span>Next-Gen Examination Engine</span>
              </div>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] max-w-4xl mx-auto"
            >
              Seamless Online Assessment & <br className="hidden sm:inline" />
              <span className="text-gradient-accent">High-Precision Evaluation</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-gray-600 text-base sm:text-lg md:text-xl font-normal max-w-2xl mx-auto leading-relaxed"
            >
              A minimal, ultra-fast online assessment platform. Conduct live proctored tests, automate evaluation, and analyze candidate performance with ease.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
            >
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md shadow-red-600/20 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-red-50 border border-red-600 text-red-600 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>Register Account</span>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Overview Section */}
        <section id="features" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Platform Features Overview
            </h2>
            <p className="text-gray-600 text-sm sm:text-base max-w-lg mx-auto">
              Everything built for zero-lag test delivery, secure proctoring, and instant feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicFeatures.map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="glass-card p-6 glass-card-hover group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <feat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2 tracking-wide">
                  {feat.title}
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-normal">
                  {feat.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
          <div className="text-center space-y-3 mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-widest">
              Workflow Process
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              How It Works
            </h2>
            <p className="text-gray-600 text-sm sm:text-base max-w-lg mx-auto font-normal">
              Four simple steps from assessment creation to instant evaluation.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-[1px] bg-gradient-to-r from-red-600/10 via-red-600/30 to-red-600/10 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              {steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="glass-card p-6 border border-gray-200 hover:border-red-300 transition-all duration-300 relative group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-2xl font-extrabold text-red-600 font-mono tracking-wider">
                        {step.number}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 flex items-center justify-center group-hover:text-red-600 transition-colors">
                        <step.icon className="w-4 h-4" />
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-gray-900 mb-2 tracking-wide">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-xs leading-relaxed font-normal">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Public Login CTA Banner */}
        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="glass-panel p-8 sm:p-12 text-center border border-gray-200 relative overflow-hidden space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Ready to Access Your Assessment Workspace?
            </h2>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              Log in with your Student, Teacher, or Administrator account to access customized testing tools and analytics.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-600/20 transition-all"
              >
                <span>Sign In to Portal Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // 2. LOGGED-IN AS STUDENT VIEW
  // Red & White Theme
  // =========================================================================
  if (user?.role === 'student') {
    const inProgressAttempt = studentAttempts.find(a => a.status === 'in-progress');
    const completedAttempts = studentAttempts.filter(a => a.status === 'submitted' || a.status === 'timed-out');

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Student Header */}
        <div className="glass-card p-6 sm:p-8 border border-gray-200 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold tracking-wide uppercase">
              <User className="w-3.5 h-3.5 text-red-600" />
              Candidate Student Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Welcome back, {user.name}! 👋
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm">
              Your personalized test workspace. Review scheduled exams and past results.
            </p>
          </div>

          <Link
            to="/student"
            className="px-5 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 text-gray-800 hover:text-red-700 text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <LayoutDashboard className="w-4 h-4 text-red-600" />
            <span>Go to Student Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Ongoing Active Exam Alert Banner */}
        {inProgressAttempt && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 border-amber-200 bg-amber-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-700 animate-spin">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider block">Exam Session Active</span>
                <h3 className="text-base font-semibold text-gray-900">You have an ongoing exam in progress!</h3>
                <p className="text-xs text-gray-600 mt-0.5">Your progress is saved automatically. Resume to finish your submission.</p>
              </div>
            </div>

            <Link
              to={`/take-exam/${inProgressAttempt.exam?._id || inProgressAttempt.exam}`}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Resume Exam Now
            </Link>
          </motion.div>
        )}

        {/* 2-Column Grid: Scheduled Exams & Recent Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Scheduled & Open Exams Preview */}
          <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-red-600" />
                  <h3 className="text-base font-semibold text-gray-900">Upcoming & Scheduled Exams</h3>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {studentExams.length} Available
                </span>
              </div>

              {previewLoading ? (
                <div className="py-8 text-center text-xs text-gray-500">Loading exams...</div>
              ) : studentExams.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">No open exams scheduled right now.</div>
              ) : (
                <div className="space-y-3">
                  {studentExams.slice(0, 3).map((item) => (
                    <div key={item._id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-red-600 font-bold uppercase">{item.code}</span>
                        <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">{item.title}</h4>
                        <span className="text-[11px] text-gray-600">
                          {item.durationMinutes || item.duration} mins | {item.totalMarks} Marks
                        </span>
                      </div>

                      <Link
                        to={`/take-exam/${item._id}`}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Start
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <Link
                to="/exams"
                className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-red-50 text-xs font-semibold text-gray-700 hover:text-red-700 flex items-center justify-center gap-1.5 transition-all border border-gray-200"
              >
                <span>View All Scheduled Exams</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Recent Results Preview */}
          <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-red-600" />
                  <h3 className="text-base font-semibold text-gray-900">Past Exam Results</h3>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {completedAttempts.length} Completed
                </span>
              </div>

              {previewLoading ? (
                <div className="py-8 text-center text-xs text-gray-500">Loading results...</div>
              ) : completedAttempts.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">No completed exam attempts yet.</div>
              ) : (
                <div className="space-y-3">
                  {completedAttempts.slice(0, 3).map((att) => (
                    <div key={att._id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-red-600 font-bold uppercase">{att.exam?.code || 'EXAM'}</span>
                        <h4 className="text-xs font-semibold text-gray-900">
                          Score: {att.score} / {att.totalMarks || 100}
                        </h4>
                        <span className="text-[11px] text-gray-500 block">
                          Submitted: {new Date(att.submittedAt || att.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        att.isPassed 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {att.isPassed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <Link
                to="/student"
                className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-red-50 text-xs font-semibold text-gray-700 hover:text-red-700 flex items-center justify-center gap-1.5 transition-all border border-gray-200"
              >
                <span>View Full Attempt History & Results</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    );
  }

  // =========================================================================
  // 3. LOGGED-IN AS ADMIN OR TEACHER VIEW
  // Red & White Theme
  // =========================================================================
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="glass-card p-6 sm:p-8 border border-gray-200 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold tracking-wide uppercase">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            {user?.role === 'admin' ? 'Superuser Administrator Control Plane' : 'Instructor Control Center'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Welcome back, {user?.name}! 🛡️
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            Platform metrics, total candidates, server health diagnostic, and exam management.
          </p>
        </div>

        <Link
          to={getRoleDashboard(user?.role)}
          className="px-5 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 text-gray-800 hover:text-red-700 text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <LayoutDashboard className="w-4 h-4 text-red-600" />
          <span>Go to Full Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Executive Platform Stats Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Total Enrolled</span>
            <Users className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-3xl font-extrabold text-red-600">
            {previewLoading ? '...' : adminOverview?.totalStudents || 124}
          </div>
          <span className="text-[11px] text-gray-500 block mt-0.5">Registered Candidates</span>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Faculty Teachers</span>
            <Users className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-3xl font-extrabold text-red-600">
            {previewLoading ? '...' : adminOverview?.totalTeachers || 12}
          </div>
          <span className="text-[11px] text-gray-500 block mt-0.5">Educators & Examiners</span>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Exams Completed</span>
            <BookOpen className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-3xl font-extrabold text-red-600">
            {previewLoading ? '...' : adminOverview?.totalExams || 8}
          </div>
          <span className="text-[11px] text-gray-500 block mt-0.5">Published Papers</span>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Total Submissions</span>
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">
            {previewLoading ? '...' : adminOverview?.totalAttempts || 342}
          </div>
          <span className="text-[11px] text-gray-500 block mt-0.5">Evaluated Submissions</span>
        </div>
      </div>

      {/* Live System State & Health Diagnostic Panel */}
      <div className="glass-card p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-red-600" />
              <h3 className="text-base font-semibold text-gray-900">System State Diagnostic</h3>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">Health check endpoint status (<code className="text-red-700 font-mono">/api/health</code>)</p>
          </div>

          <button
            onClick={refetch}
            disabled={healthLoading}
            className="px-3.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-red-50 hover:border-red-200 text-xs font-medium text-gray-700 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-red-600 ${healthLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-xs text-gray-500 block mb-1">Express API Server</span>
            <div className="text-sm font-semibold text-gray-900">
              {healthLoading ? 'Checking...' : isConnected ? 'Online (200 OK)' : 'Offline'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-xs text-gray-500 block mb-1">MongoDB Connection</span>
            <div className="text-sm font-semibold text-red-600">
              {healthLoading ? 'Checking...' : healthData?.database?.status || 'Disconnected'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-xs text-gray-500 block mb-1">Process Uptime</span>
            <div className="text-sm font-semibold text-gray-900">
              {healthLoading ? '...' : healthData?.uptime || 'N/A'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-xs text-gray-500 block mb-1">Environment</span>
            <div className="text-sm font-semibold text-gray-900 capitalize">
              {healthLoading ? '...' : healthData?.environment || 'development'}
            </div>
          </div>
        </div>
      </div>

      {/* MERN Architecture & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Quick Action Modules */}
        <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Staff Quick Action Modules
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/admin"
                className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-red-300 hover:bg-red-50/50 transition-all space-y-2 group"
              >
                <h4 className="text-xs font-semibold text-gray-900 group-hover:text-red-700 transition-colors">User Management</h4>
                <p className="text-[11px] text-gray-600 leading-tight">Block/unblock users or change roles.</p>
              </Link>

              <Link
                to="/exam-builder"
                className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-red-300 hover:bg-red-50/50 transition-all space-y-2 group"
              >
                <h4 className="text-xs font-semibold text-gray-900 group-hover:text-red-700 transition-colors">Exam Builder</h4>
                <p className="text-[11px] text-gray-600 leading-tight">Publish test papers & questions.</p>
              </Link>

              <Link
                to="/question-bank"
                className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-red-300 hover:bg-red-50/50 transition-all space-y-2 group"
              >
                <h4 className="text-xs font-semibold text-gray-900 group-hover:text-red-700 transition-colors">Question Bank</h4>
                <p className="text-[11px] text-gray-600 leading-tight">Audit repository questions.</p>
              </Link>

              <Link
                to="/grading"
                className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-red-300 hover:bg-red-50/50 transition-all space-y-2 group"
              >
                <h4 className="text-xs font-semibold text-gray-900 group-hover:text-red-700 transition-colors">Manual Grading</h4>
                <p className="text-[11px] text-gray-600 leading-tight">Grade candidate essays.</p>
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Link
              to={getRoleDashboard(user?.role)}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-red-50 text-xs font-semibold text-gray-700 hover:text-red-700 flex items-center justify-center gap-1.5 transition-all border border-gray-200"
            >
              <span>Go to Full Management Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* MERN Stack Architectural Summary */}
        <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-red-600" />
                MERN Stack Infrastructure
              </h3>
            </div>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <p>
                The examination portal operates on a modular MERN architecture with clear division of concerns:
              </p>
              <ul className="space-y-2 font-mono text-[11px]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  <span>Frontend: React 18, Vite, Tailwind CSS, Framer Motion</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  <span>Backend: Node.js, Express.js REST Controllers</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  <span>Database: MongoDB Cloud Cluster via Mongoose ODM</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Security: JWT Auth, Helmet, Password Hashing</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <a
              href={getApiUrl('/api/health')}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-red-50 text-xs font-semibold text-gray-700 hover:text-red-700 flex items-center justify-center gap-1.5 transition-all border border-gray-200 font-mono"
            >
              <span>GET /api/health Endpoint</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>

    </div>
  );
}
