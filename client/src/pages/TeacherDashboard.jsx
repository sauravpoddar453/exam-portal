import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
import AnimatedCounter from '../components/AnimatedCounter';
import BrandedLoader from '../components/BrandedLoader';
import { 
  BookOpen, 
  PlusCircle, 
  Users, 
  CheckSquare, 
  GraduationCap, 
  Sparkles,
  Copy,
  Check,
  Trash2,
  X,
  FileCheck,
  BarChart3,
  Layers,
  FileText
} from 'lucide-react';
import DeleteExamModal from '../components/DeleteExamModal';

export default function TeacherDashboard() {
  const { user, token } = useAuth();
  
  // Stats & Exams state
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Courses state
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Modals state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [createdCourseCode, setCreatedCourseCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [deleteTargetExam, setDeleteTargetExam] = useState(null);

  // View Enrolled Students Modal
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseStudents, setCourseStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Create Exam Modal
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examCode, setExamCode] = useState('');
  const [examDuration, setExamDuration] = useState('60');
  const [selectedExamCourse, setSelectedExamCourse] = useState('');

  // Fetch Teacher Stats & Authored Exams
  const fetchTeacherData = useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/admin/teacher-overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data.success) {
        setStatsData(data.data);
      }
    } catch (err) {
      console.error('[TeacherDashboard] Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch Teacher's Courses
  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/courses/my-courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data.success) {
        setCourses(data.data || []);
      }
    } catch (err) {
      console.error('[TeacherDashboard] Error fetching courses:', err);
    } finally {
      setCoursesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTeacherData();
    fetchCourses();
  }, [fetchTeacherData, fetchCourses]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;

    try {
      const { ok, data } = await safeFetchJson('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDescription,
        }),
      });

      if (ok && data.success) {
        setCreatedCourseCode(data.data.enrollmentCode);
        setCourseTitle('');
        setCourseDescription('');
        fetchCourses();
      } else {
        alert(data.message || 'Error creating course');
      }
    } catch (err) {
      alert('Failed to connect to backend: ' + err.message);
    }
  };

  const handleViewCourseDetails = async (course) => {
    setSelectedCourse(course);
    setStudentsLoading(true);
    try {
      const { ok, data } = await safeFetchJson(`/api/courses/${course._id}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data.success) {
        setCourseStudents(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching course students:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleRemoveStudent = async (courseId, studentId) => {
    if (!window.confirm('Are you sure you want to remove this student from the course?')) return;
    try {
      const { ok, data } = await safeFetchJson(`/api/courses/${courseId}/students/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data.success) {
        setCourseStudents(prev => prev.filter(s => String(s._id) !== String(studentId)));
        fetchCourses();
      } else {
        alert(data.message || 'Failed to remove student');
      }
    } catch (err) {
      alert('Error removing student: ' + err.message);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!selectedExamCourse) {
      alert('Please select a course for this exam.');
      return;
    }

    try {
      const { ok, data } = await safeFetchJson('/api/exams', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: examTitle,
          code: examCode,
          course: selectedExamCourse,
          durationMinutes: Number(examDuration),
        }),
      });
      if (ok && data.success) {
        alert(`Exam "${examTitle}" created successfully!`);
        setShowCreateExamModal(false);
        setExamTitle('');
        setExamCode('');
        setSelectedExamCourse('');
        fetchTeacherData();
      } else {
        alert(data.message || 'Error creating exam');
      }
    } catch (err) {
      alert('Failed to connect to backend server: ' + err.message);
    }
  };

  const exams = statsData?.exams || [];
  const recentActivity = statsData?.recentActivity || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Teacher Approval Status Warning Banner */}
      {user?.role === 'teacher' && user?.teacherApprovalStatus === 'pending' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 flex-shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">⏳ Faculty Account Approval Pending</h4>
            <p className="text-xs text-indigo-200/70 mt-0.5">
              Your teacher registration is currently under review by system administrators. Course and exam creation privileges are restricted until approved.
            </p>
          </div>
        </div>
      )}

      {user?.role === 'teacher' && user?.teacherApprovalStatus === 'rejected' && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 flex-shrink-0">
            <X className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">❌ Faculty Account Registration Rejected</h4>
            <p className="text-xs text-indigo-200/70 mt-0.5">
              Your teacher account application was not approved by system administrators.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
        
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase mb-3">
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            Teacher & Educator Portal
          </div>
          <h1 className="text-3xl font-extrabold text-white">
            Instructor Control Center - {user?.name || 'Teacher'}
          </h1>
          <p className="text-indigo-200/70 text-sm mt-1">
            Manage your courses, share enrollment codes, build tests, and review student grades.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (user?.teacherApprovalStatus && user.teacherApprovalStatus !== 'approved') {
                alert('Your account is ' + user.teacherApprovalStatus + ' approval. Course creation is restricted.');
                return;
              }
              setShowCourseModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-900/60 hover:bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            + Create Course / Batch
          </button>

          <button
            onClick={() => {
              if (user?.teacherApprovalStatus && user.teacherApprovalStatus !== 'approved') {
                alert('Your account is ' + user.teacherApprovalStatus + ' approval. Exam creation is restricted.');
                return;
              }
              if (courses.length === 0) {
                alert('You must create at least one course before creating an exam.');
                setShowCourseModal(true);
                return;
              }
              setShowCreateExamModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create Exam
          </button>
        </div>
      </div>

      {/* Teacher Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300">My Courses</span>
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {coursesLoading ? '...' : <AnimatedCounter value={courses.length} suffix=" Active" />}
          </div>
          <p className="text-xs text-indigo-200/60 mt-1">Batches & Subject Groups</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300">Exams Authored</span>
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {loading ? '...' : <AnimatedCounter value={statsData?.publishedCount || 0} suffix=" Published" />}
          </div>
          <p className="text-xs text-indigo-200/60 mt-1">
            {loading ? '...' : `${statsData?.examsCount || 0} total papers created`}
          </p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300">Total Submissions</span>
            <CheckSquare className="w-5 h-5 text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold text-teal-400 font-mono">
            {loading ? '...' : <AnimatedCounter value={statsData?.totalSubmissions || 0} suffix=" Evaluated" />}
          </div>
          <p className="text-xs text-indigo-200/60 mt-1">Submissions evaluated</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300">Active Students</span>
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {loading ? '...' : <AnimatedCounter value={statsData?.activeStudentsCount || 0} suffix=" Candidates" />}
          </div>
          <p className="text-xs text-indigo-200/60 mt-1">Enrolled across courses</p>
        </div>

      </div>

      {/* Courses & Batches Section */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">My Courses & Batches</h3>
          </div>
          <button
            onClick={() => setShowCourseModal(true)}
            className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
          >
            + Add New Course
          </button>
        </div>

        {coursesLoading ? (
          <BrandedLoader message="Loading courses..." />
        ) : courses.length === 0 ? (
          <div className="py-10 text-center space-y-3 bg-indigo-950/40 border border-dashed border-indigo-900/60 rounded-xl p-6">
            <Layers className="w-8 h-8 text-indigo-400/60 mx-auto" />
            <div>
              <h4 className="text-xs font-semibold text-white">No Courses Created Yet</h4>
              <p className="text-xs text-indigo-200/70 max-w-sm mx-auto mt-1">
                Create a course to auto-generate a shareable <strong>Enrollment Code</strong> for your students.
              </p>
            </div>
            <button
              onClick={() => setShowCourseModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-sm"
            >
              + Create First Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div key={c._id} className="p-5 rounded-2xl bg-indigo-950/60 border border-indigo-900/60 space-y-3 relative hover:border-amber-500/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white">{c.title}</h4>
                    <p className="text-xs text-indigo-200/70 line-clamp-1 mt-0.5">{c.description || 'No description provided'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                    {c.examCount || 0} Exams
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-between text-xs">
                  <span className="text-indigo-300 text-[11px]">Enrollment Code:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-amber-400">
                    <span>{c.enrollmentCode}</span>
                    <button
                      onClick={() => handleCopyCode(c.enrollmentCode)}
                      className="p-1 rounded hover:bg-indigo-800/50 text-indigo-300 hover:text-amber-400 transition-colors"
                      title="Copy Code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-indigo-900/60 text-xs">
                  <span className="text-indigo-200/70 text-[11px] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    {c.studentCount || (c.students ? c.students.length : 0)} Students
                  </span>

                  <button
                    onClick={() => handleViewCourseDetails(c)}
                    className="px-3 py-1 rounded-lg bg-indigo-900/40 border border-amber-500/20 text-indigo-200 hover:text-amber-300 hover:border-amber-400 font-medium text-[11px] transition-all"
                  >
                    View Students & Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Authored Exams & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Authored Exams */}
        <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Authored Examinations</h3>
              </div>
              <span className="text-xs text-indigo-300 font-mono">{exams.length} Papers</span>
            </div>

            {loading ? (
              <BrandedLoader message="Loading exams..." />
            ) : exams.length === 0 ? (
              <div className="py-8 text-center text-xs text-indigo-300/60">No exams authored yet.</div>
            ) : (
              <div className="space-y-3">
                {exams.map((ex) => (
                  <div key={ex._id} className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/60 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">{ex.code}</span>
                        {ex.course && (
                          <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold px-1.5 py-0.5 rounded">
                            {ex.course.title || 'Course'}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-white line-clamp-1 mt-0.5">{ex.title}</h4>
                      <span className="text-[11px] text-indigo-200/70">
                        {ex.durationMinutes || ex.duration} mins | {ex.questions?.length || 0} Questions | Pass: {ex.passingMarks} pts
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Link
                        to={`/exam-builder/${ex._id}`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-900/40 border border-indigo-700/50 text-indigo-200 hover:text-amber-300 hover:border-amber-400 text-xs font-medium transition-all"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteTargetExam(ex)}
                        className="p-1.5 rounded-lg bg-indigo-900/40 border border-indigo-700/50 text-rose-400 hover:text-white hover:bg-rose-500 hover:border-rose-500 text-xs font-medium transition-all cursor-pointer"
                        title="Delete Exam"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-indigo-900/60">
            <Link
              to="/exam-builder"
              className="w-full py-2.5 rounded-xl bg-indigo-900/40 hover:bg-amber-500/10 text-xs font-semibold text-indigo-200 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-all border border-amber-500/20"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Launch Exam Builder Studio</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Recent Candidate Activity</h3>
              </div>
              <span className="text-xs text-indigo-300 font-mono">{recentActivity.length} Recent</span>
            </div>

            {loading ? (
              <BrandedLoader message="Loading candidate activity..." />
            ) : recentActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-indigo-300/60">No recent candidate submissions.</div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act) => (
                  <div key={act._id} className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/60 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">{act.examCode}</span>
                        <h4 className="text-xs font-semibold text-white">{act.studentName}</h4>
                      </div>
                      <span className="text-[11px] text-indigo-200/70 block">
                        Score: {act.score} / {act.totalMarks} | {new Date(act.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        act.isPassed 
                          ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}>
                        {act.isPassed ? 'Passed' : 'Failed'}
                      </span>
                      <Link
                        to={`/attempts/${act._id}/review`}
                        className="p-1.5 rounded-lg bg-indigo-900/40 border border-indigo-700/50 text-indigo-200 hover:text-amber-300 text-xs font-medium transition-all"
                        title="View Answer Sheet"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-indigo-900/60">
            <Link
              to="/grading"
              className="w-full py-2.5 rounded-xl bg-indigo-900/40 hover:bg-amber-500/10 text-xs font-semibold text-indigo-200 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-all border border-amber-500/20"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Review Essay Grading Queue</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Create Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 space-y-6 border border-amber-500/20 rounded-2xl relative shadow-2xl">
            <button
              onClick={() => {
                setShowCourseModal(false);
                setCreatedCourseCode(null);
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
                <h3 className="text-lg font-bold text-white">Create Course / Batch</h3>
                <p className="text-xs text-indigo-200/70">Auto-generates a unique enrollment code for students.</p>
              </div>
            </div>

            {createdCourseCode ? (
              <div className="space-y-4 text-center py-2">
                <div className="p-4 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs">
                  🎉 Course created successfully! Share the code below with your students:
                </div>

                <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-900/80 flex items-center justify-between">
                  <span className="text-xs text-indigo-300 font-semibold">Enrollment Code:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-mono font-extrabold text-amber-400 tracking-wider">
                      {createdCourseCode}
                    </span>
                    <button
                      onClick={() => handleCopyCode(createdCourseCode)}
                      className="p-2 rounded-lg bg-indigo-900/60 border border-amber-500/20 text-amber-300 hover:bg-amber-500/10 text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
                      {copiedCode ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCourseModal(false);
                    setCreatedCourseCode(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-indigo-200 mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS101 - Data Structures & Algorithms"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-900/80 text-white placeholder-indigo-300/40 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-200 mb-1">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Brief course objectives and syllabus details..."
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-900/80 text-white placeholder-indigo-300/40 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCourseModal(false)}
                    className="w-1/2 py-2.5 rounded-xl bg-indigo-900/40 text-indigo-200 border border-indigo-700/50 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 text-xs font-bold shadow-md"
                  >
                    Generate Course Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Course Details & Enrolled Students Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm">
          <div className="glass-card max-w-2xl w-full p-6 space-y-6 border border-amber-500/20 rounded-2xl relative shadow-2xl max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedCourse(null)}
              className="absolute top-4 right-4 text-indigo-300/60 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-indigo-900/60 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedCourse.title}</h3>
                <div className="flex items-center gap-2 text-xs text-indigo-200/70 mt-0.5">
                  <span>Enrollment Code: <strong className="font-mono text-amber-400">{selectedCourse.enrollmentCode}</strong></span>
                  <button
                    onClick={() => handleCopyCode(selectedCourse.enrollmentCode)}
                    className="text-amber-400 hover:underline flex items-center gap-1 ml-1"
                  >
                    <Copy className="w-3 h-3" /> Copy Code
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 pr-1">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Enrolled Students ({courseStudents.length})
              </h4>

              {studentsLoading ? (
                <BrandedLoader message="Loading enrolled students..." />
              ) : courseStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-indigo-300/60 bg-indigo-950/60 rounded-xl border border-indigo-900/60">
                  No students enrolled in this course yet. Share code <strong className="font-mono text-amber-400">{selectedCourse.enrollmentCode}</strong> with students.
                </div>
              ) : (
                <div className="space-y-2">
                  {courseStudents.map((st) => (
                    <div key={st._id} className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/60 flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-xs font-bold text-white">{st.name}</h5>
                        <span className="text-[11px] text-indigo-200/70">{st.email}</span>
                      </div>

                      <button
                        onClick={() => handleRemoveStudent(selectedCourse._id, st._id)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-900/40 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-[11px] font-semibold flex items-center gap-1 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-indigo-900/60 flex justify-end">
              <button
                onClick={() => setSelectedCourse(null)}
                className="px-5 py-2 rounded-xl bg-indigo-900/40 text-white font-semibold text-xs border border-indigo-700/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Exam Modal */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 space-y-6 border border-amber-500/20 rounded-2xl relative shadow-2xl">
            <button
              onClick={() => setShowCreateExamModal(false)}
              className="absolute top-4 right-4 text-indigo-300/60 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-indigo-900/60 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Create New Exam</h3>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-200 mb-1">Select Course / Batch *</label>
                <select
                  required
                  value={selectedExamCourse}
                  onChange={(e) => setSelectedExamCourse(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-900/80 text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title} ({c.enrollmentCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-200 mb-1">Exam Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Operating Systems"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-indigo-950/60 border border-indigo-900/80 text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-200 mb-1">Exam Code (Unique) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OS401"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-indigo-950/60 border border-indigo-900/80 text-amber-400 text-sm font-mono uppercase focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-200 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  value={examDuration}
                  onChange={(e) => setExamDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-indigo-950/60 border border-indigo-900/80 text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExamModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-900/40 text-indigo-200 border border-indigo-700/50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 text-xs font-bold shadow-md"
                >
                  Create & Launch Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Exam Confirmation Modal */}
      {deleteTargetExam && (
        <DeleteExamModal
          exam={deleteTargetExam}
          isOpen={!!deleteTargetExam}
          onClose={() => setDeleteTargetExam(null)}
          onSuccess={(msg) => {
            alert(msg || 'Exam deleted successfully.');
            setDeleteTargetExam(null);
            fetchTeacherData();
          }}
        />
      )}

    </div>
  );
}
