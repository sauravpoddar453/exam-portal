import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
import { 
  Clock, 
  CheckCircle2, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  RotateCcw, 
  AlertTriangle, 
  Award, 
  BookOpen, 
  ShieldAlert,
  Save,
  GraduationCap,
  Maximize,
  Minimize,
  Lock,
  EyeOff,
  Camera,
  Video,
  VideoOff
} from 'lucide-react';
import { initWebcamStream, stopWebcamStream, loadFaceApiModels, analyzeVideoFrame } from '../utils/faceProctor';

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

  // Anti-Cheating & Proctoring Security State
  const [proctorWarningBanner, setProctorWarningBanner] = useState('');
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [cameraViolationCount, setCameraViolationCount] = useState(0);
  const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing' | 'active' | 'denied' | 'error'
  const [cameraDeniedModal, setCameraDeniedModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
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
  const hasInitializedRef = useRef(false);
  const hasSubmittedRef = useRef(false);

  // Camera & Face Detection Refs
  const videoRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const cameraViolationCountRef = useRef(0);
  const consecutiveLookingAwayRef = useRef(0);

  const getDashboardPath = useCallback(() => {
    return user?.role === 'student' ? '/student' : '/dashboard';
  }, [user?.role]);

  // 1. Initialize or Resume Attempt
  const initExamAttempt = useCallback(async () => {
    if (attemptRef.current) return; // Prevent re-initializing existing session
    setLoading(true);
    setError(null);
    try {
      const activeToken = token || localStorage.getItem('token');
      console.log(`[TakeExam DIAGNOSTIC] Initiating test session. examId: "${examId}", Token present: ${Boolean(activeToken)}, Token length: ${activeToken ? activeToken.length : 0}`);

      const { ok, data } = await safeFetchJson(`/api/attempts/start/${examId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
      });

      console.log(`[TakeExam DIAGNOSTIC] Response for /api/attempts/start/${examId}:`, { ok, data });

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

      setTabSwitchCount(data.data.tabSwitchCount || 0);
      setFullscreenExits(data.data.fullscreenExitCount || 0);
      setCameraViolationCount(data.data.cameraViolationCount || 0);
      cameraViolationCountRef.current = data.data.cameraViolationCount || 0;

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
          handleFinalSubmit(true, 'time_expired'); // Auto submit on timeout
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

  // 7. Handle Final Submission
  const handleFinalSubmit = useCallback(async (isTimedOut = false, autoSubmitReason = null) => {
    if (!attemptRef.current || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    // Release webcam hardware stream immediately
    if (webcamStreamRef.current) {
      stopWebcamStream(webcamStreamRef.current);
      webcamStreamRef.current = null;
    }

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

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      if (ok && data?.success) {
        setResultData(data.data);
        setShowSubmitConfirm(false);

        const reason = autoSubmitReason || data.data?.autoSubmitReason;

        if (reason === 'camera_violation_limit_exceeded' || cameraViolationCountRef.current >= 2) {
          setProctorWarningBanner('🔒 SECURITY VIOLATION: Test submitted due to camera proctoring violations. Redirecting...');
          setTimeout(() => {
            alert('SECURITY VIOLATION: Your test has been automatically submitted due to repeated camera proctoring violations (missing face / looking away / multiple faces).');
            navigate(getDashboardPath(), { replace: true });
          }, 1000);
          return;
        }

        if (reason === 'tab_switch_limit_exceeded' || tabSwitchCountRef.current >= 2) {
          setProctorWarningBanner('🔒 SECURITY VIOLATION: Test submitted due to tab-switch violations. Redirecting...');
          setTimeout(() => {
            alert('SECURITY VIOLATION: Your test has been automatically submitted due to repeated tab-switching violations.');
            navigate(getDashboardPath(), { replace: true });
          }, 1000);
          return;
        }

        if (reason === 'fullscreen_exit_limit_exceeded') {
          setProctorWarningBanner('🔒 SECURITY VIOLATION: Test submitted due to full-screen exit violations. Redirecting...');
          setTimeout(() => {
            alert('SECURITY VIOLATION: Your test has been automatically submitted due to 3 full-screen exit violations.');
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

  // 4. Log Proctoring Violation API Helper
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
        if (data.fullscreenExitCount !== undefined) setFullscreenExits(data.fullscreenExitCount);

        if (data.autoSubmitted && !hasSubmittedRef.current) {
          const reason = data.autoSubmitReason || (eventType === 'tab-switch' || eventType === 'window-blur' ? 'tab_switch_limit_exceeded' : 'fullscreen_exit_limit_exceeded');
          handleFinalSubmit(true, reason);
        }
      }
    } catch (err) {
      console.warn('[TakeExam] Proctoring log error:', err.message);
    }
  }, [token, resultData, handleFinalSubmit]);

  const tabSwitchCountRef = useRef(0);

  // 5. Tab-Switching & Window Blur Event Listener (Strict 2-Strike Rule)
  useEffect(() => {
    if (loading || resultData || !attempt || hasSubmittedRef.current) return;

    const handleTabSwitchEvent = (eventType, msg) => {
      if (hasSubmittedRef.current) return;
      const now = Date.now();
      if (now - lastTabSwitchRef.current < 1500) return; // Debounce rapid visibility+blur events
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

  // 6. Full-Screen Enforcement & Change Listener
  const requestFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => console.warn('Fullscreen request failed:', err));
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
    setIsFullscreen(true);
    setShowFullscreenModal(false);
  };

  useEffect(() => {
    if (loading || resultData || !attempt || hasSubmittedRef.current) return;

    const handleFullScreenChange = () => {
      if (hasSubmittedRef.current) return;
      const isFS = !!document.fullscreenElement || !!document.webkitFullscreenElement;
      setIsFullscreen(isFS);

      if (!isFS) {
        setShowFullscreenModal(true);
        reportProctoringViolation('fullscreen-exit', 'User exited forced full-screen mode.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
    };
  }, [loading, resultData, attempt, reportProctoringViolation]);

  // 6.5. Webcam Initialization & MediaStream Lifecycle
  useEffect(() => {
    if (loading || resultData || !attempt || hasSubmittedRef.current) return;

    let isSubscribed = true;

    async function setupWebcam() {
      try {
        setCameraStatus('initializing');
        // Pre-load face-api neural net models in background
        loadFaceApiModels().catch(() => {});

        const stream = await initWebcamStream(videoRef.current);
        if (!isSubscribed) {
          stopWebcamStream(stream);
          return;
        }

        webcamStreamRef.current = stream;
        setCameraStatus('active');
        setCameraDeniedModal(false);
      } catch (err) {
        if (!isSubscribed) return;
        console.warn('[TakeExam] Webcam initialization error:', err.message);
        setCameraStatus('denied');
        setCameraDeniedModal(true);
      }
    }

    setupWebcam();

    return () => {
      isSubscribed = false;
      if (webcamStreamRef.current) {
        stopWebcamStream(webcamStreamRef.current);
        webcamStreamRef.current = null;
      }
    };
  }, [loading, resultData, attempt]);

  // 6.6. Periodic Webcam Face Detection Loop (Runs every 3.5s)
  useEffect(() => {
    if (loading || resultData || !attempt || hasSubmittedRef.current || cameraStatus !== 'active') return;

    const faceCheckInterval = setInterval(async () => {
      if (hasSubmittedRef.current || !videoRef.current) return;

      try {
        const analysis = await analyzeVideoFrame(videoRef.current);
        if (hasSubmittedRef.current) return;

        let shouldTriggerViolation = false;
        let violationDetails = '';

        if (analysis.issueType === 'NO_FACE') {
          shouldTriggerViolation = true;
          violationDetails = 'No face detected in camera frame (candidate stepped away or camera blocked).';
        } else if (analysis.issueType === 'MULTIPLE_FACES') {
          shouldTriggerViolation = true;
          violationDetails = `Multiple faces (${analysis.faceCount}) detected in camera frame.`;
        } else if (analysis.issueType === 'LOOKING_AWAY') {
          consecutiveLookingAwayRef.current += 1;
          if (consecutiveLookingAwayRef.current >= 2) {
            shouldTriggerViolation = true;
            violationDetails = 'Candidate looking away from screen for a sustained duration.';
            consecutiveLookingAwayRef.current = 0;
          }
        } else if (analysis.issueType === 'OK') {
          consecutiveLookingAwayRef.current = 0;
        }

        if (shouldTriggerViolation) {
          cameraViolationCountRef.current += 1;
          const newCount = cameraViolationCountRef.current;
          setCameraViolationCount(newCount);

          if (newCount >= 2) {
            setProctorWarningBanner('⚠️ SECURITY VIOLATION: Maximum camera violations exceeded! Auto-submitting test now...');
            reportProctoringViolation('camera-violation', `${violationDetails} (2nd occurrence - Auto-Submitting)`).catch(() => {});
            if (webcamStreamRef.current) {
              stopWebcamStream(webcamStreamRef.current);
              webcamStreamRef.current = null;
            }
            handleFinalSubmit(true, 'camera_violation_limit_exceeded');
          } else {
            setProctorWarningBanner(`⚠️ SECURITY WARNING: Camera violation detected (${analysis.message}). One more camera violation will auto-submit your test.`);
            reportProctoringViolation('camera-violation', `${violationDetails} (1st warning)`).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[TakeExam] Face detection loop error:', err.message);
      }
    }, 3500);

    return () => clearInterval(faceCheckInterval);
  }, [loading, resultData, attempt, cameraStatus, reportProctoringViolation, handleFinalSubmit]);

  // Prevent Context Menu & Copy Paste
  const preventCopyPaste = (e) => {
    e.preventDefault();
    reportProctoringViolation('copy-paste-attempt', 'User attempted right-click or copy-paste action.');
  };

  // Option Select Handlers
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
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-300 text-sm">Initializing proctored examination environment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-xl space-y-4">
          <div className="p-3 rounded-2xl bg-red-50 text-red-600 inline-block border border-red-200">
            <ShieldAlert className="w-10 h-10 mx-auto" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Examination Access Denied</h2>
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-xs text-red-900 font-medium leading-relaxed">
            {error}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/exams')}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Available Exams
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-md shadow-red-600/20 cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onContextMenu={preventCopyPaste}
      onCopy={preventCopyPaste}
      onPaste={preventCopyPaste}
      onCut={preventCopyPaste}
      className="min-h-screen bg-[#fafafa] text-gray-900 flex flex-col select-none"
    >
      
      {/* Top Fixed Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shadow-sm">
        
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight leading-none">
              {exam?.title || 'Examination Session'}
            </h1>
            <span className="text-[10px] text-gray-500 font-mono">
              Code: {exam?.code} | Proctoring Active 🔒
            </span>
          </div>
        </div>

        {/* Center: Countdown Timer */}
        <div className={`px-4 py-1.5 rounded-xl border flex items-center gap-2 text-sm font-mono font-extrabold shadow-inner ${
          remainingSeconds < 300 
            ? 'bg-red-100 border-red-300 text-red-700 animate-pulse'
            : 'bg-gray-100 border-gray-200 text-red-600'
        }`}>
          <Clock className="w-4 h-4 text-red-600" />
          <span>{formatTime(remainingSeconds)}</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <button
              onClick={requestFullScreen}
              className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-red-100 transition-all"
            >
              <Maximize className="w-3.5 h-3.5" />
              Full-Screen
            </button>
          )}

          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition-transform flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Test
          </button>
        </div>

      </header>

      {/* Red Security Warning Banner */}
      {proctorWarningBanner && (
        <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 animate-bounce">
          <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
          <span>{proctorWarningBanner}</span>
          <button onClick={() => setProctorWarningBanner('')} className="ml-4 underline text-[10px]">Dismiss</button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left 3 Columns: Active Question Viewport */}
        <div className="lg:col-span-3 space-y-6">
          {currentQuestion ? (
            <div className="glass-card p-6 sm:p-8 space-y-6 border-gray-200">
              
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 font-mono font-bold text-xs">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] uppercase font-mono">
                    {currentQuestion.type}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600">+{currentQuestion.effectiveMarks || currentQuestion.marks} Points</span>
                </div>
              </div>

              {/* Question Prompt */}
              <div className="text-base sm:text-lg font-bold text-gray-900 leading-relaxed">
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
                              ? 'bg-red-50 border-red-500 text-red-900 shadow-sm font-semibold'
                              : 'bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-100'
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
                            className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 accent-red-600 cursor-pointer shrink-0"
                          />
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-xs shrink-0 ${
                            isSelected ? 'border-red-500 bg-red-600 text-white font-bold' : 'border-gray-300 bg-gray-200 text-gray-700'
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
                    <span className="text-xs text-red-700 font-semibold block mb-2">Select all correct options:</span>
                    {currentQuestion.options?.map((opt, idx) => {
                      const selArr = Array.isArray(currentAnswer.selectedOption) ? currentAnswer.selectedOption : [];
                      const isSelected = selArr.includes(opt);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleOptionSelect(opt)}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-red-50 border-red-500 text-red-900 shadow-sm font-semibold'
                              : 'bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleOptionSelect(opt);
                            }}
                            className="w-4 h-4 rounded text-red-600 border-gray-300 focus:ring-red-500 accent-red-600 cursor-pointer shrink-0"
                          />
                          <div className={`w-6 h-6 rounded-md border flex items-center justify-center font-mono text-xs shrink-0 ${
                            isSelected ? 'border-red-500 bg-red-600 text-white font-bold' : 'border-gray-300 bg-gray-200 text-gray-700'
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
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      {currentQuestion.type === 'short-answer' ? 'Type your concise answer:' : 'Write your detailed essay response:'}
                    </label>
                    <textarea
                      rows={currentQuestion.type === 'essay' ? 6 : 3}
                      placeholder="Type answer here..."
                      value={currentAnswer.selectedOption || ''}
                      onChange={(e) => handleOptionSelect(e.target.value)}
                      className="w-full p-4 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                )}

              </div>

              {/* Action Toolbar */}
              <div className="pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMarkForReview}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      currentAnswer.isMarkedForReview
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {currentAnswer.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
                  </button>

                  <button
                    type="button"
                    onClick={clearCurrentResponse}
                    className="px-3 py-2 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs font-semibold flex items-center gap-1.5"
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
                    className="px-4 py-2 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-800 text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentIndex === questions.length - 1}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-card p-12 text-center text-gray-500">
              No questions found.
            </div>
          )}
        </div>

        {/* Right 1 Column: Question Palette & Proctoring Status */}
        <div className="space-y-6">
          
          {/* Live Proctoring Webcam Viewport */}
          <div className="glass-card p-3.5 border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-red-600 animate-pulse" /> Live Camera Preview
              </span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                cameraStatus === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cameraStatus === 'active' ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`} />
                {cameraStatus === 'active' ? 'PROCTORING' : 'OFFLINE'}
              </span>
            </div>
            
            <div className="relative rounded-xl overflow-hidden bg-gray-950 aspect-video border border-gray-300 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {cameraStatus !== 'active' && (
                <div className="absolute inset-0 bg-gray-900/85 text-white text-[10px] flex flex-col items-center justify-center p-2 text-center space-y-1">
                  <VideoOff className="w-6 h-6 text-red-400" />
                  <span className="font-semibold">Webcam Not Active</span>
                  <span className="text-[9px] text-gray-400">Permissions required for proctoring</span>
                </div>
              )}
            </div>
          </div>

          {/* Proctoring Audit Box */}
          <div className="glass-card p-4 space-y-2 border-red-200">
            <span className="text-xs font-bold text-red-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Proctoring Audit</span>
              <span className="text-[10px] text-emerald-600 font-mono">Active</span>
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1 font-mono">
              <div className="p-2 rounded bg-gray-50 border border-gray-200 text-center">
                <span className="text-gray-500 block text-[9px] uppercase">Tab Switches</span>
                <span className={tabSwitchCount > 0 ? 'text-red-600 font-bold' : 'text-gray-800'}>{tabSwitchCount} / 2</span>
              </div>
              <div className="p-2 rounded bg-gray-50 border border-gray-200 text-center">
                <span className="text-gray-500 block text-[9px] uppercase">FS Exits</span>
                <span className={fullscreenExits > 0 ? 'text-amber-600 font-bold' : 'text-gray-800'}>{fullscreenExits} / 3</span>
              </div>
              <div className="p-2 rounded bg-gray-50 border border-gray-200 text-center">
                <span className="text-gray-500 block text-[9px] uppercase">Camera</span>
                <span className={cameraViolationCount > 0 ? 'text-rose-600 font-bold' : 'text-gray-800'}>{cameraViolationCount} / 2</span>
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-3">
              Question Navigator
            </h3>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-500" />
                <span>Marked ({markedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-200 border border-gray-300" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-600 ring-2 ring-red-400" />
                <span>Current</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-2">
              {questions.map((q, idx) => {
                const status = getQuestionStatus(q._id);
                const isCurrent = idx === currentIndex;

                let style = 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200';
                if (status === 'answered') style = 'bg-emerald-600 text-white border-emerald-500';
                if (status === 'marked') style = 'bg-purple-600 text-white border-purple-500';
                if (isCurrent) style += ' ring-2 ring-red-500 ring-offset-2 ring-offset-white font-extrabold';

                return (
                  <button
                    key={q._id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl border text-xs font-mono font-bold flex items-center justify-center transition-all hover:scale-105 ${style}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md hover:scale-[1.01] transition-transform"
            >
              Finish & Submit Test
            </button>
          </div>

        </div>

      </div>

      {/* Full-Screen Exit Warning Modal */}
      {showFullscreenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 text-center space-y-6 border-red-300 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto animate-bounce border border-red-200">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-gray-900">Full-Screen Mode Exited!</h3>
              <p className="text-gray-600 text-xs mt-2">
                Exam policy requires full-screen mode. Security incident logged. Exit Count: <strong className="text-red-600">{fullscreenExits} / 3</strong>.
              </p>
              <p className="text-gray-500 text-[11px] mt-1">Exiting full-screen 3 times will force automatic submission.</p>
            </div>

            <button
              onClick={requestFullScreen}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition-transform"
            >
              Return to Full-Screen Mode Now 🔒
            </button>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 space-y-6 border-gray-200 shadow-2xl relative">
            <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Exam Submission</h3>
            </div>

            <p className="text-gray-600 text-xs leading-relaxed">
              Are you sure you want to finalize and submit your test paper?
            </p>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Questions:</span>
                <span className="text-gray-900 font-bold">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600">Answered Questions:</span>
                <span className="text-emerald-700 font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">Marked for Review:</span>
                <span className="text-purple-700 font-bold">{markedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Unanswered Questions:</span>
                <span className="text-gray-800 font-bold">{unansweredCount}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl bg-gray-200 text-gray-800 text-xs font-semibold hover:bg-gray-300"
              >
                Continue Test
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Display View */}
      {resultData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="glass-card max-w-lg w-full p-8 text-center space-y-6 border-gray-200 shadow-2xl relative">
            
            {(showAutoSubmitNotice || resultData.autoSubmitted || resultData.autoSubmitReason) && (
              <div className="p-4 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs flex items-start gap-3 text-left shadow-sm animate-fade-in">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-sm block text-red-900">Exam Auto-Submitted!</strong>
                  <p className="mt-0.5">
                    {autoSubmitNoticeMessage || (
                      resultData.autoSubmitReason === 'camera_violation_limit_exceeded'
                        ? 'Your test has been automatically submitted due to repeated camera proctoring violations.'
                        : resultData.autoSubmitReason === 'tab_switch_limit_exceeded'
                        ? 'Your test has been automatically submitted due to repeated tab-switching violations.'
                        : resultData.autoSubmitReason === 'fullscreen_exit_limit_exceeded'
                        ? 'Your test has been automatically submitted due to 3 full-screen exit violations.'
                        : 'Your test has been automatically submitted due to security policy enforcement.'
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl ${
              resultData.isPassed 
                ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-500'
                : 'bg-red-50 text-red-600 border-2 border-red-500'
            }`}>
              <Award className="w-10 h-10" />
            </div>

            <div>
              <span className={`text-xs uppercase font-extrabold px-3 py-1 rounded-full border ${
                resultData.isPassed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-red-50 text-red-700 border-red-300'
              }`}>
                {resultData.isPassed ? 'PASSED EXAMINATION' : 'NEEDS IMPROVEMENT'}
              </span>
              <h2 className="text-3xl font-extrabold text-gray-900 mt-3">
                {resultData.score} <span className="text-gray-500 text-lg font-normal">/ {resultData.totalMarks || exam?.totalMarks || 100}</span>
              </h2>
            </div>

            <button
              onClick={() => navigate('/student')}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md transition-transform"
            >
              Return to Student Dashboard
            </button>

          </div>
        </div>
      )}

      {/* Camera Access Permission Denied Modal Backdrop */}
      {cameraDeniedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-md w-full p-8 text-center space-y-6 border-red-400 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <VideoOff className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-gray-900">Webcam Access Required</h3>
              <p className="text-gray-600 text-xs mt-3 leading-relaxed">
                Camera access is required for this proctored exam. Please allow camera permissions in your browser and refresh the page.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition-transform"
            >
              Refresh Page & Grant Permissions 🔄
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
