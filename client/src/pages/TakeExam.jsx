import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
import BrandedLoader from '../components/BrandedLoader';
import { 
  Clock, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  RotateCcw, 
  AlertTriangle, 
  Award, 
  ShieldAlert,
  GraduationCap,
  Lock
} from 'lucide-react';

export default function TakeExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // Attempt & Exam State
  const [attempt, setAttempt] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers Map: { [questionId]: { selectedOption, isMarkedForReview } }
  const [userAnswers, setUserAnswers] = useState({});

  // Timing & Auto-Save
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Anti-Cheating & Proctoring Security State (Tab Switch Only)
  const [proctorWarningBanner, setProctorWarningBanner] = useState('');
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [autoSubmitNoticeMessage, setAutoSubmitNoticeMessage] = useState('');
  const [showAutoSubmitNotice, setShowAutoSubmitNotice] = useState(false);

  // Result Modal State
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Refs
  const userAnswersRef = useRef(userAnswers);
  userAnswersRef.current = userAnswers;
  const remainingSecondsRef = useRef(remainingSeconds);
  remainingSecondsRef.current = remainingSeconds;
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;
  const lastTabSwitchRef = useRef(0);
  const tabSwitchCountRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const hasSubmittedRef = useRef(false);

  const getDashboardPath = useCallback(() => {
    return user?.role === 'student' ? '/student' : '/dashboard';
  }, [user?.role]);

  // 1. Initialize or Resume Attempt
  const initExamAttempt = useCallback(async () => {
    if (attemptRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const activeToken = token || localStorage.getItem('token');

      const { ok, data } = await safeFetchJson(`/api/attempts/start/${examId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (!ok || !data?.success) {
        const errMsg = data?.message || '';
        const isAlreadySubmitted = data?.isAlreadySubmitted || 
          errMsg.toLowerCase().includes('already') || 
          errMsg.toLowerCase().includes('maximum attempts') ||
          errMsg.toLowerCase().includes('completed');

        if (isAlreadySubmitted) {
          alert('This exam attempt has already been submitted. Redirecting to your dashboard.');
          navigate(getDashboardPath(), { replace: true });
          return;
        }

        throw new Error(errMsg || 'Failed to initialize exam session.');
      }

      setAttempt(data.data);
      const ex = data.exam || { title: 'Online Examination', durationMinutes: 60 };
      setExam(ex);

      const initialTabCount = data.data.tabSwitchCount || 0;
      setTabSwitchCount(initialTabCount);
      tabSwitchCountRef.current = initialTabCount;

      // Format Questions Array
      let qList = [];
      if (Array.isArray(ex.questions)) {
        qList = ex.questions.map(item => {
          const qObj = typeof item.question === 'object' ? item.question : { _id: item.question, questionText: 'Question prompt...' };
          return {
            ...qObj,
            effectiveMarks: item.marksOverride !== null && item.marksOverride !== undefined ? item.marksOverride : qObj.marks || 1,
          };
        });
      }
      setQuestions(qList);

      // Hydrate Saved Answers if Resuming
      const answersMap = {};
      if (Array.isArray(data.data.answers)) {
        data.data.answers.forEach(a => {
          const qId = a.question?._id || a.question;
          answersMap[qId] = {
            selectedOption: a.selectedOption,
            isMarkedForReview: !!a.isMarkedForReview,
          };
        });
      }
      setUserAnswers(answersMap);

      // Set Countdown Seconds
      setRemainingSeconds(data.data.remainingSeconds || (ex.durationMinutes || 60) * 60);
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('[TakeExam] Init error details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [examId, token, navigate, getDashboardPath]);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    initExamAttempt();
  }, [examId, initExamAttempt]);

  // 2. Countdown Timer Effect
  useEffect(() => {
    if (loading || resultData || remainingSeconds <= 0 || hasSubmittedRef.current) return;

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(true, 'time_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, resultData, remainingSeconds]);

  // 3. 15-Second Auto-Save Hook
  const saveAnswersToBackend = useCallback(async () => {
    if (!attemptRef.current || resultData || hasSubmittedRef.current) return;

    try {
      setIsSaving(true);
      const formattedAnswers = Object.entries(userAnswersRef.current).map(([qId, val]) => ({
        questionId: qId,
        selectedOption: val.selectedOption,
        isMarkedForReview: val.isMarkedForReview,
      }));

      const { ok, data } = await safeFetchJson(`/api/attempts/${attemptRef.current._id}/save`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          remainingSeconds: remainingSecondsRef.current,
        }),
      });

      if (ok && data?.success) {
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn('[TakeExam] Auto-save background error:', err.message);
    } finally {
      setIsSaving(false);
    }
  }, [token, resultData]);

  useEffect(() => {
    if (loading || resultData || !attempt || hasSubmittedRef.current) return;

    const autoSaveInterval = setInterval(() => {
      saveAnswersToBackend();
    }, 15000);

    return () => clearInterval(autoSaveInterval);
  }, [loading, resultData, attempt, saveAnswersToBackend]);

  // 4. Handle Final Submission
  const handleFinalSubmit = useCallback(async (isTimedOut = false, autoSubmitReason = null) => {
    if (!attemptRef.current || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    try {
      setSubmitting(true);
      const formattedAnswers = Object.entries(userAnswersRef.current).map(([qId, val]) => ({
        questionId: qId,
        selectedOption: val.selectedOption,
        isMarkedForReview: val.isMarkedForReview,
      }));

      const isSecurityAutoSubmit = !!autoSubmitReason || isTimedOut;

      const { ok, data } = await safeFetchJson(`/api/attempts/${attemptRef.current._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          isTimedOut,
          autoSubmitted: isSecurityAutoSubmit,
          autoSubmitReason: autoSubmitReason || (isTimedOut ? 'time_expired' : null),
        }),
      });

      if (ok && data?.success) {
        setResultData(data.data);
        setShowSubmitConfirm(false);

        const reason = autoSubmitReason || data.data?.autoSubmitReason;

        if (reason === 'tab_switch_limit_exceeded' || tabSwitchCountRef.current >= 2) {
          setProctorWarningBanner('🔒 SECURITY VIOLATION: Test submitted due to tab-switch violations. Redirecting...');
          setTimeout(() => {
            alert('SECURITY VIOLATION: Your test has been automatically submitted due to repeated tab-switching violations.');
            navigate(getDashboardPath(), { replace: true });
          }, 1000);
          return;
        }

        if (isTimedOut || reason === 'time_expired') {
          setProctorWarningBanner('⌛ TIME EXPIRED: Test duration ended. Test submitted automatically. Redirecting...');
          setTimeout(() => {
            alert('TIME EXPIRED: Your test duration has ended. Your test has been submitted automatically.');
            navigate(getDashboardPath(), { replace: true });
          }, 1000);
          return;
        }

        if (data.data?.autoSubmitted || isSecurityAutoSubmit) {
          setProctorWarningBanner('🔒 SECURITY VIOLATION: Test submitted automatically due to security policy enforcement. Redirecting...');
          setTimeout(() => {
            alert('SECURITY VIOLATION: Your test has been automatically submitted due to security policy enforcement.');
            navigate(getDashboardPath(), { replace: true });
          }, 1000);
          return;
        }
      } else {
        alert(data?.message || 'Error submitting test');
      }
    } catch (err) {
      console.error('[TakeExam] Final submit error:', err);
      alert('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }, [token, navigate, getDashboardPath]);

  // 5. Log Proctoring Violation API Helper
  const reportProctoringViolation = useCallback(async (eventType, details) => {
    if (!attemptRef.current || resultData || hasSubmittedRef.current) return;

    try {
      const { ok, data } = await safeFetchJson(`/api/attempts/${attemptRef.current._id}/proctor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventType, details }),
      });

      if (ok && data?.success) {
        if (data.tabSwitchCount !== undefined) setTabSwitchCount(data.tabSwitchCount);

        if (data.autoSubmitted && !hasSubmittedRef.current) {
          const reason = data.autoSubmitReason || 'tab_switch_limit_exceeded';
          handleFinalSubmit(true, reason);
        }
      }
    } catch (err) {
      console.warn('[TakeExam] Proctoring log error:', err.message);
    }
  }, [token, resultData, handleFinalSubmit]);

  // 6. Tab-Switching & Window Blur Event Listener (Strict 2-Strike Rule)
  useEffect(() => {
    if (loading || resultData || !attempt || hasSubmittedRef.current) return;

    const handleTabSwitchEvent = (eventType, msg) => {
      if (hasSubmittedRef.current) return;
      const now = Date.now();
      if (now - lastTabSwitchRef.current < 1500) return;
      lastTabSwitchRef.current = now;

      tabSwitchCountRef.current += 1;
      const newCount = tabSwitchCountRef.current;
      setTabSwitchCount(newCount);

      if (newCount >= 2) {
        setProctorWarningBanner('⚠️ SECURITY VIOLATION: Maximum tab switches exceeded! Auto-submitting test now...');
        reportProctoringViolation(eventType, `${msg} (2nd occurrence - Auto-Submitting)`).catch(() => {});
        handleFinalSubmit(true, 'tab_switch_limit_exceeded');
      } else {
        setProctorWarningBanner('⚠️ FINAL WARNING: One more tab switch will auto-submit your test.');
        reportProctoringViolation(eventType, `${msg} (1st warning)`).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !hasSubmittedRef.current) {
        handleTabSwitchEvent('tab-switch', 'User switched tabs or minimized window.');
      }
    };

    const handleWindowBlur = () => {
      if (!hasSubmittedRef.current) {
        handleTabSwitchEvent('window-blur', 'Focus lost from exam browser window.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [loading, resultData, attempt, reportProctoringViolation, handleFinalSubmit]);

  const preventCopyPaste = (e) => {
    e.preventDefault();
    reportProctoringViolation('copy-paste-attempt', 'User attempted right-click or copy-paste action.');
  };

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? userAnswers[currentQuestion._id] || {} : {};

  const handleOptionSelect = (optionValue) => {
    if (!currentQuestion) return;
    const qId = currentQuestion._id;

    setUserAnswers(prev => {
      let newSel = optionValue;
      if (currentQuestion.type === 'mcq-multiple') {
        const existingArr = Array.isArray(prev[qId]?.selectedOption) ? prev[qId].selectedOption : [];
        if (existingArr.includes(optionValue)) {
          newSel = existingArr.filter(v => v !== optionValue);
        } else {
          newSel = [...existingArr, optionValue];
        }
      }

      return {
        ...prev,
        [qId]: {
          ...prev[qId],
          selectedOption: newSel,
        },
      };
    });
  };

  const toggleMarkForReview = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion._id;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        isMarkedForReview: !prev[qId]?.isMarkedForReview,
      },
    }));
  };

  const clearCurrentResponse = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion._id;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        selectedOption: null,
      },
    }));
  };

  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;

    return [hours, minutes, seconds]
      .map(v => (v < 10 ? '0' + v : v))
      .filter((v, i) => v !== '00' || i > 0)
      .join(':');
  };

  const getQuestionStatus = (qId) => {
    const ans = userAnswers[qId];
    if (ans?.isMarkedForReview) return 'marked';
    if (ans?.selectedOption !== undefined && ans?.selectedOption !== null && ans?.selectedOption !== '') return 'answered';
    return 'unanswered';
  };

  const answeredCount = Object.values(userAnswers).filter(a => a.selectedOption !== undefined && a.selectedOption !== null && a.selectedOption !== '').length;
  const markedCount = Object.values(userAnswers).filter(a => a.isMarkedForReview).length;
  const unansweredCount = questions.length - answeredCount;

  if (loading) {
    return <BrandedLoader message="Initializing examination session..." />;
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4">
        <div className="glass-card border border-rose-500/30 rounded-2xl p-8 text-center shadow-xl space-y-4">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 inline-block border border-rose-500/20">
            <ShieldAlert className="w-10 h-10 mx-auto" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Examination Access Denied</h2>
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-medium leading-relaxed">
            {error}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/exams')}
              className="px-4 py-2.5 rounded-xl border border-indigo-800 text-slate-300 hover:bg-indigo-900/40 text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Available Exams
            </button>
            <button
              onClick={() => navigate(getDashboardPath())}
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLowTime = remainingSeconds < 120; // < 2 minutes low time threshold

  return (
    <div 
      onContextMenu={preventCopyPaste}
      onCopy={preventCopyPaste}
      onPaste={preventCopyPaste}
      onCut={preventCopyPaste}
      className="min-h-screen bg-[#0b0a26] text-[#f4f4f8] flex flex-col select-none"
    >
      
      {/* Top Fixed Header Bar */}
      <header className="sticky top-0 z-40 bg-[#171545]/90 backdrop-blur-md border-b border-indigo-900/60 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shadow-md">
        
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">
              {exam?.title || 'Examination Session'}
            </h1>
            <span className="text-[10px] text-[#a5a3c9] font-mono">
              Code: {exam?.code} | Tab Monitoring Active 🔒
            </span>
          </div>
        </div>

        {/* Center: Countdown Timer */}
        <div className={`px-4 py-1.5 rounded-xl border flex items-center gap-2 text-sm font-mono font-extrabold shadow-inner ${
          isLowTime 
            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-timer-pulse'
            : remainingSeconds < 300 
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse'
            : 'bg-indigo-950 border-indigo-800 text-amber-400'
        }`}>
          <Clock className={`w-4 h-4 ${isLowTime ? 'text-rose-400' : 'text-amber-400'}`} />
          <span>{formatTime(remainingSeconds)}</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-transform flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Test
          </button>
        </div>

      </header>

      {/* Security Warning Banner */}
      {proctorWarningBanner && (
        <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 animate-bounce">
          <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
          <span>{proctorWarningBanner}</span>
          <button onClick={() => setProctorWarningBanner('')} className="ml-4 underline text-[10px] cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left 3 Columns: Active Question Viewport */}
        <div className="lg:col-span-3 space-y-6">
          {currentQuestion ? (
            <div className="glass-card p-6 sm:p-8 space-y-6 border border-amber-500/15">
              
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-indigo-900/40 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold text-xs">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-800 text-slate-300 text-[11px] uppercase font-mono">
                    {currentQuestion.type}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-400">+{currentQuestion.effectiveMarks || currentQuestion.marks} Points</span>
                </div>
              </div>

              {/* Question Prompt */}
              <div className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {currentQuestion.questionText}
              </div>

              {/* Response Options Viewport */}
              <div className="space-y-3 pt-2">
                
                {/* Single Choice MCQ or True/False */}
                {(currentQuestion.type === 'mcq-single' || currentQuestion.type === 'true-false') && (
                  <div className="space-y-2.5">
                    {(currentQuestion.options && currentQuestion.options.length > 0 ? currentQuestion.options : ['True', 'False']).map((opt, idx) => {
                      const isSelected = currentAnswer.selectedOption === opt;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleOptionSelect(opt)}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm font-semibold'
                              : 'bg-indigo-950/60 border-indigo-800/80 text-slate-200 hover:border-indigo-700 hover:bg-indigo-900/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`mcq-single-${currentQuestion._id}`}
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleOptionSelect(opt);
                            }}
                            className="w-4 h-4 text-amber-400 border-indigo-700 focus:ring-amber-400 accent-amber-400 cursor-pointer shrink-0"
                          />
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-xs shrink-0 ${
                            isSelected ? 'border-amber-400 bg-amber-500 text-indigo-950 font-bold' : 'border-indigo-700 bg-indigo-900 text-slate-300'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="flex-grow">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Multiple Choice MCQ */}
                {currentQuestion.type === 'mcq-multiple' && (
                  <div className="space-y-2.5">
                    <span className="text-xs text-amber-400 font-semibold block mb-2">Select all correct options:</span>
                    {currentQuestion.options?.map((opt, idx) => {
                      const selArr = Array.isArray(currentAnswer.selectedOption) ? currentAnswer.selectedOption : [];
                      const isSelected = selArr.includes(opt);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleOptionSelect(opt)}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm font-semibold'
                              : 'bg-indigo-950/60 border-indigo-800/80 text-slate-200 hover:border-indigo-700 hover:bg-indigo-900/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleOptionSelect(opt);
                            }}
                            className="w-4 h-4 rounded text-amber-400 border-indigo-700 focus:ring-amber-400 accent-amber-400 cursor-pointer shrink-0"
                          />
                          <div className={`w-6 h-6 rounded-md border flex items-center justify-center font-mono text-xs shrink-0 ${
                            isSelected ? 'border-amber-400 bg-amber-500 text-indigo-950 font-bold' : 'border-indigo-700 bg-indigo-900 text-slate-300'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="flex-grow">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer / Essay */}
                {(currentQuestion.type === 'short-answer' || currentQuestion.type === 'essay') && (
                  <div>
                    <label className="block text-xs font-semibold text-[#a5a3c9] mb-2">
                      {currentQuestion.type === 'short-answer' ? 'Type your concise answer:' : 'Write your detailed essay response:'}
                    </label>
                    <textarea
                      rows={currentQuestion.type === 'essay' ? 6 : 3}
                      placeholder="Type answer here..."
                      value={currentAnswer.selectedOption || ''}
                      onChange={(e) => handleOptionSelect(e.target.value)}
                      className="w-full p-4 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

              </div>

              {/* Action Toolbar */}
              <div className="pt-6 border-t border-indigo-900/40 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMarkForReview}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      currentAnswer.isMarkedForReview
                        ? 'bg-amber-500 text-indigo-950 border-amber-400 font-bold'
                        : 'bg-indigo-950 border-indigo-800 text-slate-300 hover:bg-indigo-900/40'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {currentAnswer.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
                  </button>

                  <button
                    type="button"
                    onClick={clearCurrentResponse}
                    className="px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 hover:bg-indigo-900/40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear Answer
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="px-4 py-2 rounded-xl bg-indigo-950 border border-indigo-800 hover:bg-indigo-900/40 text-slate-200 text-xs font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentIndex === questions.length - 1}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-card p-12 text-center text-[#a5a3c9]">
              No questions found.
            </div>
          )}
        </div>

        {/* Right 1 Column: Question Palette & Proctoring Status */}
        <div className="space-y-6">
          
          {/* Proctoring Audit Box */}
          <div className="glass-card p-4 space-y-2 border border-amber-500/15">
            <span className="text-xs font-bold text-amber-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Proctoring Audit</span>
              <span className="text-[10px] text-teal-400 font-mono">Active</span>
            </span>
            <div className="text-[10px] pt-1 font-mono">
              <div className="p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-center flex items-center justify-between">
                <span className="text-[#a5a3c9] text-[10px] uppercase font-bold">Tab Switches</span>
                <span className={tabSwitchCount > 0 ? 'text-amber-400 font-extrabold text-xs' : 'text-slate-200 text-xs font-bold'}>
                  {tabSwitchCount} / 2
                </span>
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="glass-card p-5 space-y-4 border border-amber-500/15">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-indigo-900/40 pb-3">
              Question Navigator
            </h3>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-[#a5a3c9]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-teal-400" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span>Marked ({markedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-950 border border-indigo-800" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500 ring-2 ring-amber-400" />
                <span>Current</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-2">
              {questions.map((q, idx) => {
                const status = getQuestionStatus(q._id);
                const isCurrent = idx === currentIndex;

                let style = 'bg-indigo-950 border-indigo-800 text-slate-300 hover:bg-indigo-900/40';
                if (status === 'answered') style = 'bg-teal-500/20 border-teal-500/40 text-teal-300 font-bold';
                if (status === 'marked') style = 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold';
                if (isCurrent) style += ' ring-2 ring-amber-400 ring-offset-2 ring-offset-indigo-950 text-amber-400 font-extrabold';

                return (
                  <button
                    key={q._id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl border text-xs font-mono font-bold flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${style}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:scale-[1.01] transition-transform cursor-pointer"
            >
              Finish & Submit Test
            </button>
          </div>

        </div>

      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#171545] max-w-md w-full p-6 space-y-6 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white">
            <div className="flex items-center gap-3 border-b border-indigo-900/40 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Confirm Exam Submission</h3>
            </div>

            <p className="text-[#a5a3c9] text-xs leading-relaxed">
              Are you sure you want to finalize and submit your test paper?
            </p>

            <div className="p-4 rounded-xl bg-indigo-950 border border-indigo-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#a5a3c9]">Total Questions:</span>
                <span className="text-white font-bold">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-400">Answered Questions:</span>
                <span className="text-teal-300 font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400">Marked for Review:</span>
                <span className="text-amber-300 font-bold">{markedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a5a3c9]">Unanswered Questions:</span>
                <span className="text-slate-200 font-bold">{unansweredCount}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-[#a5a3c9] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Continue Test
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Display View */}
      {resultData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#171545] max-w-lg w-full p-8 text-center space-y-6 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white">
            
            {(showAutoSubmitNotice || resultData.autoSubmitted || resultData.autoSubmitReason) && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3 text-left shadow-sm animate-fade-in">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-sm block text-rose-300">Exam Auto-Submitted!</strong>
                  <p className="mt-0.5">
                    {autoSubmitNoticeMessage || (
                      resultData.autoSubmitReason === 'tab_switch_limit_exceeded'
                        ? 'Your test has been automatically submitted due to repeated tab-switching violations.'
                        : resultData.autoSubmitReason === 'time_expired'
                        ? 'Your test duration has ended.'
                        : 'Your test has been automatically submitted due to policy enforcement.'
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl ${
              resultData.isPassed 
                ? 'bg-teal-500/10 text-teal-400 border-2 border-teal-500'
                : 'bg-rose-500/10 text-rose-400 border-2 border-rose-500'
            }`}>
              <Award className="w-10 h-10" />
            </div>

            <div>
              <span className={`text-xs uppercase font-extrabold px-3 py-1 rounded-full border ${
                resultData.isPassed
                  ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
              }`}>
                {resultData.isPassed ? 'PASSED EXAMINATION' : 'NEEDS IMPROVEMENT'}
              </span>
              <h2 className="text-3xl font-extrabold text-white mt-3">
                {resultData.score} <span className="text-[#a5a3c9] text-lg font-normal">/ {resultData.totalMarks || exam?.totalMarks || 100}</span>
              </h2>
            </div>

            <button
              onClick={() => navigate('/student')}
              className="w-full py-3 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-transform cursor-pointer"
            >
              Return to Student Dashboard
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
