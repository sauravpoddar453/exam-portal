import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson, getApiUrl } from '../utils/api';
import BrandedLoader from '../components/BrandedLoader';
import { 
  HelpCircle, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  FileText, 
  AlertCircle,
  FolderPlus,
  BookMarked,
  Tag,
  Check,
  ChevronDown,
  Layers
} from 'lucide-react';

export default function QuestionBank() {
  const { token } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
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

  // Manage Subjects Modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [subjectError, setSubjectError] = useState(null);
  const [subjectSubmitting, setSubjectSubmitting] = useState(false);

  // Inline Subject Creation inside Question Form
  const [showInlineNewSubject, setShowInlineNewSubject] = useState(false);
  const [inlineSubjectInput, setInlineSubjectInput] = useState('');

  // Helper to map legacy/parsed correctAnswer string to matching option text
  const resolveInitialCorrectAnswer = (q) => {
    if (!q || !q.correctAnswer) return '';
    const rawAns = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer).trim();
    if (!q.options || q.options.length === 0) return rawAns;

    if (q.options.includes(rawAns)) return rawAns;

    const letterMatch = rawAns.match(/^(?:Option\s*)?([A-D])\)?$/i);
    if (letterMatch) {
      const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (q.options[idx]) return q.options[idx];
    }

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

  // Fetch Subjects
  const fetchSubjects = useCallback(async () => {
    setSubjectsLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/subjects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setSubjects(data.data || []);
      }
    } catch (err) {
      console.error('[QuestionBank] Failed to load subjects:', err);
    } finally {
      setSubjectsLoading(false);
    }
  }, [token]);

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
        headers: { Authorization: `Bearer ${token}` },
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
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Handle Create Subject
  const handleAddSubject = async (nameToCreate) => {
    const targetName = (nameToCreate || newSubjectInput).trim();
    if (!targetName) return null;

    setSubjectError(null);
    setSubjectSubmitting(true);
    try {
      const { ok, data } = await safeFetchJson('/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: targetName }),
      });

      if (ok && data?.success) {
        setNewSubjectInput('');
        setInlineSubjectInput('');
        setShowInlineNewSubject(false);
        await fetchSubjects();
        return data.data;
      } else {
        setSubjectError(data?.message || 'Failed to create subject');
        return null;
      }
    } catch (err) {
      setSubjectError('Error: ' + err.message);
      return null;
    } finally {
      setSubjectSubmitting(false);
    }
  };

  // Handle Delete Subject
  const handleDeleteSubject = async (subjectObj, force = false) => {
    if (!subjectObj) return;

    try {
      const url = `/api/subjects/${subjectObj._id}${force ? '?force=true' : ''}`;
      const { ok, data } = await safeFetchJson(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (ok && data?.success) {
        alert(data.message);
        fetchSubjects();
        fetchQuestions();
      } else if (data?.requiresConfirmation) {
        const confirmDelete = window.confirm(
          `Subject "${subjectObj.name}" is currently assigned to ${data.questionsCount} question(s).\n\nDeleting it will reassign these questions to "General". Do you want to proceed?`
        );
        if (confirmDelete) {
          handleDeleteSubject(subjectObj, true);
        }
      } else {
        alert(data?.message || 'Error deleting subject');
      }
    } catch (err) {
      alert('Failed to delete subject: ' + err.message);
    }
  };

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
          subject: q.subject || q.sectionTopic || 'General',
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

  // Remove question card from import preview
  const removePdfQuestionCard = (tempId) => {
    setPdfParsedQuestions(prev => prev.filter(q => q.tempId !== tempId));
  };

  // Topic section bulk tagging state for PDF import
  const [selectedTopicSection, setSelectedTopicSection] = useState('All');
  const [bulkSubjectValue, setBulkSubjectValue] = useState('');

  const handleApplyBulkSubjectToTopic = () => {
    if (!bulkSubjectValue.trim()) {
      alert('Please select or enter a subject name!');
      return;
    }
    const cleanVal = bulkSubjectValue.trim();
    setPdfParsedQuestions(prev =>
      prev.map(q => {
        const topicName = q.sectionTopic || q.subject || 'General';
        if (selectedTopicSection === 'All' || topicName === selectedTopicSection) {
          return { ...q, subject: cleanVal, sectionTopic: cleanVal };
        }
        return q;
      })
    );
    alert(`Applied subject "${cleanVal}" to selected questions!`);
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
        fetchSubjects();
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

  // Download Template
  const downloadTemplate = (format = 'pdf') => {
    window.open(`/api/questions/template?format=${format}`, '_blank');
  };

  // Handle Form Open (New / Edit)
  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormError(null);
    setShowInlineNewSubject(false);
    setInlineSubjectInput('');
    const defaultOpts = ['Option A', 'Option B', 'Option C', 'Option D'];
    const initialSubject = subjects.length > 0 ? subjects[0].name : 'General';
    setFormData({
      questionText: '',
      type: 'mcq-single',
      options: defaultOpts,
      correctAnswer: defaultOpts[0],
      marks: 1,
      negativeMarks: 0,
      difficulty: 'medium',
      subject: initialSubject,
    });
    setShowFormModal(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setFormError(null);
    setShowInlineNewSubject(false);
    setInlineSubjectInput('');
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

  // Create subject inline from inside Question Form
  const handleInlineSubjectCreate = async () => {
    if (!inlineSubjectInput.trim()) return;
    const created = await handleAddSubject(inlineSubjectInput);
    if (created) {
      setFormData(prev => ({ ...prev, subject: created.name }));
      setShowInlineNewSubject(false);
      setInlineSubjectInput('');
    }
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
        fetchSubjects();
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
        fetchSubjects();
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
        return 'bg-teal-500/10 text-teal-300 border-teal-500/20';
      case 'hard':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
      case 'medium':
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
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
        return 'Essay';
      default:
        return type;
    }
  };

  // Combine subjects list with counts for tabs
  const allSubjectNames = [...new Set([...subjects.map(s => s.name), ...questions.map(q => q.subject || 'General')])];

  // Subject counts map
  const subjectCounts = {};
  questions.forEach(q => {
    const sName = q.subject || 'General';
    subjectCounts[sName] = (subjectCounts[sName] || 0) + 1;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-900/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#f4f4f8] tracking-tight">Question Bank</h1>
          </div>
          <p className="text-[#a5a3c9] text-sm mt-1">
            Organize questions by Subject, manage categories, and bulk import test papers.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-amber-400 hover:bg-indigo-900/40 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            title="Manage Subject Categories"
          >
            <FolderPlus className="w-4 h-4 text-amber-400" />
            Manage Subjects ({subjects.length})
          </button>

          <button
            onClick={() => setShowPdfModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-950/80 border border-amber-500/20 text-slate-200 hover:bg-indigo-900/40 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            title="Extract & import questions from PDF or Word files"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            Import from PDF/Word
          </button>

          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-transform flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>

      {/* Subject Filter Tab Bar */}
      <div className="glass-card p-2 rounded-2xl border border-amber-500/15 overflow-x-auto scrollbar-none flex items-center gap-1">
        <button
          onClick={() => setSubjectFilter('All')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            subjectFilter === 'All'
              ? 'bg-amber-500 text-indigo-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-[#a5a3c9] hover:bg-indigo-900/40 hover:text-white'
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          All Subjects ({questions.length})
        </button>

        {allSubjectNames.map((subjName) => {
          const count = subjectCounts[subjName] || 0;
          const isSelected = subjectFilter === subjName;
          return (
            <button
              key={subjName}
              onClick={() => setSubjectFilter(subjName)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-amber-500 text-indigo-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-[#a5a3c9] hover:bg-indigo-900/40 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5 opacity-80" />
              <span>{subjName}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isSelected ? 'bg-indigo-950 text-amber-400' : 'bg-indigo-950 border border-indigo-800 text-slate-300'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Additional Secondary Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#a5a3c9] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white placeholder:text-[#a5a3c9] text-xs focus:outline-none focus:border-amber-400 shadow-sm"
          />
        </div>

        {/* Difficulty Filter */}
        <div>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs focus:outline-none focus:border-amber-400 shadow-sm cursor-pointer"
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
            className="w-full px-4 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs focus:outline-none focus:border-amber-400 shadow-sm cursor-pointer"
          >
            <option value="All">Type: All</option>
            <option value="mcq-single">MCQ (Single Answer)</option>
            <option value="mcq-multiple">MCQ (Multiple Answers)</option>
            <option value="true-false">True / False</option>
            <option value="short-answer">Short Answer</option>
            <option value="essay">Essay</option>
          </select>
        </div>
      </div>

      {/* Questions Table */}
      {loading ? (
        <BrandedLoader message="Loading Question Bank items..." />
      ) : error ? (
        <div className="glass-card p-6 text-center text-rose-300 text-xs border border-rose-500/20">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
          {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="glass-card py-16 text-center text-[#a5a3c9] space-y-3 border border-amber-500/15">
          <HelpCircle className="w-12 h-12 text-[#a5a3c9] mx-auto opacity-60" />
          <p className="text-sm font-medium text-white">No questions found matching criteria.</p>
          <p className="text-xs text-[#a5a3c9]">
            Click "Add Question" to create one manually, or "Import from PDF/Word" to bulk upload questions.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-amber-500/15 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-indigo-950/90 text-[#a5a3c9] uppercase text-[10px] font-mono border-b border-indigo-900/60">
              <tr>
                <th className="p-4">Question Prompt</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Type</th>
                <th className="p-4">Difficulty</th>
                <th className="p-4">Marks</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-900/40">
              {questions.map((q) => (
                <tr key={q._id} className="hover:bg-indigo-900/30 transition-colors">
                  <td className="p-4 max-w-md">
                    <p className="font-bold text-white leading-relaxed line-clamp-2">{q.questionText}</p>
                    {q.options && q.options.length > 0 && (
                      <span className="text-[11px] text-[#a5a3c9] block mt-1">
                        Options: {q.options.join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {q.subject || 'General'}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-200">
                    {getTypeBadge(q.type)}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${getDifficultyBadge(q.difficulty)}`}>
                      {q.difficulty || 'medium'}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-teal-400">
                    +{q.marks || 1}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(q)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-indigo-950 text-xs font-semibold transition-all cursor-pointer"
                      title="Edit Question"
                    >
                      <Edit3 className="w-3.5 h-3.5 inline" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q._id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL: MANAGE SUBJECTS --- */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#171545] max-w-lg w-full p-6 space-y-6 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white">
            <button
              onClick={() => setShowSubjectModal(false)}
              className="absolute top-4 right-4 text-[#a5a3c9] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-indigo-900/40 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <FolderPlus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Manage Subject Categories</h3>
            </div>

            {/* Add New Subject Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#a5a3c9]">Create New Subject Category</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Data Structures, Aptitude, React JS"
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  className="flex-grow px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
                <button
                  onClick={() => handleAddSubject()}
                  disabled={subjectSubmitting || !newSubjectInput.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-indigo-950 font-bold hover:bg-amber-400 text-xs disabled:opacity-50 cursor-pointer"
                >
                  Create
                </button>
              </div>
              {subjectError && (
                <p className="text-xs text-rose-400 mt-1">{subjectError}</p>
              )}
            </div>

            {/* Existing Subjects List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white">Your Created Subjects ({subjects.length}):</span>
              {subjectsLoading ? (
                <div className="text-xs text-[#a5a3c9] py-4 text-center">Loading subjects...</div>
              ) : subjects.length === 0 ? (
                <div className="text-xs text-[#a5a3c9] p-4 bg-indigo-950 rounded-xl text-center border border-indigo-800">
                  No custom subjects created yet. Default subject is "General".
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {subjects.map(s => (
                    <div key={s._id} className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-xs">
                      <span className="font-semibold text-white">{s.name}</span>
                      <button
                        onClick={() => handleDeleteSubject(s)}
                        className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10 cursor-pointer"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT QUESTION --- */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#171545] max-w-2xl w-full p-6 space-y-6 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 text-[#a5a3c9] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-indigo-900/40 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {editingQuestion ? 'Edit Question' : 'Create New Question'}
              </h3>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              
              {/* Question Text */}
              <div>
                <label className="block font-semibold text-[#a5a3c9] mb-1">Question Statement / Prompt *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter clear question statement..."
                  value={formData.questionText}
                  onChange={(e) => setFormData(prev => ({ ...prev, questionText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Subject & Type Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-[#a5a3c9]">Subject Category *</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineNewSubject(!showInlineNewSubject)}
                      className="text-[11px] text-amber-400 hover:underline font-semibold"
                    >
                      + New Subject
                    </button>
                  </div>

                  {showInlineNewSubject ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Subject name..."
                        value={inlineSubjectInput}
                        onChange={(e) => setInlineSubjectInput(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-indigo-950 border border-indigo-800 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={handleInlineSubjectCreate}
                        className="px-2 py-1 bg-amber-500 text-indigo-950 font-bold rounded-lg text-xs"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white cursor-pointer"
                    >
                      {allSubjectNames.map(sName => (
                        <option key={sName} value={sName}>{sName}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-[#a5a3c9] mb-1">Question Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      let newOpts = formData.options;
                      let newAns = formData.correctAnswer;

                      if (newType === 'true-false') {
                        newOpts = ['True', 'False'];
                        newAns = 'True';
                      } else if (newType === 'mcq-single') {
                        if (!newOpts || newOpts.length === 0) newOpts = ['Option A', 'Option B', 'Option C', 'Option D'];
                        newAns = newOpts[0];
                      }
                      setFormData(prev => ({ ...prev, type: newType, options: newOpts, correctAnswer: newAns }));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white cursor-pointer"
                  >
                    <option value="mcq-single">MCQ (Single Answer)</option>
                    <option value="mcq-multiple">MCQ (Multiple Answers)</option>
                    <option value="true-false">True / False</option>
                    <option value="short-answer">Short Answer</option>
                    <option value="essay">Essay</option>
                  </select>
                </div>
              </div>

              {/* Options for MCQ / True-False */}
              {(formData.type === 'mcq-single' || formData.type === 'mcq-multiple') && (
                <div className="space-y-2 p-3 bg-indigo-950/60 rounded-xl border border-indigo-800/80">
                  <span className="font-semibold text-white block">Multiple Choice Options & Correct Answer Selection:</span>
                  {formData.options.map((optText, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={formData.correctAnswer === optText}
                        onChange={() => setFormData(prev => ({ ...prev, correctAnswer: optText }))}
                        className="text-amber-400 focus:ring-amber-400"
                      />
                      <input
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={optText}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updatedOpts = [...formData.options];
                          const oldVal = updatedOpts[idx];
                          updatedOpts[idx] = val;
                          let updatedAns = formData.correctAnswer;
                          if (updatedAns === oldVal) updatedAns = val;
                          setFormData(prev => ({ ...prev, options: updatedOpts, correctAnswer: updatedAns }));
                        }}
                        className="flex-grow px-3 py-1.5 rounded-lg bg-indigo-950 border border-indigo-800 text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {formData.type === 'true-false' && (
                <div className="space-y-2 p-3 bg-indigo-950/60 rounded-xl border border-indigo-800/80">
                  <span className="font-semibold text-white block">Select Correct Answer:</span>
                  <div className="flex gap-4">
                    {['True', 'False'].map((tf) => (
                      <label key={tf} className="flex items-center gap-2 cursor-pointer text-white">
                        <input
                          type="radio"
                          name="tfOption"
                          value={tf}
                          checked={formData.correctAnswer === tf}
                          onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                          className="text-amber-400 focus:ring-amber-400"
                        />
                        <span>{tf}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Marks & Difficulty */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#a5a3c9] mb-1">Marks *</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.marks}
                    onChange={(e) => setFormData(prev => ({ ...prev, marks: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#a5a3c9] mb-1">Negative Marks</label>
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={formData.negativeMarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, negativeMarks: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#a5a3c9] mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-indigo-900/40">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-[#a5a3c9] hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 text-indigo-950 font-bold hover:bg-amber-400 shadow-md shadow-amber-500/20"
                >
                  {editingQuestion ? 'Save Changes' : 'Create Question'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: PDF / WORD UPLOAD --- */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#171545] max-w-lg w-full p-6 space-y-6 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white">
            <button
              onClick={resetPdfModalState}
              className="absolute top-4 right-4 text-[#a5a3c9] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-indigo-900/40 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Import Questions from PDF / Word</h3>
            </div>

            <div className="border-2 border-dashed border-indigo-800/80 hover:border-amber-400/60 rounded-2xl p-6 text-center space-y-3 bg-indigo-950/40">
              <FileText className="w-8 h-8 text-amber-400 mx-auto" />
              <label className="cursor-pointer text-xs font-semibold text-amber-400 hover:underline block">
                Select PDF (.pdf) or Word (.docx) File
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handlePdfFileChange}
                  className="hidden"
                />
              </label>
              {pdfFileName && (
                <span className="text-xs font-mono text-[#a5a3c9] block">{pdfFileName}</span>
              )}
            </div>

            {pdfError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
                {pdfError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={resetPdfModalState}
                className="w-1/2 py-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-[#a5a3c9] hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handlePdfExtract}
                disabled={pdfParsing || !pdfFile}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 text-indigo-950 font-bold hover:bg-amber-400 text-xs disabled:opacity-50 shadow-md shadow-amber-500/20"
              >
                {pdfParsing ? 'Parsing Document...' : 'Extract & Preview'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
