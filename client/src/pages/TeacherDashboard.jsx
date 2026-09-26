import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
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
  CheckCircle
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
  const [toastMessage, setToastMessage] = useState('');

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

  // Create Course Handler
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

  // View Enrolled Students
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

  // Remove Student from Course
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

  // Copy Code to Clipboard
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Create Quick Exam Handler
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
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-700 flex-shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">⏳ Faculty Account Approval Pending</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Your teacher registration is currently under review by system administrators. Course and exam creation privileges are restricted until approved. You will receive an email notification once your account is verified.
            </p>
          </div>
        </div>
      )}

      {user?.role === 'teacher' && user?.teacherApprovalStatus === 'rejected' && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-rose-100 rounded-xl text-rose-700 flex-shrink-0">
            <X className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-900">❌ Faculty Account Registration Rejected</h4>
            <p className="text-xs text-rose-800 mt-0.5">
              Your teacher account application was not approved by system administrators. You cannot publish courses or conduct exams on this platform.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 border border-gray-200 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-red-600/5 blur-3xl rounded-full pointer-events-none" />
        
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold uppercase mb-3">
            <GraduationCap className="w-3.5 h-3.5 text-red-600" />
            Teacher & Educator Portal
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Instructor Control Center - {user?.name || 'Teacher'}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
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
            className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold text-xs shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-red-500" />
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
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create Exam
          </button>
        </div>
      </div>

      {/* Teacher Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        
        <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">My Courses</span>
            <Layers className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{courses.length} Active</div>
          <p className="text-xs text-gray-500 mt-1">Batches & Subject Groups</p>
        </div>

        <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Exams Authored</span>
            <BookOpen className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {loading ? '...' : `${statsData?.publishedCount || 0} Published`}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {loading ? '...' : `${statsData?.examsCount || 0} total papers created`}
          </p>
        </div>

        <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Total Submissions</span>
            <CheckSquare className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-emerald-700">
            {loading ? '...' : `${statsData?.totalSubmissions || 0} Evaluated`}
          </div>
          <p className="text-xs text-gray-500 mt-1">Submissions evaluated</p>
        </div>

        <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Active Students</span>
            <Users className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">
            {loading ? '...' : `${statsData?.activeStudentsCount || 0} Candidates`}
          </div>
          <p className="text-xs text-gray-500 mt-1">Enrolled across courses</p>
        </div>

      </div>

      {/* Courses & Batches Section */}
      <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-bold text-gray-900">My Courses & Batches</h3>
          </div>
          <button
            onClick={() => setShowCourseModal(true)}
            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
          >
            + Add New Course
          </button>
        </div>

        {coursesLoading ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="py-10 text-center space-y-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6">
            <Layers className="w-8 h-8 text-gray-300 mx-auto" />
            <div>
              <h4 className="text-xs font-semibold text-gray-800">No Courses Created Yet</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Create a course to auto-generate a shareable <strong>Enrollment Code</strong> for your students.
              </p>
            </div>
            <button
              onClick={() => setShowCourseModal(true)}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 shadow-sm"
            >
              + Create First Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div key={c._id} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 relative hover:border-red-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{c.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{c.description || 'No description provided'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 text-[10px] font-mono font-bold">
                    {c.examCount || 0} Exams
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between text-xs">
                  <span className="text-gray-500 text-[11px]">Enrollment Code:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-red-600">
                    <span>{c.enrollmentCode}</span>
                    <button
                      onClick={() => handleCopyCode(c.enrollmentCode)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                      title="Copy Code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-xs">
                  <span className="text-gray-500 text-[11px] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    {c.studentCount || (c.students ? c.students.length : 0)} Students
                  </span>

                  <button
                    onClick={() => handleViewCourseDetails(c)}
                    className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-gray-700 hover:text-red-600 hover:border-red-300 font-medium text-[11px] transition-all"
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
        <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-600" />
                <h3 className="text-base font-semibold text-gray-900">Authored Examinations</h3>
              </div>
              <span className="text-xs text-gray-500 font-mono">{exams.length} Papers</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-500">Loading exams...</div>
            ) : exams.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">No exams authored yet.</div>
            ) : (
              <div className="space-y-3">
                {exams.map((ex) => (
                  <div key={ex._id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-red-600 font-bold uppercase">{ex.code}</span>
                        {ex.course && (
                          <span className="text-[10px] bg-red-50 border border-red-200 text-red-700 font-semibold px-1.5 py-0.5 rounded">
                            {ex.course.title || 'Course'}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-gray-900 line-clamp-1 mt-0.5">{ex.title}</h4>
                      <span className="text-[11px] text-gray-500">
                        {ex.durationMinutes || ex.duration} mins | {ex.questions?.length || 0} Questions | Pass: {ex.passingMarks} pts
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Link
                        to={`/exam-builder/${ex._id}`}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:text-red-700 hover:border-red-300 text-xs font-medium transition-all"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteTargetExam(ex)}
                        className="p-1.5 rounded-lg bg-white border border-gray-300 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600 text-xs font-medium transition-all cursor-pointer"
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

          <div className="pt-4 border-t border-gray-200">
            <Link
              to="/exam-builder"
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-red-50 text-xs font-semibold text-gray-700 hover:text-red-700 flex items-center justify-center gap-1.5 transition-all border border-gray-200"
            >
              <PlusCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Launch Exam Builder Studio</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-600" />
                <h3 className="text-base font-semibold text-gray-900">Recent Candidate Activity</h3>
              </div>
              <span className="text-xs text-gray-500 font-mono">{recentActivity.length} Recent</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-500">Loading activity...</div>
            ) : recentActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">No recent candidate submissions.</div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act) => (
                  <div key={act._id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-red-600 font-bold uppercase">{act.examCode}</span>
                        <h4 className="text-xs font-semibold text-gray-900">{act.studentName}</h4>
                      </div>
                      <span className="text-[11px] text-gray-500 block">
                        Score: {act.score} / {act.totalMarks} | {new Date(act.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      act.isPassed 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {act.isPassed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Link
              to="/grading"
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-red-50 text-xs font-semibold text-gray-700 hover:text-red-700 flex items-center justify-center gap-1.5 transition-all border border-gray-200"
            >
              <FileCheck className="w-3.5 h-3.5 text-red-600" />
              <span>Review Essay Grading Queue</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Create Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full p-6 space-y-6 border border-gray-200 rounded-2xl shadow-xl relative">
            <button
              onClick={() => {
                setShowCourseModal(false);
                setCreatedCourseCode(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create Course / Batch</h3>
                <p className="text-xs text-gray-500">Auto-generates a unique enrollment code for students.</p>
              </div>
            </div>

            {createdCourseCode ? (
              <div className="space-y-4 text-center py-2">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  🎉 Course created successfully! Share the code below with your students:
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-semibold">Enrollment Code:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-mono font-extrabold text-red-600 tracking-wider">
                      {createdCourseCode}
                    </span>
                    <button
                      onClick={() => handleCopyCode(createdCourseCode)}
                      className="p-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:text-red-600 text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {copiedCode ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCourseModal(false);
                    setCreatedCourseCode(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS101 - Data Structures & Algorithms"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Brief course objectives and syllabus details..."
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCourseModal(false)}
                    className="w-1/2 py-2.5 rounded-xl bg-gray-100 text-gray-700 border border-gray-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white max-w-2xl w-full p-6 space-y-6 border border-gray-200 rounded-2xl shadow-xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedCourse(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedCourse.title}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span>Enrollment Code: <strong className="font-mono text-red-600">{selectedCourse.enrollmentCode}</strong></span>
                  <button
                    onClick={() => handleCopyCode(selectedCourse.enrollmentCode)}
                    className="text-red-600 hover:underline flex items-center gap-1 ml-1"
                  >
                    <Copy className="w-3 h-3" /> Copy Code
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 pr-1">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Enrolled Students ({courseStudents.length})
              </h4>

              {studentsLoading ? (
                <div className="py-8 text-center text-xs text-gray-500">Loading enrolled students...</div>
              ) : courseStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                  No students enrolled in this course yet. Share code <strong className="font-mono text-red-600">{selectedCourse.enrollmentCode}</strong> with students.
                </div>
              ) : (
                <div className="space-y-2">
                  {courseStudents.map((st) => (
                    <div key={st._id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">{st.name}</h5>
                        <span className="text-[11px] text-gray-500">{st.email}</span>
                      </div>

                      <button
                        onClick={() => handleRemoveStudent(selectedCourse._id, st._id)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold flex items-center gap-1 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedCourse(null)}
                className="px-5 py-2 rounded-xl bg-gray-900 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Exam Modal */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full p-6 space-y-6 border border-gray-200 rounded-2xl shadow-xl relative">
            <button
              onClick={() => setShowCreateExamModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Create New Exam</h3>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Course / Batch *</label>
                <select
                  required
                  value={selectedExamCourse}
                  onChange={(e) => setSelectedExamCourse(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Exam Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Operating Systems"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Exam Code (Unique) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OS401"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  value={examDuration}
                  onChange={(e) => setExamDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExamModal(false)}
                  className="w-1/2 py-2 rounded-xl bg-gray-100 text-gray-700 border border-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 shadow-md"
                >
                  Publish Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Exam Modal */}
      <DeleteExamModal
        exam={deleteTargetExam}
        isOpen={!!deleteTargetExam}
        onClose={() => setDeleteTargetExam(null)}
        onSuccess={(msg) => {
          alert(msg || 'Exam deleted successfully.');
          fetchTeacherData();
        }}
      />

    </div>
  );
}
