import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
import AnimatedCounter from '../components/AnimatedCounter';
import BrandedLoader from '../components/BrandedLoader';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Award, 
  Play, 
  RotateCcw, 
  User, 
  BarChart3,
  Layers,
  PlusCircle,
  X,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function StudentDashboard() {
  const { user, token } = useAuth();

  const [availableExams, setAvailableExams] = useState([]);
  const [myAttempts, setMyAttempts] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Enroll modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState('');
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);

  const fetchStudentData = useCallback(async () => {
    setLoading(true);
    try {
      const courseRes = await safeFetchJson('/api/courses/my-courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (courseRes.ok && courseRes.data.success) {
        setEnrolledCourses(courseRes.data.data || []);
      }

      const examRes = await safeFetchJson('/api/exams/available', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (examRes.ok && examRes.data.success) {
        setAvailableExams(examRes.data.data || []);
      }

      const attRes = await safeFetchJson('/api/attempts/my-attempts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (attRes.ok && attRes.data.success) {
        setMyAttempts(attRes.data.data || []);
      }
    } catch (err) {
      console.error('[StudentDashboard] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const handleEnrollCourse = async (e) => {
    e.preventDefault();
    setEnrollError('');
    setEnrollSuccess('');

    if (!enrollCode.trim()) {
      setEnrollError('Please enter an enrollment code.');
      return;
    }

    try {
      setIsSubmittingEnroll(true);
      const { ok, data } = await safeFetchJson('/api/courses/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enrollmentCode: enrollCode }),
      });

      if (ok && data.success) {
        setEnrollSuccess(data.message || 'Successfully enrolled in course!');
        setEnrollCode('');
        fetchStudentData();
        setTimeout(() => {
          setShowEnrollModal(false);
          setEnrollSuccess('');
        }, 1800);
      } else {
        setEnrollError(data.message || 'Enrollment failed.');
      }
    } catch (err) {
      setEnrollError('Error connecting to server: ' + err.message);
    } finally {
      setIsSubmittingEnroll(false);
    }
  };

  const inProgressAttempt = myAttempts.find(a => a.status === 'in-progress');
  const completedAttempts = myAttempts.filter(a => a.status === 'submitted' || a.status === 'timed-out');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Welcome Banner */}
      <div className="glass-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase mb-3">
            <User className="w-3.5 h-3.5 text-amber-400" />
            Candidate Student Portal
          </div>
          <h1 className="text-3xl font-extrabold text-white">
            Welcome back, {user?.name || 'Student'}! 👋
          </h1>
          <p className="text-indigo-200/70 text-sm mt-1">
            Logged in as <span className="text-amber-400 font-semibold">{user?.email}</span>. Join courses using enrollment codes to unlock exams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEnrollModal(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-900/60 hover:bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs shadow-md flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            Enroll in Course / Batch
          </button>

          {inProgressAttempt ? (
            <Link
              to={`/take-exam/${inProgressAttempt.exam?._id || inProgressAttempt.exam}`}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 animate-pulse"
            >
              <RotateCcw className="w-4 h-4" />
              Resume Active Exam
            </Link>
          ) : (
            <Link
              to="/exams"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Browse Open Exams
            </Link>
          )}
        </div>
      </div>

      {/* Student Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300">My Enrolled Courses</span>
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {loading ? '...' : <AnimatedCounter value={enrolledCourses.length} suffix=" Enrolled" />}
          </div>
          <p className="text-xs text-indigo-200/60 mt-1">Active Batches</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300">Available Tests</span>
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {loading ? '...' : <AnimatedCounter value={availableExams.length} suffix=" Open" />}
          </div>
          <p className="text-xs text-indigo-200/60 mt-1">From enrolled courses</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300">Exams Completed</span>
            <CheckCircle className="w-5 h-5 text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold text-teal-400 font-mono">
            {loading ? '...' : <AnimatedCounter value={completedAttempts.length} suffix=" Submitted" />}
          </div>
          <p className="text-xs text-indigo-200/60 mt-1">Past attempt history</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300">Certificates Earned</span>
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {loading ? '...' : <AnimatedCounter value={completedAttempts.filter(a => a.isPassed).length} suffix=" Passed" />}
          </div>
          <p className="text-xs text-indigo-200/60 mt-1">Passing score achieved</p>
        </div>
      </div>

      {/* In-Progress Ongoing Exam Alert */}
      {inProgressAttempt && (
        <div className="glass-card p-6 border-amber-500/40 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 animate-spin">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Test Session Active</span>
              <h3 className="text-lg font-bold text-white">You have an ongoing test in progress!</h3>
              <p className="text-xs text-indigo-200/70">Your answers are saved automatically. Click resume to return to your workspace.</p>
            </div>
          </div>

          <Link
            to={`/take-exam/${inProgressAttempt.exam?._id || inProgressAttempt.exam}`}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Resume Test Now
          </Link>
        </div>
      )}

      {/* My Enrolled Courses Section */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">My Enrolled Courses & Batches</h3>
          </div>
          <button
            onClick={() => setShowEnrollModal(true)}
            className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
          >
            + Enroll in New Course
          </button>
        </div>

        {loading ? (
          <BrandedLoader message="Loading enrolled courses..." />
        ) : enrolledCourses.length === 0 ? (
          <div className="py-10 text-center space-y-3 bg-indigo-950/40 border border-dashed border-indigo-900/60 rounded-xl p-6">
            <Layers className="w-8 h-8 text-indigo-400/60 mx-auto" />
            <div>
              <h4 className="text-xs font-semibold text-white">You are not enrolled in any courses yet</h4>
              <p className="text-xs text-indigo-200/70 max-w-sm mx-auto mt-1">
                Ask your teacher for the 6-8 character <strong>Enrollment Code</strong> to join their course and access exams.
              </p>
            </div>
            <button
              onClick={() => setShowEnrollModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-sm"
            >
              + Enter Enrollment Code
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledCourses.map((c) => (
              <div key={c._id} className="p-5 rounded-2xl bg-indigo-950/60 border border-indigo-900/60 space-y-3 relative hover:border-amber-500/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white">{c.title}</h4>
                    <p className="text-xs text-indigo-200/70 line-clamp-1 mt-0.5">{c.description || 'Enrolled Course'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-semibold">
                    Enrolled
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-indigo-900/60 text-indigo-200/70">
                  <span>Instructor: <strong className="text-white">{c.teacher?.name || 'Teacher'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Exams Queue */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-indigo-900/60 pb-3">
          <BookOpen className="w-5 h-5 text-amber-400" />
          Scheduled & Open Examinations (Enrolled Courses Only)
        </h3>

        {loading ? (
          <BrandedLoader message="Loading available tests..." />
        ) : availableExams.length === 0 ? (
          <div className="py-8 text-center text-xs text-indigo-300/60">
            {enrolledCourses.length === 0 
              ? 'Please enroll in a course to view available exams.' 
              : 'No open exams scheduled in your enrolled courses right now.'}
          </div>
        ) : (
          <div className="space-y-3">
            {availableExams.map((item) => (
              <div key={item._id} className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-amber-400 font-bold">{item.code}</span>
                    {item.course && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold px-2 py-0.5 rounded-full">
                        {item.course.title || 'Course'}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                  <span className="text-xs text-indigo-200/70">
                    Duration: {item.durationMinutes || item.duration} mins | Total Marks: {item.totalMarks} | Pass: {item.passingMarks} pts
                  </span>
                </div>

                <Link
                  to={`/take-exam/${item._id}`}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 text-xs font-bold shadow-sm transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Test
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Attempts History Table */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-indigo-900/60 pb-3">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          Your Exam Attempt History
        </h3>

        {completedAttempts.length === 0 ? (
          <div className="py-8 text-center text-xs text-indigo-300/60">No completed exam attempts yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-indigo-200">
              <thead className="bg-indigo-950/80 text-indigo-300 uppercase text-[10px] font-mono border-b border-indigo-900/60">
                <tr>
                  <th className="p-3">Exam Code</th>
                  <th className="p-3">Submitted At</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Score</th>
                  <th className="p-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-900/60">
                {completedAttempts.map((att) => (
                  <tr key={att._id} className="hover:bg-indigo-900/30">
                    <td className="p-3 font-mono text-amber-400 font-bold">
                      {att.exam?.code || 'EXAM'}
                    </td>
                    <td className="p-3 text-indigo-200/70">
                      {new Date(att.submittedAt || att.createdAt).toLocaleDateString()} {new Date(att.submittedAt || att.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="p-3 font-mono capitalize text-indigo-200">{att.status}</td>
                    <td className="p-3 text-right font-bold text-white">
                      {att.score} / {att.totalMarks || 100}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${
                        att.isPassed 
                          ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}>
                        {att.isPassed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enroll in Course Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 space-y-6 border border-amber-500/20 rounded-2xl relative shadow-2xl">
            <button
              onClick={() => {
                setShowEnrollModal(false);
                setEnrollError('');
                setEnrollSuccess('');
              }}
              className="absolute top-4 right-4 text-indigo-300/60 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-indigo-900/60 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Enroll in Course / Batch</h3>
                <p className="text-xs text-indigo-200/70">Enter the unique code provided by your instructor.</p>
              </div>
            </div>

            {enrollError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            {enrollSuccess && (
              <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>{enrollSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEnrollCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-200 mb-1">Enrollment Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS101X9"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-indigo-950/80 border border-amber-500/30 text-amber-400 text-lg font-mono font-bold tracking-widest text-center uppercase focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-900/40 text-indigo-200 border border-indigo-700/50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEnroll}
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmittingEnroll ? 'Joining...' : 'Join Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
