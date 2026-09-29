import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { safeFetchJson, getApiUrl } from '../utils/api';
import AnimatedCounter from '../components/AnimatedCounter';
import BrandedLoader from '../components/BrandedLoader';
import { 
  ShieldCheck, 
  Zap, 
  Server, 
  ArrowRight, 
  RefreshCw, 
  Cpu, 
  Clock, 
  Sparkles,
  Lock,
  BarChart3,
  Layers,
  UserCheck,
  Award,
  BookOpen,
  Users,
  Play,
  RotateCcw,
  ArrowUpRight,
  ShieldAlert,
  User,
  LogIn,
  LayoutDashboard,
  Code2,
  Mail,
  Phone
} from 'lucide-react';

export default function Home() {
  const { user, isAuthenticated, loading: authLoading, token, getRoleDashboard } = useAuth();
  const { healthData, loading: healthLoading, isConnected, refetch } = useHealthCheck();

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

  if (authLoading) {
    return <BrandedLoader message="Verifying session security..." />;
  }

  // =========================================================================
  // 1. PUBLIC / GUEST VIEW (Not Logged In)
  // Deep Indigo & Amber Theme (Full Width Container Layout)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="w-full relative overflow-hidden space-y-20 sm:space-y-28 pb-20">
        {/* Ambient Glow Background - Spans full screen width */}
        <div className="absolute top-0 left-0 right-0 w-full h-[700px] pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-amber-500/10 blur-[160px] rounded-full animate-float-slow" />
          <div className="absolute top-[100px] right-[-100px] w-[700px] h-[600px] bg-teal-500/10 blur-[150px] rounded-full animate-pulse-glow" />
        </div>

        {/* Hero Section - Full Viewport Width & Height */}
        <section className="relative z-10 min-h-[calc(100vh-6rem)] flex flex-col justify-center items-center pt-12 pb-16 px-4 sm:px-8 lg:px-12 xl:px-16 w-full text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 w-full max-w-6xl mx-auto flex flex-col items-center justify-center"
          >
            <motion.div variants={itemVariants} className="inline-flex">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide uppercase shadow-lg shadow-amber-500/5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Next-Gen Examination Engine</span>
              </div>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tight leading-[1.08] w-full"
            >
              Seamless Online Assessment & <br className="hidden sm:inline" />
              <span className="text-gradient-amber">High-Precision Evaluation</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-indigo-200/85 text-lg sm:text-xl md:text-2xl font-normal max-w-4xl mx-auto leading-relaxed"
            >
              A minimal, ultra-fast online assessment platform. Conduct live proctored tests, automate evaluation, and analyze candidate performance with ease.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4 w-full sm:w-auto"
            >
              <Link
                to="/login"
                className="w-full sm:w-auto px-10 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-base shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2.5 group cursor-pointer"
              >
                <LogIn className="w-5 h-5" />
                <span>Sign In to Portal</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/register"
                className="w-full sm:w-auto px-10 py-4 rounded-xl bg-indigo-900/50 hover:bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>Register Account</span>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Overview Section - Spans Full Screen Width */}
        <section id="features" className="relative z-10 w-full px-4 sm:px-8 lg:px-12 xl:px-16 scroll-mt-24">
          <div className="text-center space-y-3 mb-14">
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Platform Features Overview
            </h2>
            <p className="text-indigo-200/70 text-base sm:text-lg max-w-2xl mx-auto">
              Everything built for zero-lag test delivery, secure proctoring, and instant feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {publicFeatures.map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="glass-card p-8 glass-card-hover group border border-amber-500/15 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3 tracking-wide">
                    {feat.title}
                  </h3>
                  <p className="text-indigo-200/75 text-sm leading-relaxed font-normal">
                    {feat.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How It Works Section - Spans Full Screen Width */}
        <section id="how-it-works" className="relative z-10 w-full px-4 sm:px-8 lg:px-12 xl:px-16 scroll-mt-24">
          <div className="text-center space-y-3 mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-xs font-semibold uppercase tracking-widest">
              Workflow Process
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
              How It Works
            </h2>
            <p className="text-indigo-200/70 text-base sm:text-lg max-w-2xl mx-auto font-normal">
              Four simple steps from assessment creation to instant evaluation.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-12 right-12 h-[1px] bg-gradient-to-r from-amber-500/10 via-amber-500/30 to-amber-500/10 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              {steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="glass-card p-8 border border-amber-500/15 hover:border-amber-400/40 transition-all duration-300 relative group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-3xl font-extrabold text-amber-400 font-mono tracking-wider">
                        {step.number}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 flex items-center justify-center group-hover:text-amber-400 transition-colors">
                        <step.icon className="w-5 h-5" />
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-white mb-3 tracking-wide">
                      {step.title}
                    </h3>
                    <p className="text-indigo-200/75 text-sm leading-relaxed font-normal">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Public Login CTA Banner - Full Width Container */}
        <section className="relative z-10 w-full px-4 sm:px-8 lg:px-12 xl:px-16">
          <div className="glass-panel p-10 sm:p-16 text-center border border-amber-500/20 relative overflow-hidden space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Ready to Access Your Assessment Workspace?
            </h2>
            <p className="text-indigo-200/75 text-base max-w-xl mx-auto">
              Log in with your Student, Teacher, or Administrator account to access customized testing tools and analytics.
            </p>
            <div className="pt-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer"
              >
                <span>Sign In to Portal Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Developer & Lead Author Card - Full Width Container */}
        <section className="relative z-10 w-full px-4 sm:px-8 lg:px-12 xl:px-16">
          <div className="glass-card p-8 sm:p-10 border border-amber-500/25 bg-gradient-to-br from-indigo-900/60 via-indigo-950/80 to-indigo-900/60 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-500 text-indigo-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20 shrink-0">
                SP
              </div>
              <div className="text-left space-y-1">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block">Project Lead & Developer</span>
                <h3 className="text-xl font-bold text-white">Saurav Poddar</h3>
                <p className="text-sm text-indigo-200/75">Architect & Full-Stack Creator of ExamPortal</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <a
                href="mailto:sauravpoddarengg@gmail.com"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-indigo-900/40 border border-amber-500/20 hover:border-amber-400 hover:bg-amber-500/10 text-xs sm:text-sm font-semibold text-indigo-200 hover:text-amber-300 transition-all flex items-center justify-center gap-2.5"
              >
                <Mail className="w-4 h-4 text-teal-400" />
                <span>sauravpoddarengg@gmail.com</span>
              </a>

              <a
                href="tel:9693281811"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-indigo-900/40 border border-amber-500/20 hover:border-amber-400 hover:bg-amber-500/10 text-xs sm:text-sm font-semibold text-indigo-200 hover:text-amber-300 transition-all flex items-center justify-center gap-2.5 font-mono"
              >
                <Phone className="w-4 h-4 text-teal-400" />
                <span>+91 9693281811</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // 2. LOGGED-IN AS STUDENT VIEW
  // Deep Indigo & Amber Theme
  // =========================================================================
  if (user?.role === 'student') {
    const inProgressAttempt = studentAttempts.find(a => a.status === 'in-progress');
    const completedAttempts = studentAttempts.filter(a => a.status === 'submitted' || a.status === 'timed-out');

    return (
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8 space-y-8">
        {/* Student Header */}
        <div className="glass-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-amber-500/15">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide uppercase">
              <User className="w-3.5 h-3.5 text-amber-400" />
              Candidate Student Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, {user.name}! 👋
            </h1>
            <p className="text-indigo-200/70 text-xs sm:text-sm">
              Your personalized test workspace. Review scheduled exams and past results.
            </p>
          </div>

          <Link
            to="/student"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-md shadow-amber-500/20"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to Student Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Ongoing Active Exam Alert Banner */}
        {inProgressAttempt && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 border-amber-500/40 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 animate-spin">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">Exam Session Active</span>
                <h3 className="text-base font-semibold text-white">You have an ongoing exam in progress!</h3>
                <p className="text-xs text-indigo-200/70 mt-0.5">Your progress is saved automatically. Resume to finish your submission.</p>
              </div>
            </div>

            <Link
              to={`/take-exam/${inProgressAttempt.exam?._id || inProgressAttempt.exam}`}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Resume Exam Now
            </Link>
          </motion.div>
        )}

        {/* 2-Column Grid: Scheduled Exams & Recent Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Scheduled & Open Exams Preview */}
          <div className="glass-card p-6 space-y-4 flex flex-col justify-between border border-amber-500/15">
            <div>
              <div className="flex items-center justify-between border-b border-indigo-900/60 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-semibold text-white">Upcoming & Scheduled Exams</h3>
                </div>
                <span className="text-xs text-indigo-300 font-mono">
                  <AnimatedCounter value={studentExams.length} /> Available
                </span>
              </div>

              {previewLoading ? (
                <BrandedLoader message="Loading available exams..." />
              ) : studentExams.length === 0 ? (
                <div className="py-8 text-center text-xs text-indigo-300/60">No open exams scheduled right now.</div>
              ) : (
                <div className="space-y-3">
                  {studentExams.slice(0, 3).map((item) => (
                    <div key={item._id} className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/60 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">{item.code}</span>
                        <h4 className="text-xs font-semibold text-white line-clamp-1">{item.title}</h4>
                        <span className="text-[11px] text-indigo-200/60">
                          {item.durationMinutes || item.duration} mins | {item.totalMarks} Marks
                        </span>
                      </div>

                      <Link
                        to={`/take-exam/${item._id}`}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-indigo-950 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Start
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-indigo-900/60">
              <Link
                to="/exams"
                className="w-full py-2.5 rounded-xl bg-indigo-900/40 hover:bg-amber-500/10 text-xs font-semibold text-indigo-200 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-all border border-amber-500/20"
              >
                <span>View All Scheduled Exams</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Recent Results Preview */}
          <div className="glass-card p-6 space-y-4 flex flex-col justify-between border border-amber-500/15">
            <div>
              <div className="flex items-center justify-between border-b border-indigo-900/60 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-semibold text-white">Past Exam Results</h3>
                </div>
                <span className="text-xs text-indigo-300 font-mono">
                  <AnimatedCounter value={completedAttempts.length} /> Completed
                </span>
              </div>

              {previewLoading ? (
                <BrandedLoader message="Loading exam results..." />
              ) : completedAttempts.length === 0 ? (
                <div className="py-8 text-center text-xs text-indigo-300/60">No completed exam attempts yet.</div>
              ) : (
                <div className="space-y-3">
                  {completedAttempts.slice(0, 3).map((att) => (
                    <div key={att._id} className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/60 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">{att.exam?.code || 'EXAM'}</span>
                        <h4 className="text-xs font-semibold text-white">
                          Score: {att.score} / {att.totalMarks || 100}
                        </h4>
                        <span className="text-[11px] text-indigo-300/60 block">
                          Submitted: {new Date(att.submittedAt || att.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        att.isPassed 
                          ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}>
                        {att.isPassed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-indigo-900/60">
              <Link
                to="/student"
                className="w-full py-2.5 rounded-xl bg-indigo-900/40 hover:bg-amber-500/10 text-xs font-semibold text-indigo-200 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-all border border-amber-500/20"
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
  // Deep Indigo & Amber Theme
  // =========================================================================
  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="glass-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-amber-500/15">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide uppercase">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            {user?.role === 'admin' ? 'Superuser Administrator Control Plane' : 'Instructor Control Center'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome back, {user?.name}! 🛡️
          </h1>
          <p className="text-indigo-200/70 text-xs sm:text-sm">
            Platform metrics, total candidates, server health diagnostic, and exam management.
          </p>
        </div>

        <Link
          to={getRoleDashboard(user?.role)}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap shadow-md shadow-amber-500/20"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Go to Full Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Executive Platform Stats Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5 border border-amber-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-300">Total Enrolled</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {previewLoading ? '...' : <AnimatedCounter value={adminOverview?.totalStudents || 124} />}
          </div>
          <span className="text-[11px] text-indigo-200/60 block mt-0.5">Registered Candidates</span>
        </div>

        <div className="glass-card p-5 border border-amber-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-300">Faculty Teachers</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {previewLoading ? '...' : <AnimatedCounter value={adminOverview?.totalTeachers || 12} />}
          </div>
          <span className="text-[11px] text-indigo-200/60 block mt-0.5">Educators & Examiners</span>
        </div>

        <div className="glass-card p-5 border border-amber-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-300">Exams Completed</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {previewLoading ? '...' : <AnimatedCounter value={adminOverview?.totalExams || 8} />}
          </div>
          <span className="text-[11px] text-indigo-200/60 block mt-0.5">Published Papers</span>
        </div>

        <div className="glass-card p-5 border border-amber-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-300">Total Submissions</span>
            <BarChart3 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold text-teal-400 font-mono">
            {previewLoading ? '...' : <AnimatedCounter value={adminOverview?.totalAttempts || 342} />}
          </div>
          <span className="text-[11px] text-indigo-200/60 block mt-0.5">Evaluated Submissions</span>
        </div>
      </div>

      {/* Live System State & Health Diagnostic Panel */}
      <div className="glass-card p-6 border border-amber-500/15">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-indigo-900/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-semibold text-white">System State Diagnostic</h3>
            </div>
            <p className="text-xs text-indigo-200/70 mt-0.5">Health check endpoint status (<code className="text-amber-300 font-mono">/api/health</code>)</p>
          </div>

          <button
            onClick={refetch}
            disabled={healthLoading}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-900/40 border border-amber-500/20 hover:bg-amber-500/10 text-xs font-medium text-indigo-200 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${healthLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/60">
            <span className="text-xs text-indigo-300/80 block mb-1">Express API Server</span>
            <div className="text-sm font-semibold text-teal-300">
              {healthLoading ? 'Checking...' : isConnected ? 'Online (200 OK)' : 'Offline'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/60">
            <span className="text-xs text-indigo-300/80 block mb-1">MongoDB Connection</span>
            <div className="text-sm font-semibold text-amber-400">
              {healthLoading ? 'Checking...' : healthData?.database?.status || 'Disconnected'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/60">
            <span className="text-xs text-indigo-300/80 block mb-1">Process Uptime</span>
            <div className="text-sm font-semibold text-white">
              {healthLoading ? '...' : healthData?.uptime || 'N/A'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/60">
            <span className="text-xs text-indigo-300/80 block mb-1">Environment</span>
            <div className="text-sm font-semibold text-white capitalize">
              {healthLoading ? '...' : healthData?.environment || 'development'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Quick Action Modules */}
        <div className="glass-card p-6 space-y-4 flex flex-col justify-between border border-amber-500/15">
          <div>
            <div className="border-b border-indigo-900/60 pb-4 mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Staff Quick Action Modules
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/admin"
                className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-900/60 hover:border-amber-500/40 hover:bg-indigo-900/40 transition-all space-y-2 group"
              >
                <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">User Management</h4>
                <p className="text-[11px] text-indigo-200/70 leading-tight">Block/unblock users or change roles.</p>
              </Link>

              <Link
                to="/exam-builder"
                className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-900/60 hover:border-amber-500/40 hover:bg-indigo-900/40 transition-all space-y-2 group"
              >
                <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">Exam Builder</h4>
                <p className="text-[11px] text-indigo-200/70 leading-tight">Publish test papers & questions.</p>
              </Link>

              <Link
                to="/question-bank"
                className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-900/60 hover:border-amber-500/40 hover:bg-indigo-900/40 transition-all space-y-2 group"
              >
                <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">Question Bank</h4>
                <p className="text-[11px] text-indigo-200/70 leading-tight">Audit repository questions.</p>
              </Link>

              <Link
                to="/grading"
                className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-900/60 hover:border-amber-500/40 hover:bg-indigo-900/40 transition-all space-y-2 group"
              >
                <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">Manual Grading</h4>
                <p className="text-[11px] text-indigo-200/70 leading-tight">Grade candidate essays.</p>
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-indigo-900/60">
            <Link
              to={getRoleDashboard(user?.role)}
              className="w-full py-2.5 rounded-xl bg-indigo-900/40 hover:bg-amber-500/10 text-xs font-semibold text-indigo-200 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-all border border-amber-500/20"
            >
              <span>Go to Full Management Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Infrastructure Summary */}
        <div className="glass-card p-6 space-y-4 flex flex-col justify-between border border-amber-500/15">
          <div>
            <div className="border-b border-indigo-900/60 pb-4 mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                MERN Stack Infrastructure
              </h3>
            </div>

            <div className="space-y-3 text-xs text-indigo-200/80 leading-relaxed">
              <p>
                The examination portal operates on a modular MERN architecture with clear division of concerns:
              </p>
              <ul className="space-y-2 font-mono text-[11px]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Frontend: React 18, Vite, Tailwind CSS, Framer Motion</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Backend: Node.js, Express.js REST Controllers</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Database: MongoDB Cloud Cluster via Mongoose ODM</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Security: JWT Auth, Helmet, Password Hashing</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-indigo-900/60">
            <a
              href={getApiUrl('/api/health')}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl bg-indigo-900/40 hover:bg-amber-500/10 text-xs font-semibold text-indigo-200 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-all border border-amber-500/20 font-mono"
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
