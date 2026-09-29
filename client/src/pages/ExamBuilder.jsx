import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
import BrandedLoader from '../components/BrandedLoader';
import { 
  Sparkles, 
  Clock, 
  Sliders, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  HelpCircle, 
  MinusCircle, 
  Search,
  X,
  Layers,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import DeleteExamModal from '../components/DeleteExamModal';

export default function ExamBuilder() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  // Exam Settings State
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [courseId, setCourseId] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Computer Science');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [passingMarks, setPassingMarks] = useState(40);
  const [attemptsAllowed, setAttemptsAllowed] = useState(1);

  // Teacher's Courses
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Toggles
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(true);

  // Selected Questions list
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Question Bank Drawer State
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankSubject, setBankSubject] = useState('All');
  const [bankDifficulty, setBankDifficulty] = useState('All');

  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Teacher's Subjects
  const [teacherSubjects, setTeacherSubjects] = useState([]);

  // Fetch Teacher's Courses and Subjects
  useEffect(() => {
    let isMounted = true;
    setCoursesLoading(true);
    safeFetchJson('/api/courses/my-courses', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ ok, data }) => {
        if (isMounted && ok && data?.success && Array.isArray(data.data)) {
          setTeacherCourses(data.data);
          if (data.data.length > 0 && !courseId) {
            setCourseId(data.data[0]._id);
          }
        }
      })
      .catch(err => console.error('[ExamBuilder] Failed to load courses:', err))
      .finally(() => {
        if (isMounted) setCoursesLoading(false);
      });

    safeFetchJson('/api/subjects', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ ok, data }) => {
        if (isMounted && ok && data?.success && Array.isArray(data.data)) {
          setTeacherSubjects(data.data);
        }
      })
      .catch(err => console.error('[ExamBuilder] Failed to load subjects:', err));

    return () => { isMounted = false; };
  }, [token]);

  // Load Question Bank items
  const fetchQuestionBank = useCallback(async () => {
    setBankLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (bankSearch) queryParams.append('search', bankSearch);
      if (bankSubject !== 'All') queryParams.append('subject', bankSubject);
      if (bankDifficulty !== 'All') queryParams.append('difficulty', bankDifficulty);

      const { ok, data } = await safeFetchJson(`/api/questions?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setBankQuestions(data.data || []);
      }
    } catch (err) {
      console.error('[ExamBuilder] Failed to fetch question bank:', err);
    } finally {
      setBankLoading(false);
    }
  }, [token, bankSearch, bankSubject, bankDifficulty]);

  useEffect(() => {
    if (showQuestionBank) {
      fetchQuestionBank();
    }
  }, [showQuestionBank, fetchQuestionBank]);

  // Load existing exam if editing
  useEffect(() => {
    if (id) {
      safeFetchJson(`/api/exams/${id}`)
        .then(({ ok, data }) => {
          if (ok && data?.success && data.data) {
            const e = data.data;
            setTitle(e.title || '');
            setCode(e.code || '');
            setCourseId(e.course?._id || e.course || '');
            setDescription(e.description || '');
            setCategory(e.category || 'General');
            setDurationMinutes(e.durationMinutes || 60);
            setStartTime(e.startTime ? new Date(e.startTime).toISOString().slice(0, 16) : '');
            setEndTime(e.endTime ? new Date(e.endTime).toISOString().slice(0, 16) : '');
            setPassingMarks(e.passingMarks || 40);
            setAttemptsAllowed(e.attemptsAllowed || 1);
            setShuffleQuestions(!!e.shuffleQuestions);
            setShuffleOptions(!!e.shuffleOptions);
            setNegativeMarking(e.negativeMarking !== undefined ? !!e.negativeMarking : true);

            if (Array.isArray(e.questions)) {
              const formatted = e.questions.map(item => {
                const qObj = typeof item.question === 'object' ? item.question : { _id: item.question, questionText: 'Question ' + item.question };
                return {
                  questionId: qObj._id,
                  questionText: qObj.questionText,
                  type: qObj.type || 'mcq-single',
                  defaultMarks: qObj.marks || 1,
                  marksOverride: item.marksOverride || null,
                  subject: qObj.subject || 'General',
                  difficulty: qObj.difficulty || 'medium',
                };
              });
              setSelectedQuestions(formatted);
            }
          }
        })
        .catch(err => console.error('Error fetching exam details:', err));
    }
  }, [id]);

  // Add question to exam
  const handleAddQuestion = (q) => {
    if (selectedQuestions.some(item => item.questionId === q._id)) return;
    setSelectedQuestions(prev => [
      ...prev,
      {
        questionId: q._id,
        questionText: q.questionText,
        type: q.type,
        defaultMarks: q.marks || 1,
        marksOverride: null,
        subject: q.subject || 'General',
        difficulty: q.difficulty || 'medium',
      },
    ]);
  };

  // Remove question
  const handleRemoveQuestion = (qId) => {
    setSelectedQuestions(prev => prev.filter(item => item.questionId !== qId));
  };

  // Move Question Up/Down
  const moveQuestion = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedQuestions.length) return;
    const newArr = [...selectedQuestions];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    setSelectedQuestions(newArr);
  };

  // Update marks override
  const handleMarksOverrideChange = (index, val) => {
    const newArr = [...selectedQuestions];
    newArr[index].marksOverride = val === '' ? null : Number(val);
    setSelectedQuestions(newArr);
  };

  // Calculate Total Marks dynamically
  const calculatedTotalMarks = selectedQuestions.reduce((sum, item) => {
    const m = item.marksOverride !== null && item.marksOverride !== undefined ? item.marksOverride : item.defaultMarks;
    return sum + (Number(m) || 0);
  }, 0);

  // Save / Publish Exam
  const handleSubmitExam = async (e) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) {
      alert('Exam Title and Code are required!');
      return;
    }

    if (!courseId) {
      alert('You cannot create an exam without selecting a course! Please select or create a course first.');
      return;
    }

    if (Number(durationMinutes) < 1) {
      alert('Duration must be at least 1 minute!');
      return;
    }

    if (selectedQuestions.length === 0) {
      alert('Please add at least 1 question to the exam!');
      return;
    }

    if (Number(passingMarks) > calculatedTotalMarks) {
      alert(`Passing marks (${passingMarks}) cannot exceed Total Marks (${calculatedTotalMarks})!`);
      return;
    }

    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      alert('Exam End Time must be after Start Time!');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title,
        code: code.toUpperCase().trim(),
        course: courseId,
        description,
        category,
        durationMinutes: Number(durationMinutes),
        startTime: startTime ? new Date(startTime).toISOString() : null,
        endTime: endTime ? new Date(endTime).toISOString() : null,
        totalMarks: calculatedTotalMarks,
        passingMarks: Number(passingMarks),
        attemptsAllowed: Number(attemptsAllowed),
        shuffleQuestions,
        shuffleOptions,
        negativeMarking,
        questions: selectedQuestions.map(item => ({
          question: item.questionId,
          marksOverride: item.marksOverride,
        })),
      };

      const isEdit = !!id;
      const url = isEdit ? `/api/exams/${id}` : '/api/exams';
      const method = isEdit ? 'PUT' : 'POST';

      const { ok, data } = await safeFetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (ok && data?.success) {
        alert(isEdit ? 'Exam updated successfully!' : 'Exam published successfully!');
        navigate('/teacher');
      } else {
        alert(data?.message || 'Error saving exam');
      }
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-900/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#f4f4f8] tracking-tight">
              {id ? 'Edit Examination' : 'Exam Builder Studio'}
            </h1>
          </div>
          <p className="text-[#a5a3c9] text-sm mt-1">
            Assign exam to your Course, configure timing rules, pick questions from Question Bank, and publish.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {id && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Exam
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/teacher')}
            className="px-4 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-slate-200 hover:bg-indigo-900/40 text-xs font-semibold"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmitExam}
            disabled={saving || (!id && teacherCourses.length === 0)}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:scale-[1.02] transition-transform flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Publishing...' : id ? 'Update Exam' : 'Publish Examination'}
          </button>
        </div>
      </div>

      {/* Warning Alert if No Courses Created */}
      {!coursesLoading && teacherCourses.length === 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#f4f4f8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">No Courses Available</h4>
              <p className="text-xs text-[#a5a3c9] mt-0.5">
                You cannot create an exam without first having at least one course. Please create a course first on your Teacher Dashboard.
              </p>
            </div>
          </div>

          <Link
            to="/teacher"
            className="px-4 py-2 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs shadow-sm flex-shrink-0"
          >
            Go to Teacher Dashboard
          </Link>
        </div>
      )}

      {/* Main Grid: Left Settings, Right Question Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Settings & Rules */}
        <div className="space-y-6">
          
          {/* Basic Details Card */}
          <div className="glass-card p-6 border border-amber-500/15 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-indigo-900/40 pb-3">
              <BookOpen className="w-4 h-4 text-amber-400" />
              General Exam Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Target Course / Batch *</label>
              <select
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs focus:border-amber-400 font-medium cursor-pointer"
              >
                <option value="">-- Select Course --</option>
                {teacherCourses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title} ({c.enrollmentCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Exam Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Midterm Evaluation 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Exam Code / Paper ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. CS101-MID"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs font-mono font-bold uppercase focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Category</label>
              <input
                type="text"
                placeholder="Computer Science, Mathematics, etc."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Description / Instructions</label>
              <textarea
                rows={3}
                placeholder="Important exam guidelines for candidates..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs focus:border-amber-400"
              />
            </div>
          </div>

          {/* Timing & Scoring Rules Card */}
          <div className="glass-card p-6 border border-amber-500/15 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-indigo-900/40 pb-3">
              <Clock className="w-4 h-4 text-teal-400" />
              Timing & Evaluation Rules
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Duration (Minutes) *</label>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs font-bold focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Start Time Window</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-[11px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">End Time Window</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Passing Marks</label>
                <input
                  type="number"
                  min={0}
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-teal-400 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Attempts Allowed</label>
                <input
                  type="number"
                  min={1}
                  value={attemptsAllowed}
                  onChange={(e) => setAttemptsAllowed(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-amber-400 text-xs font-bold"
                />
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-3 pt-3 border-t border-indigo-900/40 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-slate-200">Shuffle Question Order</span>
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-4 h-4 rounded border-indigo-700 bg-indigo-950 text-amber-400 focus:ring-amber-400"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-slate-200">Shuffle Option Answers</span>
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="w-4 h-4 rounded border-indigo-700 bg-indigo-950 text-amber-400 focus:ring-amber-400"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-slate-200">Enable Negative Marking</span>
                <input
                  type="checkbox"
                  checked={negativeMarking}
                  onChange={(e) => setNegativeMarking(e.target.checked)}
                  className="w-4 h-4 rounded border-indigo-700 bg-indigo-950 text-amber-400 focus:ring-amber-400"
                />
              </label>
            </div>

          </div>

        </div>

        {/* Right Col: Selected Questions & Question Bank Manager */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="glass-card p-6 border border-amber-500/15 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-900/40 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  Exam Paper Composition ({selectedQuestions.length} Questions)
                </h3>
                <p className="text-xs text-[#a5a3c9] mt-0.5">
                  Calculated Total Marks: <strong className="text-teal-400 font-bold">{calculatedTotalMarks} Points</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowQuestionBank(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add Questions from Question Bank
              </button>
            </div>

            {/* Selected Questions List */}
            {selectedQuestions.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-indigo-800/80 rounded-2xl space-y-3 bg-indigo-950/30">
                <HelpCircle className="w-12 h-12 text-[#a5a3c9] mx-auto opacity-60" />
                <p className="text-sm font-medium text-white">No questions added to this exam yet.</p>
                <p className="text-xs text-[#a5a3c9]">Click "Add Questions from Question Bank" to select questions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedQuestions.map((q, idx) => {
                  const effectiveMarks = q.marksOverride !== null && q.marksOverride !== undefined ? q.marksOverride : q.defaultMarks;
                  return (
                    <div
                      key={q.questionId}
                      className="p-4 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-500/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-900 border border-indigo-700 text-amber-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white leading-relaxed line-clamp-2">
                            {q.questionText}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {q.subject}
                            </span>
                            <span className="text-[10px] font-mono text-[#a5a3c9] capitalize">
                              {q.type} | {q.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="flex items-center gap-1.5 bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-800">
                          <span className="text-[10px] text-[#a5a3c9]">Marks:</span>
                          <input
                            type="number"
                            min={1}
                            value={effectiveMarks}
                            onChange={(e) => handleMarksOverrideChange(idx, e.target.value)}
                            className="w-12 px-1 py-0.5 text-center bg-indigo-900 border border-indigo-700 text-teal-400 font-mono font-bold text-xs rounded"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveQuestion(idx, -1)}
                            className="p-1 text-[#a5a3c9] hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === selectedQuestions.length - 1}
                            onClick={() => moveQuestion(idx, 1)}
                            className="p-1 text-[#a5a3c9] hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(q.questionId)}
                            className="p-1 text-rose-400 hover:text-rose-300 ml-1 cursor-pointer"
                            title="Remove Question"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- QUESTION BANK PICKER DRAWER / MODAL --- */}
      {showQuestionBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#171545] max-w-4xl w-full p-6 space-y-6 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowQuestionBank(false)}
              className="absolute top-4 right-4 text-[#a5a3c9] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-indigo-900/40 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Question Bank Picker</h3>
                <p className="text-xs text-[#a5a3c9]">Select questions to attach to this examination paper.</p>
              </div>
            </div>

            {/* Filter Bar inside Modal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#a5a3c9] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search question keyword..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs focus:border-amber-400"
                />
              </div>

              <select
                value={bankSubject}
                onChange={(e) => setBankSubject(e.target.value)}
                className="px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs cursor-pointer"
              >
                <option value="All">Subject: All</option>
                {teacherSubjects.map(s => (
                  <option key={s._id} value={s.name}>{s.name}</option>
                ))}
              </select>

              <select
                value={bankDifficulty}
                onChange={(e) => setBankDifficulty(e.target.value)}
                className="px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs cursor-pointer"
              >
                <option value="All">Difficulty: All</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Questions Bank List inside Modal */}
            {bankLoading ? (
              <BrandedLoader message="Loading question bank items..." />
            ) : bankQuestions.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#a5a3c9]">
                No questions found in Question Bank matching filter.
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
                {bankQuestions.map((q) => {
                  const isSelected = selectedQuestions.some(item => item.questionId === q._id);
                  return (
                    <div
                      key={q._id}
                      className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-4 transition-colors ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-indigo-950/80 border-indigo-800/60 hover:bg-indigo-900/40 text-slate-200'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-white leading-relaxed line-clamp-2">{q.questionText}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {q.subject || 'General'}
                          </span>
                          <span className="text-[10px] text-[#a5a3c9] capitalize">
                            {q.type} | {q.difficulty} | {q.marks || 1} Pts
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => isSelected ? handleRemoveQuestion(q._id) : handleAddQuestion(q)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                          isSelected
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-600 hover:text-white'
                            : 'bg-amber-500 text-indigo-950 hover:bg-amber-400'
                        }`}
                      >
                        {isSelected ? 'Remove' : '+ Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-indigo-900/40 flex justify-end">
              <button
                type="button"
                onClick={() => setShowQuestionBank(false)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Done Selecting ({selectedQuestions.length} Added)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Exam Modal */}
      <DeleteExamModal
        exam={{ _id: id, title, code }}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={() => {
          navigate('/teacher');
        }}
      />

    </div>
  );
}
