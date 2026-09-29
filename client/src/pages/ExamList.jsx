import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { safeFetchJson } from '../utils/api';
import BrandedLoader from '../components/BrandedLoader';
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
      return { text: 'Upcoming Window', style: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    }
    if (end && now > end) {
      return { text: 'Window Closed', style: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
    }
    return { text: 'Active Now', style: 'bg-teal-500/10 text-teal-300 border-teal-500/20' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-teal-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="p-1 text-teal-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-900/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-[#f4f4f8] tracking-tight">
              {isStaff ? 'All Portal Examinations' : 'Available Examinations'}
            </h1>
            {dataSource && (
              <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded border ${
                dataSource === 'database' 
                  ? 'bg-teal-500/10 text-teal-300 border-teal-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {dataSource === 'database' ? 'Live DB' : 'Mock API'}
              </span>
            )}
          </div>
          <p className="text-[#a5a3c9] text-sm mt-1">
            {isStaff ? 'Manage, edit, and create scheduled test papers.' : 'Browse and take active tests during open timing windows.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isStaff && (
            <Link
              to="/exam-builder"
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-indigo-950 font-bold hover:bg-amber-400 text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Build New Exam
            </Link>
          )}

          <button
            onClick={fetchExams}
            className="px-4 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 hover:bg-indigo-900/40 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-[#a5a3c9] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exam by title, code (e.g., CS101, WEB202)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white placeholder:text-[#a5a3c9] text-sm focus:outline-none focus:border-amber-400 shadow-sm transition-colors"
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 text-[#a5a3c9] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-sm focus:outline-none focus:border-amber-400 shadow-sm appearance-none transition-colors cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Exam Grid */}
      {loading ? (
        <BrandedLoader message="Loading available exams..." />
      ) : error ? (
        <div className="glass-card p-8 text-center max-w-lg mx-auto border-rose-500/20 space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Error Fetching Exams</h3>
          <p className="text-[#a5a3c9] text-sm">{error}</p>
          <button
            onClick={fetchExams}
            className="px-4 py-2 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs hover:bg-amber-400 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="glass-card py-16 text-center text-[#a5a3c9] space-y-2 border border-amber-500/15">
          <BookOpen className="w-12 h-12 text-[#a5a3c9] mx-auto mb-1 opacity-60" />
          <p className="text-base font-medium text-white">No exams match your search criteria.</p>
          <p className="text-xs text-[#a5a3c9]">Try clearing filters or changing search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => {
            const timing = getTimingBadge(exam);
            return (
              <div
                key={exam._id}
                className="glass-card p-6 glass-card-hover border border-amber-500/15 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold">
                      {exam.code}
                    </span>
                    
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${timing.style}`}>
                      {timing.text}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
                    {exam.title}
                  </h3>

                  <p className="text-[#a5a3c9] text-xs leading-relaxed mb-6 line-clamp-3">
                    {exam.description || 'Comprehensive evaluation assessment.'}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-indigo-900/40">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800/40">
                      <span className="text-[#a5a3c9] block text-[10px] uppercase font-semibold">Time</span>
                      <span className="text-white font-bold flex items-center justify-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {exam.durationMinutes || exam.duration}m
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800/40">
                      <span className="text-[#a5a3c9] block text-[10px] uppercase font-semibold">Marks</span>
                      <span className="text-white font-bold flex items-center justify-center gap-1 mt-0.5">
                        <Award className="w-3 h-3 text-amber-400" />
                        {exam.totalMarks}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800/40">
                      <span className="text-[#a5a3c9] block text-[10px] uppercase font-semibold">Pass</span>
                      <span className="text-white font-bold flex items-center justify-center gap-1 mt-0.5">
                        <CheckCircle className="w-3 h-3 text-teal-400" />
                        {exam.passingMarks}
                      </span>
                    </div>
                  </div>

                  {isStaff ? (
                    <div className="flex gap-2">
                      <Link
                        to={`/exam-builder/${exam._id}`}
                        className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-indigo-950 border border-amber-500/20 text-xs font-bold text-center transition-colors flex items-center justify-center gap-1"
                      >
                        Edit Exam Rules
                      </Link>
                      <button
                        onClick={() => setDeleteTargetExam(exam)}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/20 text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
                        title="Delete Exam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveModalExam(exam)}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#171545] border border-amber-500/20 rounded-2xl max-w-md w-full p-6 relative shadow-2xl space-y-6 text-white">
            <button
              onClick={() => setActiveModalExam(null)}
              className="absolute top-4 right-4 text-[#a5a3c9] hover:text-white p-1 rounded-lg hover:bg-indigo-900/40"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-amber-400">{activeModalExam.code}</span>
                <h3 className="text-lg font-bold text-white">{activeModalExam.title}</h3>
              </div>
            </div>

            <p className="text-[#a5a3c9] text-xs leading-relaxed">
              {activeModalExam.description}
            </p>

            <div className="p-4 rounded-xl bg-indigo-950 border border-indigo-800 text-xs space-y-2">
              <div className="flex justify-between text-[#a5a3c9]">
                <span>Duration:</span>
                <span className="text-white font-bold">{activeModalExam.durationMinutes || activeModalExam.duration} Minutes</span>
              </div>
              <div className="flex justify-between text-[#a5a3c9]">
                <span>Total Marks:</span>
                <span className="text-white font-bold">{activeModalExam.totalMarks} Points</span>
              </div>
              <div className="flex justify-between text-[#a5a3c9]">
                <span>Passing Criteria:</span>
                <span className="text-teal-400 font-bold">{activeModalExam.passingMarks} Points Required</span>
              </div>
              <div className="flex justify-between text-[#a5a3c9]">
                <span>Attempts Allowed:</span>
                <span className="text-amber-400 font-bold">{activeModalExam.attemptsAllowed || 1} Attempt</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModalExam(null)}
                className="w-1/2 py-2.5 rounded-xl border border-indigo-800 text-[#a5a3c9] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetExamId = activeModalExam._id;
                  setActiveModalExam(null);
                  navigate(`/take-exam/${targetExamId}`);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-colors cursor-pointer"
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
