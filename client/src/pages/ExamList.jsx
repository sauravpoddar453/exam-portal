import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { safeFetchJson } from '../utils/api';
import { 
  BookOpen, 
  Clock, 
  Award, 
  Search, 
  Filter, 
  Play, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  X,
  PlusCircle,
  Calendar,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DeleteExamModal from '../components/DeleteExamModal';

export default function ExamList() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const isStaff = user && (user.role === 'admin' || user.role === 'teacher');

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeModalExam, setActiveModalExam] = useState(null);
  const [deleteTargetExam, setDeleteTargetExam] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchExams();
  }, [isStaff]);

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeToken = token || localStorage.getItem('token');
      console.log(`[ExamList DIAGNOSTIC] Fetching exams from API. Token present: ${Boolean(activeToken)}, Token length: ${activeToken ? activeToken.length : 0}`);

      const url = isStaff ? '/api/exams' : '/api/exams/available';
      const headers = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};

      const { ok, data } = await safeFetchJson(url, { headers });
      if (ok && data?.success) {
        setExams(data.data || []);
        setDataSource(data.source || 'api');
      } else {
        throw new Error(data?.message || 'Failed to fetch exams');
      }
    } catch (err) {
      console.error('[ExamList] Error fetching exams:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(exams.map(e => e.category || 'General'))];

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exam.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (exam.description && exam.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || exam.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTimingBadge = (exam) => {
    const now = new Date();
    const start = exam.startTime ? new Date(exam.startTime) : null;
    const end = exam.endTime ? new Date(exam.endTime) : null;

    if (start && now < start) {
      return { text: 'Upcoming Window', style: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (end && now > end) {
      return { text: 'Window Closed', style: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    return { text: 'Active Now', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="p-1 text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {isStaff ? 'All Portal Examinations' : 'Available Examinations'}
            </h1>
            {dataSource && (
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                dataSource === 'database' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {dataSource === 'database' ? 'Live DB' : 'Mock API'}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {isStaff ? 'Manage, edit, and create scheduled test papers.' : 'Browse and take active tests during open timing windows.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isStaff && (
            <Link
              to="/exam-builder"
              className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-xs shadow-md shadow-red-600/20 hover:bg-red-700 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Build New Exam
            </Link>
          )}

          <button
            onClick={fetchExams}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exam by title, code (e.g., CS101, WEB202)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm transition-colors"
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm appearance-none transition-colors cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Exam Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading available exams from API server...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center max-w-lg mx-auto border-red-200">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Error Fetching Exams</h3>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchExams}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="glass-card py-16 text-center text-gray-500">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-base font-medium text-gray-700">No exams match your search criteria.</p>
          <p className="text-xs text-gray-400 mt-1">Try clearing filters or changing search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => {
            const timing = getTimingBadge(exam);
            return (
              <div
                key={exam._id}
                className="glass-card p-6 glass-card-hover flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 text-xs font-mono font-bold">
                      {exam.code}
                    </span>
                    
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${timing.style}`}>
                      {timing.text}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-2">
                    {exam.title}
                  </h3>

                  <p className="text-gray-600 text-xs leading-relaxed mb-6 line-clamp-3">
                    {exam.description || 'Comprehensive evaluation assessment.'}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Time</span>
                      <span className="text-gray-800 font-bold flex items-center justify-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-red-600" />
                        {exam.durationMinutes || exam.duration}m
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Marks</span>
                      <span className="text-gray-800 font-bold flex items-center justify-center gap-1 mt-0.5">
                        <Award className="w-3 h-3 text-amber-500" />
                        {exam.totalMarks}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Pass</span>
                      <span className="text-gray-800 font-bold flex items-center justify-center gap-1 mt-0.5">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        {exam.passingMarks}
                      </span>
                    </div>
                  </div>

                  {isStaff ? (
                    <div className="flex gap-2">
                      <Link
                        to={`/exam-builder/${exam._id}`}
                        className="w-full py-2 rounded-xl bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1"
                      >
                        Edit Exam Rules
                      </Link>
                      <button
                        onClick={() => setDeleteTargetExam(exam)}
                        className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
                        title="Delete Exam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveModalExam(exam)}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-red-600/20 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start Examination
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Start Exam Details Modal */}
      {activeModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 relative shadow-2xl space-y-6">
            <button
              onClick={() => setActiveModalExam(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-red-600">{activeModalExam.code}</span>
                <h3 className="text-lg font-bold text-gray-900">{activeModalExam.title}</h3>
              </div>
            </div>

            <p className="text-gray-600 text-xs leading-relaxed">
              {activeModalExam.description}
            </p>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Duration:</span>
                <span className="text-gray-900 font-bold">{activeModalExam.durationMinutes || activeModalExam.duration} Minutes</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Marks:</span>
                <span className="text-gray-900 font-bold">{activeModalExam.totalMarks} Points</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Passing Criteria:</span>
                <span className="text-emerald-700 font-bold">{activeModalExam.passingMarks} Points Required</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Attempts Allowed:</span>
                <span className="text-red-600 font-bold">{activeModalExam.attemptsAllowed || 1} Attempt</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModalExam(null)}
                className="w-1/2 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetExamId = activeModalExam._id;
                  setActiveModalExam(null);
                  console.log(`[ExamList DIAGNOSTIC] Beginning test for examId: ${targetExamId}`);
                  navigate(`/take-exam/${targetExamId}`);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold shadow-md shadow-red-600/20 hover:bg-red-700 transition-colors cursor-pointer"
              >
                Begin Test Now
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Exam Modal */}
      <DeleteExamModal
        exam={deleteTargetExam}
        isOpen={!!deleteTargetExam}
        onClose={() => setDeleteTargetExam(null)}
        onSuccess={(msg) => {
          setToastMessage(msg || 'Exam deleted successfully.');
          fetchExams();
          setTimeout(() => setToastMessage(''), 4000);
        }}
      />

    </div>
  );
}
