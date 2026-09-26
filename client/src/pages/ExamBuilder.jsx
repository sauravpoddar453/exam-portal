import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
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

  // Fetch Teacher's Courses
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {id ? 'Edit Examination' : 'Exam Builder Studio'}
            </h1>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Assign exam to your Course, configure timing rules, pick questions from Question Bank, and publish.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {id && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Exam
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/teacher')}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmitExam}
            disabled={saving || (!id && teacherCourses.length === 0)}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md shadow-red-600/20 hover:scale-[1.02] transition-transform flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Publishing...' : id ? 'Update Exam' : 'Publish Examination'}
          </button>
        </div>
      </div>

      {/* Warning Alert if No Courses Created */}
      {!coursesLoading && teacherCourses.length === 0 && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-gray-900">No Courses Available</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                You cannot create an exam without first having at least one course. Please create a course first on your Teacher Dashboard.
              </p>
            </div>
          </div>

          <Link
            to="/teacher"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm flex-shrink-0"
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
          <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-md space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-200 pb-3">
              <BookOpen className="w-4 h-4 text-red-600" />
              General Exam Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target Course / Batch *</label>
              <select
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:border-red-600 focus:ring-1 focus:ring-red-600 font-medium"
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">Exam Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. CS101 Midterm Examination"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Exam Code (Unique) *</label>
              <input
                type="text"
                required
                placeholder="e.g. CS101-MID"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs uppercase font-mono focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Subject / Domain Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Instructions</label>
              <textarea
                rows={3}
                placeholder="Instructions for candidate students..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>
          </div>

          {/* Timing & Scoring Parameters */}
          <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-md space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-200 pb-3">
              <Clock className="w-4 h-4 text-red-600" />
              Timing & Passing Thresholds
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Window</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white border border-gray-300 text-gray-900 text-[11px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">End Window</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white border border-gray-300 text-gray-900 text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Passing Marks</label>
                <input
                  type="number"
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Attempts Allowed</label>
                <input
                  type="number"
                  min="1"
                  value={attemptsAllowed}
                  onChange={(e) => setAttemptsAllowed(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Exam Rule Toggles */}
          <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-md space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-200 pb-3">
              <Sliders className="w-4 h-4 text-red-600" />
              Exam Execution Rules
            </h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">Shuffle Questions</span>
                  <span className="text-[10px] text-gray-500">Randomize question sequence for candidates</span>
                </div>
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">Shuffle Options</span>
                  <span className="text-[10px] text-gray-500">Randomize MCQ choice options A/B/C/D</span>
                </div>
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">Negative Marking</span>
                  <span className="text-[10px] text-gray-500">Deduct penalty marks for incorrect answers</span>
                </div>
                <input
                  type="checkbox"
                  checked={negativeMarking}
                  onChange={(e) => setNegativeMarking(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-0"
                />
              </label>
            </div>
          </div>

        </div>

        {/* Right Col: Question Manager */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-red-600" />
                  Selected Questions ({selectedQuestions.length})
                </h3>
                <span className="text-xs text-gray-500">
                  Total Exam Score: <strong className="text-emerald-700">{calculatedTotalMarks} Points</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowQuestionBank(true)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Pick From Question Bank
              </button>
            </div>

            {/* Selected Questions List */}
            {selectedQuestions.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl p-6 space-y-3 bg-gray-50">
                <HelpCircle className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-xs font-semibold text-gray-700">No questions added to this exam yet.</p>
                <p className="text-xs text-gray-500">
                  Click "Pick From Question Bank" above to select and order items.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedQuestions.map((q, idx) => (
                  <div
                    key={q.questionId}
                    className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-red-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 border border-red-200">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 leading-relaxed">{q.questionText}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                          <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-mono uppercase">{q.type}</span>
                          <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-red-700">{q.subject}</span>
                          <span className="text-gray-500">Default: {q.defaultMarks} pts</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      
                      {/* Marks Override */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 font-semibold">Marks:</span>
                        <input
                          type="number"
                          step="0.5"
                          placeholder={String(q.defaultMarks)}
                          value={q.marksOverride !== null && q.marksOverride !== undefined ? q.marksOverride : ''}
                          onChange={(e) => handleMarksOverrideChange(idx, e.target.value)}
                          className="w-14 p-1 rounded-lg bg-white border border-gray-300 text-center text-xs text-emerald-700 font-bold"
                          title="Override points for this question"
                        />
                      </div>

                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, -1)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, 1)}
                          disabled={idx === selectedQuestions.length - 1}
                          className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.questionId)}
                        className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50"
                        title="Remove question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Question Bank Picker Modal / Drawer */}
      {showQuestionBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white max-w-4xl w-full p-6 space-y-6 border border-gray-200 shadow-2xl rounded-2xl relative max-h-[90vh] flex flex-col">
            
            <button
              onClick={() => setShowQuestionBank(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Select Questions from Question Bank</h3>
                <p className="text-xs text-gray-500">Click to add items to your examination paper.</p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search text..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs"
                />
              </div>

              <div>
                <select
                  value={bankSubject}
                  onChange={(e) => setBankSubject(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs"
                >
                  <option value="All">Subject: All</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Database Systems">Database Systems</option>
                </select>
              </div>

              <div>
                <select
                  value={bankDifficulty}
                  onChange={(e) => setBankDifficulty(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs"
                >
                  <option value="All">Difficulty: All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto space-y-2 pr-1 max-h-96">
              {bankLoading ? (
                <div className="py-12 text-center text-xs text-gray-500">Loading Question Bank...</div>
              ) : bankQuestions.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">No questions found matching criteria.</div>
              ) : (
                bankQuestions.map((q) => {
                  const isSelected = selectedQuestions.some(item => item.questionId === q._id);
                  return (
                    <div
                      key={q._id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                        isSelected
                          ? 'bg-red-50/50 border-red-200'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{q.questionText}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                          <span className="font-mono text-red-600 font-bold uppercase">{q.type}</span>
                          <span>•</span>
                          <span className="text-gray-700">{q.subject}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold">+{q.marks} pts</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => isSelected ? handleRemoveQuestion(q._id) : handleAddQuestion(q)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white'
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <MinusCircle className="w-3.5 h-3.5" /> Remove
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> Add to Exam
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center text-xs">
              <span className="text-gray-600">Selected in Exam: <strong className="text-gray-900">{selectedQuestions.length} Items</strong></span>
              <button
                type="button"
                onClick={() => setShowQuestionBank(false)}
                className="px-5 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black"
              >
                Done Selection
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Exam Modal */}
      <DeleteExamModal
        exam={id ? { _id: id, title, code } : null}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={(msg) => {
          alert(msg || 'Exam deleted successfully.');
          navigate('/teacher');
        }}
      />

    </div>
  );
}
