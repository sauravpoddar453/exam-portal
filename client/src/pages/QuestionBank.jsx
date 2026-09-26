import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson, getApiUrl } from '../utils/api';
import { 
  HelpCircle, 
  Plus, 
  Upload, 
  Download, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  Sparkles,
  Layers,
  AlertCircle,
  FileText,
  AlertTriangle,
  Check,
  FileCode
} from 'lucide-react';

export default function QuestionBank() {
  const { token } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formError, setFormError] = useState(null);

  // Helper to map legacy/parsed correctAnswer string to matching option text
  const resolveInitialCorrectAnswer = (q) => {
    if (!q || !q.correctAnswer) return '';
    const rawAns = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer).trim();
    if (!q.options || q.options.length === 0) return rawAns;

    // Exact match in options
    if (q.options.includes(rawAns)) return rawAns;

    // Check letter label match e.g. "Option A", "A", "B)"
    const letterMatch = rawAns.match(/^(?:Option\s*)?([A-D])\)?$/i);
    if (letterMatch) {
      const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (q.options[idx]) return q.options[idx];
    }

    // Check numeric index e.g. "0", "1"
    if (/^\d+$/.test(rawAns)) {
      const idx = parseInt(rawAns, 10);
      if (q.options[idx]) return q.options[idx];
    }

    return rawAns;
  };

  // Question Form State
  const [formData, setFormData] = useState({
    questionText: '',
    type: 'mcq-single',
    options: ['', '', '', ''],
    correctAnswer: '',
    marks: 1,
    negativeMarks: 0,
    difficulty: 'medium',
    subject: 'General',
  });

  // Document (PDF / Word) Import State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showPdfReviewModal, setShowPdfReviewModal] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfError, setPdfError] = useState(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfImporting, setPdfImporting] = useState(false);
  const [pdfParsedQuestions, setPdfParsedQuestions] = useState([]);
  const [pdfParseMethod, setPdfParseMethod] = useState('');

  // Helper to cleanly reset Document upload modal state
  const resetPdfModalState = () => {
    setShowPdfModal(false);
    setPdfFile(null);
    setPdfFileName('');
    setPdfError(null);
    setPdfParsing(false);
  };

  // Handle Document (PDF or Word) File Selection
  const handlePdfFileChange = (e) => {
    setPdfError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPdfFile(null);
      setPdfFileName('');
      return;
    }
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.pdf') && !nameLower.endsWith('.docx')) {
      setPdfError('Selected file must be a PDF (.pdf) or Word document (.docx)');
      setPdfFile(null);
      setPdfFileName('');
      return;
    }
    setPdfFile(file);
    setPdfFileName(file.name);
  };

  // Upload Document (PDF or Word) and Extract Questions
  const handlePdfExtract = async () => {
    setPdfError(null);
    if (!pdfFile) {
      setPdfError('Please select a PDF or Word file to upload and parse.');
      return;
    }

    try {
      setPdfParsing(true);
      const formDataToSend = new FormData();
      formDataToSend.append('file', pdfFile);

      const res = await fetch(getApiUrl('/api/questions/import-document'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const parsedWithResolvedAnswers = (data.data || []).map(q => ({
          ...q,
          correctAnswer: resolveInitialCorrectAnswer(q),
        }));
        setPdfParsedQuestions(parsedWithResolvedAnswers);
        setPdfParseMethod(data.parseMethod || 'fixed-template');
        resetPdfModalState();
        setShowPdfReviewModal(true);
      } else {
        setPdfError(data.message || 'Failed to parse questions from document.');
      }
    } catch (err) {
      setPdfError('Connection error while processing document: ' + err.message);
    } finally {
      setPdfParsing(false);
    }
  };

  // Toggle selection for individual parsed question card
  const togglePdfQuestionSelection = (tempId) => {
    setPdfParsedQuestions(prev =>
      prev.map(q => (q.tempId === tempId ? { ...q, isIncluded: !q.isIncluded } : q))
    );
  };

  // Select all / Deselect all
  const toggleSelectAllPdf = (selectState) => {
    setPdfParsedQuestions(prev => prev.map(q => ({ ...q, isIncluded: selectState })));
  };

  // Update question field in review screen
  const updatePdfQuestion = (tempId, field, value) => {
    setPdfParsedQuestions(prev =>
      prev.map(q => {
        if (q.tempId !== tempId) return q;
        const updated = { ...q, [field]: value };
        
        // Handle options when switching type
        if (field === 'type') {
          if (value === 'true-false') {
            updated.options = ['True', 'False'];
            if (!['True', 'False'].includes(updated.correctAnswer)) {
              updated.correctAnswer = 'True';
            }
          } else if (value === 'short-answer') {
            updated.options = [];
          } else if (value === 'mcq-single') {
            if (!updated.options || updated.options.length === 0) {
              updated.options = ['Option A', 'Option B', 'Option C', 'Option D'];
            }
          }
        }

        // Recalculate warnings
        const warnings = [];
        const qText = updated.questionText || '';
        if (!qText || qText.trim().length < 3) {
          warnings.push('Question text is incomplete.');
        }
        if (updated.type === 'mcq-single') {
          if (!updated.options || updated.options.length < 2) {
            warnings.push('MCQ question has fewer than 2 options.');
          }
          if (!updated.correctAnswer) {
            warnings.push('Missing correct answer selection.');
          }
        } else if (updated.type === 'true-false') {
          if (!updated.correctAnswer) {
            warnings.push('Missing True/False correct answer.');
          }
        }
        return { ...updated, warnings, hasWarning: warnings.length > 0 };
      })
    );
  };

  // Update option text for MCQ
  const updatePdfOptionText = (tempId, optIndex, newText) => {
    setPdfParsedQuestions(prev =>
      prev.map(q => {
        if (q.tempId !== tempId) return q;
        const oldOptions = [...(q.options || [])];
        const oldVal = oldOptions[optIndex];
        oldOptions[optIndex] = newText;

        let newAns = q.correctAnswer;
        if (q.correctAnswer === oldVal) {
          newAns = newText;
        }

        const updated = { ...q, options: oldOptions, correctAnswer: newAns };
        const warnings = [];
        if (!updated.questionText || updated.questionText.trim().length < 3) {
          warnings.push('Question text is incomplete.');
        }
        if (updated.options.length < 2) {
          warnings.push('MCQ question has fewer than 2 options.');
        }
        if (!updated.correctAnswer) {
          warnings.push('Missing correct answer selection.');
        }
        return { ...updated, warnings, hasWarning: warnings.length > 0 };
      })
    );
  };

  // Add Option to MCQ
  const handlePdfAddOption = (tempId) => {
    setPdfParsedQuestions(prev =>
      prev.map(q => {
        if (q.tempId !== tempId) return q;
        const newOpts = [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`];
        return { ...q, options: newOpts };
      })
    );
  };

  // Remove Option from MCQ
  const handlePdfRemoveOption = (tempId, optIdx) => {
    setPdfParsedQuestions(prev =>
      prev.map(q => {
        if (q.tempId !== tempId) return q;
        const newOpts = (q.options || []).filter((_, idx) => idx !== optIdx);
        let newAns = q.correctAnswer;
        if (!newOpts.includes(newAns)) {
          newAns = newOpts[0] || '';
        }
        return { ...q, options: newOpts, correctAnswer: newAns };
      })
    );
  };

  // Remove question card
  const removePdfQuestionCard = (tempId) => {
    setPdfParsedQuestions(prev => prev.filter(q => q.tempId !== tempId));
  };

  // Topic section bulk tagging state
  const [selectedTopicSection, setSelectedTopicSection] = useState('All');
  const [bulkSubjectValue, setBulkSubjectValue] = useState('');

  const handleApplyBulkSubjectToTopic = () => {
    if (!bulkSubjectValue.trim()) {
      alert('Please enter a subject name to apply!');
      return;
    }
    setPdfParsedQuestions(prev =>
      prev.map(q => {
        const topicName = q.sectionTopic || q.subject || 'General';
        if (selectedTopicSection === 'All' || topicName === selectedTopicSection) {
          return { ...q, subject: bulkSubjectValue.trim(), sectionTopic: bulkSubjectValue.trim() };
        }
        return q;
      })
    );
    alert(`Applied subject "${bulkSubjectValue.trim()}" to questions!`);
  };

  // Confirm and save selected parsed questions to DB
  const handleConfirmPdfImport = async () => {
    const selectedQuestions = pdfParsedQuestions.filter(q => q.isIncluded);
    if (selectedQuestions.length === 0) {
      alert('Please select at least one question to import!');
      return;
    }

    const invalidMcqs = selectedQuestions.filter(q =>
      (q.type === 'mcq-single' || q.type === 'mcq-multiple') &&
      (!q.correctAnswer || (typeof q.correctAnswer === 'string' && !q.correctAnswer.trim()) || (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0))
    );

    if (invalidMcqs.length > 0) {
      alert(`Please select the correct answer for all MCQ questions (${invalidMcqs.length} question(s) missing correct answer selection).`);
      return;
    }

    try {
      setPdfImporting(true);
      const payload = selectedQuestions.map(q => ({
        questionText: q.questionText,
        type: q.type,
        options: q.type === 'true-false' ? ['True', 'False'] : (q.type === 'short-answer' ? [] : q.options),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        marks: Number(q.marks) || 1,
        negativeMarks: Number(q.negativeMarks) || 0,
        difficulty: q.difficulty || 'medium',
        subject: q.subject || 'General',
      }));

      const { ok, data } = await safeFetchJson('/api/questions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questions: payload }),
      });

      if (ok && data?.success) {
        alert(`Successfully imported ${data.count || selectedQuestions.length} question(s) into Question Bank!`);
        setShowPdfReviewModal(false);
        setPdfParsedQuestions([]);
        setPdfFile(null);
        setPdfFileName('');
        fetchQuestions();
      } else {
        alert(data?.message || 'Error saving questions to Question Bank.');
      }
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setPdfImporting(false);
    }
  };

  // Download Template in chosen format
  const downloadTemplate = (format = 'pdf') => {
    window.open(`/api/questions/template?format=${format}`, '_blank');
  };

  // Fetch Questions
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (subjectFilter !== 'All') queryParams.append('subject', subjectFilter);
      if (difficultyFilter !== 'All') queryParams.append('difficulty', difficultyFilter);
      if (typeFilter !== 'All') queryParams.append('type', typeFilter);

      const { ok, data } = await safeFetchJson(`/api/questions?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (ok && data?.success) {
        setQuestions(data.data || []);
      } else {
        throw new Error(data?.message || 'Failed to fetch questions');
      }
    } catch (err) {
      console.error('[QuestionBank] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, search, subjectFilter, difficultyFilter, typeFilter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Handle Form Open (New / Edit)
  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormError(null);
    const defaultOpts = ['Option A', 'Option B', 'Option C', 'Option D'];
    setFormData({
      questionText: '',
      type: 'mcq-single',
      options: defaultOpts,
      correctAnswer: defaultOpts[0],
      marks: 1,
      negativeMarks: 0,
      difficulty: 'medium',
      subject: 'Computer Science',
    });
    setShowFormModal(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setFormError(null);
    const resolvedOpts = Array.isArray(q.options) && q.options.length > 0 ? [...q.options] : ['Option A', 'Option B', 'Option C', 'Option D'];
    const resolvedAns = resolveInitialCorrectAnswer({ ...q, options: resolvedOpts });

    setFormData({
      questionText: q.questionText || '',
      type: q.type || 'mcq-single',
      options: resolvedOpts,
      correctAnswer: resolvedAns,
      marks: q.marks || 1,
      negativeMarks: q.negativeMarks || 0,
      difficulty: q.difficulty || 'medium',
      subject: q.subject || 'General',
    });
    setShowFormModal(true);
  };

  const handleTypeChange = (newType) => {
    let newOptions = [...formData.options];
    let newCorrect = formData.correctAnswer;

    if (newType === 'mcq-single' || newType === 'mcq-multiple') {
      if (!newOptions || newOptions.length < 2) {
        newOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
      }
      if (!newCorrect || !newOptions.includes(newCorrect)) {
        newCorrect = newOptions[0] || '';
      }
    } else if (newType === 'true-false') {
      newOptions = ['True', 'False'];
      if (!['True', 'False'].includes(newCorrect)) {
        newCorrect = 'True';
      }
    }

    setFormData({
      ...formData,
      type: newType,
      options: newOptions,
      correctAnswer: newCorrect,
    });
    setFormError(null);
  };

  // Submit Single Question Form (Create / Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // MCQ Validation
    if (formData.type === 'mcq-single' || formData.type === 'mcq-multiple') {
      const ans = formData.correctAnswer;
      const hasAnswer = Array.isArray(ans)
        ? ans.length > 0
        : (typeof ans === 'string' && ans.trim().length > 0);

      if (!hasAnswer) {
        setFormError('Please select the correct answer.');
        return;
      }

      if (formData.type === 'mcq-single' && (!formData.options.includes(formData.correctAnswer) || !formData.correctAnswer.trim())) {
        setFormError('Please select a valid non-empty option as the correct answer.');
        return;
      }
    }

    try {
      const isEdit = !!editingQuestion;
      const url = isEdit ? `/api/questions/${editingQuestion._id}` : '/api/questions';
      const method = isEdit ? 'PUT' : 'POST';

      const { ok, data } = await safeFetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (ok && data?.success) {
        alert(isEdit ? 'Question updated successfully!' : 'Question created successfully!');
        setShowFormModal(false);
        fetchQuestions();
      } else {
        setFormError(data?.message || 'Error saving question');
      }
    } catch (err) {
      setFormError('Failed to connect to API: ' + err.message);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const { ok, data } = await safeFetchJson(`/api/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setQuestions(prev => prev.filter(q => q._id !== id));
      } else {
        alert(data?.message || 'Error deleting question');
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const getDifficultyBadge = (diff) => {
    switch (diff) {
      case 'easy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'hard':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'mcq-single':
        return 'MCQ (Single)';
      case 'mcq-multiple':
        return 'MCQ (Multiple)';
      case 'true-false':
        return 'True / False';
      case 'short-answer':
        return 'Short Answer';
      case 'essay':
        return 'Essay / Long Answer';
      default:
        return type;
    }
  };

  const subjectsList = ['All', ...new Set(questions.map(q => q.subject || 'General'))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Question Bank</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Create, categorize, filter, and bulk upload test questions for exams.
          </p>
        </div>

        {/* Toolbar - Exactly Two Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPdfModal(true)}
            className="px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-red-600/20 cursor-pointer"
            title="Extract & import questions from PDF or Word files"
          >
            <FileText className="w-4 h-4" />
            Import from PDF/Word
          </button>

          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-semibold shadow-lg shadow-red-600/25 hover:scale-[1.02] transition-transform flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm"
          />
        </div>

        {/* Subject Filter */}
        <div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm cursor-pointer"
          >
            <option value="All">Subject: All</option>
            {subjectsList.filter(s => s !== 'All').map(sub => (
              <option key={sub} value={sub}>Subject: {sub}</option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm cursor-pointer"
          >
            <option value="All">Difficulty: All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm cursor-pointer"
          >
            <option value="All">Type: All</option>
            <option value="mcq-single">MCQ (Single)</option>
            <option value="mcq-multiple">MCQ (Multiple)</option>
            <option value="true-false">True / False</option>
            <option value="short-answer">Short Answer</option>
            <option value="essay">Essay</option>
          </select>
        </div>

      </div>

      {/* Questions Data Table */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-xs">Loading Question Bank items...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center text-red-600 text-xs">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="glass-card py-16 text-center text-gray-500 space-y-3">
          <HelpCircle className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="text-sm font-medium text-gray-700">No questions found matching criteria.</p>
          <p className="text-xs text-gray-500">
            Click "Add Question" to create one manually, or "Import from PDF/Word" to bulk upload questions.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-mono border-b border-gray-200">
                <tr>
                  <th className="p-4">Question Text</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Difficulty</th>
                  <th className="p-4 text-center">Marks (+/-)</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {questions.map((q) => (
                  <tr key={q._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 max-w-md">
                      <p className="font-medium text-gray-900 leading-relaxed line-clamp-2">{q.questionText}</p>
                      {Array.isArray(q.options) && q.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {q.options.map((opt, i) => (
                            <span
                              key={i}
                              className={`text-[10px] px-2 py-0.5 rounded ${
                                opt === q.correctAnswer || (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt))
                                  ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-[11px] font-medium text-gray-700">
                        {getTypeBadge(q.type)}
                      </span>
                    </td>

                    <td className="p-4 font-semibold text-red-600">
                      {q.subject}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase font-bold border ${getDifficultyBadge(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                    </td>

                    <td className="p-4 text-center font-mono font-bold">
                      <span className="text-emerald-600">+{q.marks}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-rose-600">-{q.negativeMarks || 0}</span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(q)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border border-gray-200 transition-colors"
                          title="Edit Question"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteQuestion(q._id)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            
            <button
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {editingQuestion ? 'Edit Question' : 'Create New Question'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Question Statement</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter the complete question prompt..."
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  className="w-full p-3 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Type, Subject, Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Question Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-red-500 cursor-pointer font-medium"
                  >
                    <option value="mcq-single">MCQ (Single Choice)</option>
                    <option value="mcq-multiple">MCQ (Multiple Choice)</option>
                    <option value="true-false">True / False</option>
                    <option value="short-answer">Short Answer</option>
                    <option value="essay">Essay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Subject Tag</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-red-500 cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* MCQ Options Configurator */}
              {(formData.type === 'mcq-single' || formData.type === 'mcq-multiple') && (
                <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800 block">MCQ Options Builder</span>
                    <span className="text-[11px] text-gray-500 font-normal">
                      {formData.type === 'mcq-single'
                        ? 'Click radio button to mark correct answer'
                        : 'Check boxes for correct answers'}
                    </span>
                  </div>

                  {formData.options.map((opt, idx) => {
                    const isSelected = formData.type === 'mcq-single'
                      ? formData.correctAnswer === opt
                      : (Array.isArray(formData.correctAnswer)
                          ? formData.correctAnswer.includes(opt)
                          : (typeof formData.correctAnswer === 'string' && formData.correctAnswer
                              ? formData.correctAnswer.split(', ').includes(opt)
                              : false));

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-red-50/80 border border-red-200 shadow-sm' : 'bg-white border border-gray-200'
                        }`}
                      >
                        {formData.type === 'mcq-single' ? (
                          <input
                            type="radio"
                            name="mcq-form-correct-answer"
                            checked={isSelected}
                            onChange={() => {
                              setFormData({ ...formData, correctAnswer: opt });
                              setFormError(null);
                            }}
                            className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 accent-red-600 cursor-pointer shrink-0"
                            title="Mark as correct answer"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              let currentArr = Array.isArray(formData.correctAnswer)
                                ? [...formData.correctAnswer]
                                : (typeof formData.correctAnswer === 'string' && formData.correctAnswer
                                    ? formData.correctAnswer.split(', ')
                                    : []);
                              if (e.target.checked) {
                                if (!currentArr.includes(opt)) currentArr.push(opt);
                              } else {
                                currentArr = currentArr.filter(item => item !== opt);
                              }
                              setFormData({ ...formData, correctAnswer: currentArr.join(', ') });
                              setFormError(null);
                            }}
                            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 accent-red-600 cursor-pointer shrink-0"
                            title="Mark as correct answer"
                          />
                        )}

                        <span className="text-xs font-mono font-bold text-gray-500 w-5">
                          {String.fromCharCode(65 + idx)}.
                        </span>

                        <input
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          value={opt}
                          onChange={(e) => {
                            const newText = e.target.value;
                            const oldText = formData.options[idx];
                            const newOpts = [...formData.options];
                            newOpts[idx] = newText;

                            let updatedAns = formData.correctAnswer;
                            if (formData.type === 'mcq-single') {
                              if (formData.correctAnswer === oldText) {
                                updatedAns = newText;
                              }
                            } else if (formData.type === 'mcq-multiple') {
                              let currentArr = Array.isArray(formData.correctAnswer)
                                ? [...formData.correctAnswer]
                                : (typeof formData.correctAnswer === 'string' && formData.correctAnswer
                                    ? formData.correctAnswer.split(', ')
                                    : []);
                              currentArr = currentArr.map(item => item === oldText ? newText : item);
                              updatedAns = currentArr.join(', ');
                            }

                            setFormData({ ...formData, options: newOpts, correctAnswer: updatedAns });
                            setFormError(null);
                          }}
                          className="flex-grow p-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-red-500"
                        />

                        {formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const removedText = formData.options[idx];
                              const newOpts = formData.options.filter((_, i) => i !== idx);
                              let updatedAns = formData.correctAnswer;
                              if (formData.type === 'mcq-single') {
                                if (formData.correctAnswer === removedText) {
                                  updatedAns = newOpts[0] || '';
                                }
                              }
                              setFormData({ ...formData, options: newOpts, correctAnswer: updatedAns });
                              setFormError(null);
                            }}
                            className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                            title="Remove option"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {formData.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextLetter = String.fromCharCode(65 + formData.options.length);
                        setFormData({
                          ...formData,
                          options: [...formData.options, `Option ${nextLetter}`]
                        });
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Option
                    </button>
                  )}
                </div>
              )}

              {/* Correct Answer Display / Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Correct Answer / Sample Solution
                </label>

                {formData.type === 'mcq-single' || formData.type === 'mcq-multiple' ? (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-gray-500 font-normal">Correct Answer:</span>
                    {(() => {
                      if (formData.type === 'mcq-single') {
                        const selectedIndex = formData.options.findIndex(o => o === formData.correctAnswer && o !== '');
                        if (selectedIndex >= 0 && formData.correctAnswer) {
                          return (
                            <span className="text-red-600 font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline shrink-0" />
                              {String.fromCharCode(65 + selectedIndex)}) {formData.correctAnswer}
                            </span>
                          );
                        }
                        return <span className="text-amber-600 font-normal italic">None selected — please click a radio button next to an option above</span>;
                      } else {
                        const selectedArr = Array.isArray(formData.correctAnswer)
                          ? formData.correctAnswer
                          : (typeof formData.correctAnswer === 'string' && formData.correctAnswer ? formData.correctAnswer.split(', ') : []);

                        const validSelected = selectedArr.map(ans => {
                          const idx = formData.options.findIndex(o => o === ans);
                          return idx >= 0 ? `${String.fromCharCode(65 + idx)}) ${ans}` : null;
                        }).filter(Boolean);

                        if (validSelected.length > 0) {
                          return (
                            <span className="text-red-600 font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline shrink-0" />
                              {validSelected.join(', ')}
                            </span>
                          );
                        }
                        return <span className="text-amber-600 font-normal italic">None selected — please check option boxes above</span>;
                      }
                    })()}
                  </div>
                ) : formData.type === 'true-false' ? (
                  <div className="flex gap-4 p-1">
                    {['True', 'False'].map(val => (
                      <label key={val} className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                        <input
                          type="radio"
                          name="tf-answer-radio-group"
                          checked={formData.correctAnswer === val}
                          onChange={() => {
                            setFormData({ ...formData, options: ['True', 'False'], correctAnswer: val });
                            setFormError(null);
                          }}
                          className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 accent-red-600 cursor-pointer"
                        />
                        {val}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Exact answer text or evaluation rubric"
                    value={formData.correctAnswer}
                    onChange={(e) => {
                      setFormData({ ...formData, correctAnswer: e.target.value });
                      setFormError(null);
                    }}
                    className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-red-500"
                  />
                )}
              </div>

              {/* Marks & Negative Marks */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Positive Marks (+)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Negative Marks (-)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={formData.negativeMarks}
                    onChange={(e) => setFormData({ ...formData, negativeMarks: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Inline Validation Error Message */}
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/25 cursor-pointer"
                >
                  {editingQuestion ? 'Save Changes' : 'Create Question'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 1. Document (PDF / Word) Upload Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Import Questions from PDF / Word</h3>
                  <p className="text-xs text-gray-500">Supports PDF (.pdf) and Word (.docx) files</p>
                </div>
              </div>
              <button
                onClick={resetPdfModalState}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content Body */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              {/* In-Modal Error Alert */}
              {pdfError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs text-red-900 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-red-950">Failed to Parse Document:</strong>
                      <p className="mt-0.5 text-red-700 leading-relaxed">{pdfError}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPdfError(null)}
                    className="px-2 py-1 rounded bg-white border border-red-200 text-red-700 font-bold hover:bg-red-100 transition-colors flex-shrink-0 text-[11px]"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Template Information & Downloads */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-red-600" />
                    Fixed Template Format (Recommended)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadTemplate('pdf')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold text-[11px] flex items-center gap-1 transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-red-600" />
                      Download PDF Template
                    </button>
                    <button
                      onClick={() => downloadTemplate('docx')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold text-[11px] flex items-center gap-1 transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      Download Word Template
                    </button>
                  </div>
                </div>

                <pre className="bg-white border border-gray-200 rounded-lg p-2.5 font-mono text-[11px] text-gray-700 overflow-x-auto leading-relaxed">
{`Q: What is the time complexity of binary search?
TYPE: MCQ
A) O(n)
B) O(log n)
C) O(n^2)
D) O(1)
ANSWER: B
MARKS: 2
NEGATIVE: 0.5
DIFFICULTY: medium
---
Q: The sky is blue.
TYPE: TRUEFALSE
ANSWER: TRUE
MARKS: 1
---
Q: Explain the concept of recursion.
TYPE: SHORTANSWER
MARKS: 5`}
                </pre>
              </div>

              {/* File Dropzone / Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">Select Document File (.pdf, .docx)</label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile) {
                      handlePdfFileChange({ target: { files: [droppedFile] } });
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors bg-gray-50/50 ${
                    pdfFile ? 'border-red-500 bg-red-50/30' : 'border-gray-300 hover:border-red-400'
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handlePdfFileChange}
                    className="hidden"
                    id="pdf-upload-input"
                  />
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`p-3 rounded-full ${pdfFile ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>
                      <Upload className="w-6 h-6" />
                    </div>
                    
                    {pdfFileName ? (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-100 text-red-800 font-extrabold text-xs border border-red-200">
                          <FileText className="w-4 h-4 text-red-600" />
                          {pdfFileName}
                        </div>
                        <div>
                          <label
                            htmlFor="pdf-upload-input"
                            className="inline-block px-3 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-[11px] font-semibold rounded-lg cursor-pointer transition-colors shadow-sm"
                          >
                            Change Selected File
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 font-medium">
                          Drag & drop your PDF or Word document here, or click below:
                        </p>
                        <label
                          htmlFor="pdf-upload-input"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm"
                        >
                          <Upload className="w-4 h-4" />
                          Browse / Choose File
                        </label>
                      </div>
                    )}

                    <span className="text-[10px] text-gray-400 block pt-1">
                      Accepted formats: .pdf, .docx (Max 15MB)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer Bar (Always Visible) */}
            <div className="flex gap-3 pt-4 border-t border-gray-100 flex-shrink-0 bg-white">
              <button
                onClick={resetPdfModalState}
                className="w-1/2 py-3 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePdfExtract}
                disabled={!pdfFile || pdfParsing}
                className="w-1/2 py-3 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 transition-colors shadow-md shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {pdfParsing ? (
                  <>
                    <span className="animate-spin text-white">⏳</span>
                    Parsing questions... Please wait
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Parse Questions
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Review Parsed Questions Modal */}
      {showPdfReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Header Banner */}
            <div className="p-5 border-b border-gray-200 bg-gray-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                    Review Extracted Questions
                  </h2>
                  <p className="text-xs text-gray-500">
                    Verify, edit, or exclude extracted questions before adding them to your Question Bank.
                  </p>
                </div>
              </div>

              {/* Status Stats Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium border border-gray-200">
                  Total Parsed: <strong>{pdfParsedQuestions.length}</strong>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Need Review: <strong>{pdfParsedQuestions.filter(q => q.hasWarning).length}</strong>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Selected: <strong>{pdfParsedQuestions.filter(q => q.isIncluded).length}</strong>
                </span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-5 py-3 border-b border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSelectAllPdf(true)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={() => toggleSelectAllPdf(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors cursor-pointer"
                >
                  Deselect All
                </button>
              </div>

              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <span>Extraction Mode:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold border border-red-200 text-[11px] capitalize">
                  {pdfParseMethod || 'Fixed Template'}
                </span>
              </div>
            </div>

            {/* Topic Sections Bulk Tagging Bar */}
            {pdfParsedQuestions.length > 0 && (
              <div className="px-5 py-2.5 bg-red-50/60 border-b border-red-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-red-900 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-red-600" />
                    Detected Topic Sections:
                  </span>
                  <select
                    value={selectedTopicSection}
                    onChange={(e) => setSelectedTopicSection(e.target.value)}
                    className="text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                  >
                    {['All', ...new Set(pdfParsedQuestions.map(q => q.sectionTopic || q.subject || 'General'))].map((topic, i) => (
                      <option key={i} value={topic}>
                        {topic} ({topic === 'All' ? pdfParsedQuestions.length : pdfParsedQuestions.filter(q => (q.sectionTopic || q.subject || 'General') === topic).length} Qs)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Set Target Subject/Tag (e.g. Reasoning)"
                    value={bulkSubjectValue}
                    onChange={(e) => setBulkSubjectValue(e.target.value)}
                    className="text-xs text-gray-900 bg-white border border-gray-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 w-52"
                  />
                  <button
                    onClick={handleApplyBulkSubjectToTopic}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Bulk Tag Topic Section
                  </button>
                </div>
              </div>
            )}

            {/* Extracted Questions Cards Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
              {pdfParsedQuestions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No questions found in uploaded document.</p>
                  <p className="text-xs text-gray-400 mt-1">Please ensure the document is text-based or follows the template format.</p>
                </div>
              ) : (
                pdfParsedQuestions.map((q, idx) => (
                  <div
                    key={q.tempId}
                    className={`bg-white border rounded-xl p-4 shadow-sm space-y-4 transition-all ${
                      q.isIncluded ? 'border-gray-200' : 'border-gray-200 opacity-60 bg-gray-50'
                    } ${q.hasWarning ? 'ring-1 ring-amber-400 border-amber-300' : ''}`}
                  >
                    {/* Top Bar */}
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!q.isIncluded}
                          onChange={() => togglePdfQuestionSelection(q.tempId)}
                          className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                        />
                        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        
                        {/* Type Selector */}
                        <select
                          value={q.type}
                          onChange={(e) => updatePdfQuestion(q.tempId, 'type', e.target.value)}
                          className="text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                        >
                          <option value="mcq-single">MCQ (Single Answer)</option>
                          <option value="true-false">True / False</option>
                          <option value="short-answer">Short Answer</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 font-medium">Marks:</span>
                          <input
                            type="number"
                            min="1"
                            value={q.marks}
                            onChange={(e) => updatePdfQuestion(q.tempId, 'marks', e.target.value)}
                            className="w-14 text-xs font-bold text-gray-800 bg-white border border-gray-300 rounded-lg px-2 py-0.5 text-center"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 font-medium">Difficulty:</span>
                          <select
                            value={q.difficulty}
                            onChange={(e) => updatePdfQuestion(q.tempId, 'difficulty', e.target.value)}
                            className="text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg px-2 py-0.5 capitalize cursor-pointer"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>

                        <button
                          onClick={() => removePdfQuestionCard(q.tempId)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Discard question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Warning Alert Badge */}
                    {q.hasWarning && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2 text-xs text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>
                          <strong>Needs Review:</strong> {q.warnings.join(' | ')}
                        </span>
                      </div>
                    )}

                    {/* Question Text Textarea */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Question Text
                      </label>
                      <textarea
                        rows={2}
                        value={q.questionText}
                        onChange={(e) => updatePdfQuestion(q.tempId, 'questionText', e.target.value)}
                        className="w-full text-xs font-medium text-gray-900 bg-white border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter question text..."
                      />
                    </div>

                    {/* MCQ Options List */}
                    {(q.type === 'mcq-single' || q.type === 'mcq-multiple') && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Options Builder
                          </label>
                          <button
                            type="button"
                            onClick={() => handlePdfAddOption(q.tempId)}
                            className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Option
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(q.options || []).map((opt, optIdx) => {
                            const isOptSelected = q.type === 'mcq-single'
                              ? q.correctAnswer === opt
                              : (Array.isArray(q.correctAnswer)
                                  ? q.correctAnswer.includes(opt)
                                  : (typeof q.correctAnswer === 'string' && q.correctAnswer
                                      ? q.correctAnswer.split(', ').includes(opt)
                                      : false));

                            return (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-2 p-1.5 rounded-lg border transition-colors ${
                                  isOptSelected ? 'bg-red-50/80 border-red-200' : 'bg-white border-gray-200'
                                }`}
                              >
                                <input
                                  type={q.type === 'mcq-single' ? 'radio' : 'checkbox'}
                                  name={`pdf-mcq-correct-${q.tempId}`}
                                  checked={isOptSelected}
                                  onChange={(e) => {
                                    if (q.type === 'mcq-single') {
                                      updatePdfQuestion(q.tempId, 'correctAnswer', opt);
                                    } else {
                                      let currentArr = Array.isArray(q.correctAnswer)
                                        ? [...q.correctAnswer]
                                        : (typeof q.correctAnswer === 'string' && q.correctAnswer
                                            ? q.correctAnswer.split(', ')
                                            : []);
                                      if (e.target.checked) {
                                        if (!currentArr.includes(opt)) currentArr.push(opt);
                                      } else {
                                        currentArr = currentArr.filter(item => item !== opt);
                                      }
                                      updatePdfQuestion(q.tempId, 'correctAnswer', currentArr.join(', '));
                                    }
                                  }}
                                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 accent-red-600 cursor-pointer shrink-0"
                                  title="Mark as correct answer"
                                />

                                <span className="font-mono text-xs font-bold text-gray-500 w-5">
                                  {String.fromCharCode(65 + optIdx)})
                                </span>

                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => updatePdfOptionText(q.tempId, optIdx, e.target.value)}
                                  className="flex-1 text-xs text-gray-800 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                                  placeholder={`Option ${optIdx + 1}`}
                                />

                                <button
                                  type="button"
                                  onClick={() => handlePdfRemoveOption(q.tempId, optIdx)}
                                  className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Correct Answer Display / Selector */}
                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Correct Answer
                      </label>

                      {q.type === 'mcq-single' || q.type === 'mcq-multiple' ? (
                        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-gray-500 font-normal">Selected:</span>
                          {(() => {
                            if (q.type === 'mcq-single') {
                              const selectedIdx = (q.options || []).findIndex(o => o === q.correctAnswer && o !== '');
                              if (selectedIdx >= 0 && q.correctAnswer) {
                                return (
                                  <span className="text-red-600 font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                                    {String.fromCharCode(65 + selectedIdx)}) {q.correctAnswer}
                                  </span>
                                );
                              }
                              return <span className="text-amber-600 font-normal italic">None selected — please click a radio button above</span>;
                            } else {
                              const selectedArr = Array.isArray(q.correctAnswer)
                                ? q.correctAnswer
                                : (typeof q.correctAnswer === 'string' && q.correctAnswer ? q.correctAnswer.split(', ') : []);

                              const validSelected = selectedArr.map(ans => {
                                const idx = (q.options || []).findIndex(o => o === ans);
                                return idx >= 0 ? `${String.fromCharCode(65 + idx)}) ${ans}` : null;
                              }).filter(Boolean);

                              if (validSelected.length > 0) {
                                return (
                                  <span className="text-red-600 font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                                    {validSelected.join(', ')}
                                  </span>
                                );
                              }
                              return <span className="text-amber-600 font-normal italic">None selected — please check option boxes above</span>;
                            }
                          })()}
                        </div>
                      ) : q.type === 'true-false' ? (
                        <select
                          value={q.correctAnswer}
                          onChange={(e) => updatePdfQuestion(q.tempId, 'correctAnswer', e.target.value)}
                          className="w-full text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                        >
                          <option value="True">True</option>
                          <option value="False">False</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={q.correctAnswer}
                          onChange={(e) => updatePdfQuestion(q.tempId, 'correctAnswer', e.target.value)}
                          className="w-full text-xs text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Enter expected key answer / model keywords..."
                        />
                      )}
                    </div>

                    {/* Explanation / Solution Note */}
                    <div className="pt-2 border-t border-gray-100">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-red-600" />
                        Explanation / Solution Note (Shown to candidates after exam review)
                      </label>
                      <textarea
                        rows={2}
                        value={q.explanation || ''}
                        onChange={(e) => updatePdfQuestion(q.tempId, 'explanation', e.target.value)}
                        className="w-full text-xs text-gray-800 bg-red-50/40 border border-red-100 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter solution explanation, steps, or formula notes..."
                      />
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Sticky Bottom Actions Bar */}
            <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between gap-4">
              <span className="text-xs text-gray-600 font-medium">
                Ready to import:{' '}
                <strong className="text-red-600 font-extrabold">
                  {pdfParsedQuestions.filter(q => q.isIncluded).length}
                </strong>{' '}
                of {pdfParsedQuestions.length} questions
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowPdfReviewModal(false);
                    setPdfParsedQuestions([]);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPdfImport}
                  disabled={pdfImporting || pdfParsedQuestions.filter(q => q.isIncluded).length === 0}
                  className="px-6 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {pdfImporting ? (
                    'Saving to Question Bank...'
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Import ({pdfParsedQuestions.filter(q => q.isIncluded).length} Questions)
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
