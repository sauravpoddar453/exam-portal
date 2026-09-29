const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const User = require('../models/User');
const Course = require('../models/Course');
const { getDBStatus } = require('../config/db');
const { sendExamResultsEmail } = require('../services/emailService');
const PDFDocument = require('pdfkit');

// Mock Store for fallback when DB is disconnected
const MOCK_ATTEMPTS_STORE = [];

/**
 * Helper to grade a single question answer
 */
const evaluateQuestionScore = (question, selectedOption, negativeMarkingEnabled) => {
  const maxMarks = Number(question.marks) || 1;
  const negPenalty = negativeMarkingEnabled ? Number(question.negativeMarks) || 0 : 0;
  const correct = question.correctAnswer;

  // Essay question -> requires manual teacher evaluation
  if (question.type === 'essay') {
    return {
      marksObtained: 0,
      status: 'pending-review',
    };
  }

  // Unanswered
  if (selectedOption === null || selectedOption === undefined || selectedOption === '') {
    return {
      marksObtained: 0,
      status: 'auto-graded',
    };
  }

  // Single choice / True-False / Short Answer
  if (question.type === 'mcq-single' || question.type === 'true-false' || question.type === 'short-answer') {
    const isCorrect = String(selectedOption).trim().toLowerCase() === String(correct).trim().toLowerCase();
    return {
      marksObtained: isCorrect ? maxMarks : -negPenalty,
      status: 'auto-graded',
    };
  }

  // Multiple Choice MCQ
  if (question.type === 'mcq-multiple') {
    const selectedArr = Array.isArray(selectedOption) ? selectedOption : [selectedOption];
    const correctArr = Array.isArray(correct) ? correct : [correct];

    const isMatch = selectedArr.length === correctArr.length &&
      selectedArr.every(val => correctArr.includes(val));

    return {
      marksObtained: isMatch ? maxMarks : -negPenalty,
      status: 'auto-graded',
    };
  }

  return {
    marksObtained: 0,
    status: 'auto-graded',
  };
};

/**
 * @desc    Start or Resume an Exam Attempt
 * @route   POST /api/attempts/start/:examId
 * @access  Private (Student / All)
 */
const startOrResumeAttempt = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const studentId = req.user ? (req.user._id || req.user.id) : null;

    console.log(`[ATTEMPT_START DIAGNOSTIC] POST /api/attempts/start/${examId} | studentId: "${studentId}", role: "${req.user?.role}"`);
    console.log(`[ATTEMPT_START DIAGNOSTIC] Params:`, req.params, `| Body:`, req.body);

    if (!studentId && getDBStatus() === 'Connected') {
      console.warn(`[ATTEMPT_START DIAGNOSTIC] Unauthorized attempt: No studentId found in req.user`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to start an examination.',
      });
    }

    if (getDBStatus() === 'Connected') {
      const exam = await Exam.findById(examId).populate('questions.question');
      if (!exam) {
        console.warn(`[ATTEMPT_START DIAGNOSTIC] Exam not found: ${examId}`);
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }

      // Check if student is enrolled in the exam's course
      if (exam.course) {
        const courseDoc = await Course.findById(exam.course);
        if (courseDoc && req.user?.role !== 'admin' && req.user?.role !== 'teacher') {
          const isEnrolled = courseDoc.students.some(id => String(id) === String(studentId));
          console.log(`[ATTEMPT_START DIAGNOSTIC] Enrollment check for Course "${courseDoc.title}": studentId=${studentId}, isEnrolled=${isEnrolled}`);
          if (!isEnrolled) {
            return res.status(403).json({
              success: false,
              message: `Forbidden: You must be enrolled in the course "${courseDoc.title}" to take this exam. Please contact your teacher for the enrollment code.`,
            });
          }
        }
      }

      // Check existing in-progress attempt
      let existingAttempt = await Attempt.findOne({
        student: studentId,
        exam: examId,
        status: 'in-progress',
      }).populate('answers.question');

      if (existingAttempt) {
        const elapsedSeconds = Math.floor((Date.now() - new Date(existingAttempt.startedAt).getTime()) / 1000);
        const totalDurationSeconds = (exam.durationMinutes || 60) * 60;
        const calculatedRemaining = Math.max(0, totalDurationSeconds - elapsedSeconds);

        existingAttempt.remainingSeconds = calculatedRemaining;
        await existingAttempt.save();

        return res.status(200).json({
          success: true,
          isResumed: true,
          data: existingAttempt,
          exam,
        });
      }

      // Check completed attempts limit
      const completedCount = await Attempt.countDocuments({
        student: studentId,
        exam: examId,
        status: { $in: ['submitted', 'timed-out'] },
      });

      if (completedCount >= (exam.attemptsAllowed || 1)) {
        return res.status(400).json({
          success: false,
          isAlreadySubmitted: true,
          message: 'This exam attempt has already been submitted.',
        });
      }

      // Create new attempt
      const newAttempt = await Attempt.create({
        student: studentId,
        exam: examId,
        startedAt: new Date(),
        remainingSeconds: (exam.durationMinutes || 60) * 60,
        totalMarks: exam.totalMarks || 100,
        passingMarks: exam.passingMarks || 40,
        status: 'in-progress',
        gradingStatus: 'graded',
        tabSwitchCount: 0,
        fullscreenExitCount: 0,
        isFlagged: false,
        proctoringLogs: [],
        answers: [],
      });

      return res.status(201).json({
        success: true,
        isResumed: false,
        data: newAttempt,
        exam,
      });
    }

    // Mock Fallback when DB disconnected
    let existingMock = MOCK_ATTEMPTS_STORE.find(a => 
      String(a.student) === String(studentId) && 
      String(a.exam) === String(examId) && 
      a.status === 'in-progress'
    );

    if (existingMock) {
      return res.status(200).json({
        success: true,
        isResumed: true,
        data: existingMock,
        examId,
      });
    }

    const newMockAttempt = {
      _id: `att-mock-${Date.now()}`,
      student: studentId,
      exam: examId,
      startedAt: new Date().toISOString(),
      remainingSeconds: 3600,
      totalMarks: 100,
      passingMarks: 40,
      status: 'in-progress',
      gradingStatus: 'graded',
      tabSwitchCount: 0,
      fullscreenExitCount: 0,
      isFlagged: false,
      proctoringLogs: [],
      score: 0,
      isPassed: false,
      answers: [],
    };

    MOCK_ATTEMPTS_STORE.unshift(newMockAttempt);

    return res.status(201).json({
      success: true,
      isResumed: false,
      data: newMockAttempt,
      examId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Auto-save candidate answers periodically
 * @route   PUT /api/attempts/:id/save
 * @access  Private
 */
const autoSaveAnswers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answers, remainingSeconds } = req.body;

    if (getDBStatus() === 'Connected') {
      const attempt = await Attempt.findById(id);
      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt record not found' });
      }

      if (attempt.status !== 'in-progress') {
        return res.status(400).json({ success: false, message: 'Cannot update a completed attempt' });
      }

      if (Array.isArray(answers)) {
        attempt.answers = answers.map(a => ({
          question: a.questionId || a.question,
          selectedOption: a.selectedOption,
          isMarkedForReview: !!a.isMarkedForReview,
          savedAt: new Date(),
        }));
      }

      if (remainingSeconds !== undefined) {
        attempt.remainingSeconds = Number(remainingSeconds);
      }

      await attempt.save();

      return res.status(200).json({
        success: true,
        message: 'Answers auto-saved successfully.',
        savedAt: new Date().toISOString(),
      });
    }

    // Mock fallback
    const mockAttempt = MOCK_ATTEMPTS_STORE.find(a => a._id === id);
    if (!mockAttempt) {
      return res.status(404).json({ success: false, message: 'Mock attempt record not found' });
    }

    if (Array.isArray(answers)) {
      mockAttempt.answers = answers;
    }
    if (remainingSeconds !== undefined) {
      mockAttempt.remainingSeconds = Number(remainingSeconds);
    }

    return res.status(200).json({
      success: true,
      message: 'Answers auto-saved (Mock DB).',
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log Anti-Cheating & Proctoring Security Violation
 * @route   POST /api/attempts/:id/proctor
 * @access  Private
 */
const logProctoringViolation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { eventType, details } = req.body;

    const validEvents = ['tab-switch', 'window-blur', 'fullscreen-exit', 'copy-paste-attempt', 'camera-violation', 'face-not-detected', 'multiple-faces-detected', 'looking-away'];
    if (!eventType || !validEvents.includes(eventType)) {
      return res.status(400).json({ success: false, message: 'Invalid proctoring event type.' });
    }

    if (getDBStatus() === 'Connected') {
      const attempt = await Attempt.findById(id);
      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt record not found' });
      }

      // Record log entry
      attempt.proctoringLogs.push({
        eventType,
        details: details || `Proctoring incident: ${eventType}`,
        timestamp: new Date(),
      });

      attempt.isFlagged = true;

      if (eventType === 'tab-switch' || eventType === 'window-blur') {
        attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
      } else if (eventType === 'fullscreen-exit') {
        attempt.fullscreenExitCount = (attempt.fullscreenExitCount || 0) + 1;
      } else if (['camera-violation', 'face-not-detected', 'multiple-faces-detected', 'looking-away'].includes(eventType)) {
        attempt.cameraViolationCount = (attempt.cameraViolationCount || 0) + 1;
      }

      let autoSubmitted = false;
      let autoSubmitReason = null;

      // Auto-submit ON 2nd camera violation (strict 2-strike rule)
      if (attempt.cameraViolationCount >= 2 && attempt.status === 'in-progress') {
        attempt.status = 'timed-out';
        attempt.submittedAt = new Date();
        attempt.remainingSeconds = 0;
        attempt.autoSubmitted = true;
        attempt.autoSubmitReason = 'camera_violation_limit_exceeded';
        attempt.isFlagged = true;
        autoSubmitted = true;
        autoSubmitReason = 'camera_violation_limit_exceeded';
      }
      // Auto-submit ON 2nd tab-switch (strict 2-strike rule)
      else if (attempt.tabSwitchCount >= 2 && attempt.status === 'in-progress') {
        attempt.status = 'timed-out';
        attempt.submittedAt = new Date();
        attempt.remainingSeconds = 0;
        attempt.autoSubmitted = true;
        attempt.autoSubmitReason = 'tab_switch_limit_exceeded';
        attempt.isFlagged = true;
        autoSubmitted = true;
        autoSubmitReason = 'tab_switch_limit_exceeded';
      } 
      // Auto-submit ON 3rd full-screen exit (3-strike rule)
      else if (attempt.fullscreenExitCount >= 3 && attempt.status === 'in-progress') {
        attempt.status = 'timed-out';
        attempt.submittedAt = new Date();
        attempt.remainingSeconds = 0;
        attempt.autoSubmitted = true;
        attempt.autoSubmitReason = 'fullscreen_exit_limit_exceeded';
        attempt.isFlagged = true;
        autoSubmitted = true;
        autoSubmitReason = 'fullscreen_exit_limit_exceeded';
      }

      await attempt.save();

      return res.status(200).json({
        success: true,
        message: 'Proctoring security incident logged.',
        tabSwitchCount: attempt.tabSwitchCount,
        fullscreenExitCount: attempt.fullscreenExitCount,
        cameraViolationCount: attempt.cameraViolationCount,
        isFlagged: attempt.isFlagged,
        autoSubmitted,
        autoSubmitReason,
      });
    }

    // Mock fallback
    const mockAttempt = MOCK_ATTEMPTS_STORE.find(a => a._id === id);
    if (mockAttempt) {
      mockAttempt.isFlagged = true;
      if (eventType === 'tab-switch' || eventType === 'window-blur') {
        mockAttempt.tabSwitchCount = (mockAttempt.tabSwitchCount || 0) + 1;
      } else if (eventType === 'fullscreen-exit') {
        mockAttempt.fullscreenExitCount = (mockAttempt.fullscreenExitCount || 0) + 1;
      }

      let autoSubmitted = false;
      let autoSubmitReason = null;
      if (mockAttempt.tabSwitchCount >= 2 && mockAttempt.status === 'in-progress') {
        mockAttempt.status = 'timed-out';
        mockAttempt.submittedAt = new Date().toISOString();
        mockAttempt.autoSubmitted = true;
        mockAttempt.autoSubmitReason = 'tab_switch_limit_exceeded';
        autoSubmitted = true;
        autoSubmitReason = 'tab_switch_limit_exceeded';
      } else if (mockAttempt.fullscreenExitCount >= 3 && mockAttempt.status === 'in-progress') {
        mockAttempt.status = 'timed-out';
        mockAttempt.submittedAt = new Date().toISOString();
        mockAttempt.autoSubmitted = true;
        mockAttempt.autoSubmitReason = 'fullscreen_exit_limit_exceeded';
        autoSubmitted = true;
        autoSubmitReason = 'fullscreen_exit_limit_exceeded';
      }

      return res.status(200).json({
        success: true,
        tabSwitchCount: mockAttempt.tabSwitchCount,
        fullscreenExitCount: mockAttempt.fullscreenExitCount,
        isFlagged: true,
        autoSubmitted,
        autoSubmitReason,
      });
    }

    return res.status(404).json({ success: false, message: 'Attempt not found' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit attempt and auto-grade exam
 * @route   POST /api/attempts/:id/submit
 * @access  Private
 */
const submitAttempt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answers, isTimedOut, autoSubmitted, autoSubmitReason } = req.body;

    if (getDBStatus() === 'Connected') {
      const attempt = await Attempt.findById(id).populate({
        path: 'exam',
        populate: { path: 'questions.question' },
      });

      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt record not found' });
      }

      if (attempt.status !== 'in-progress') {
        return res.status(200).json({
          success: true,
          isAlreadySubmitted: true,
          message: 'Attempt has already been submitted.',
          data: attempt,
        });
      }

      const exam = attempt.exam;
      const submittedAnswers = Array.isArray(answers) ? answers : attempt.answers;

      let totalScore = 0;
      let hasPendingEssay = false;
      const gradedAnswers = [];

      // Calculate timeTaken in seconds
      const startMs = attempt.startedAt ? new Date(attempt.startedAt).getTime() : Date.now();
      const subMs = Date.now();
      const timeTakenSec = Math.max(0, Math.round((subMs - startMs) / 1000));

      if (exam && Array.isArray(exam.questions)) {
        for (const item of exam.questions) {
          const q = item.question;
          if (!q) continue;

          const userAns = submittedAnswers.find(a => 
            String(a.questionId || a.question) === String(q._id)
          );

          const selOption = userAns ? userAns.selectedOption : null;
          const isMarked = userAns ? userAns.isMarkedForReview : false;

          const effectiveQ = {
            ...q.toObject(),
            marks: item.marksOverride !== null && item.marksOverride !== undefined ? item.marksOverride : q.marks,
          };

          const evaluation = evaluateQuestionScore(effectiveQ, selOption, exam.negativeMarking);
          totalScore += evaluation.marksObtained;

          if (evaluation.status === 'pending-review') {
            hasPendingEssay = true;
          }

          const isAnsCorrect = evaluation.status === 'auto-graded' && evaluation.marksObtained > 0;

          const rawOptions = Array.isArray(q.options)
            ? q.options.map(opt => typeof opt === 'object' ? (opt.text || opt.optionText || '') : String(opt))
            : [];

          gradedAnswers.push({
            question: q._id,
            questionTextSnapshot: q.title || q.questionText || '',
            questionTypeSnapshot: q.type || 'mcq-single',
            optionsSnapshot: rawOptions,
            selectedOption: selOption,
            correctAnswerSnapshot: q.correctAnswer,
            explanationSnapshot: q.explanation || q.solution || '',
            isCorrect: isAnsCorrect,
            marksAwarded: Math.max(0, evaluation.marksObtained),
            marksObtained: evaluation.marksObtained,
            isMarkedForReview: isMarked,
            status: evaluation.status,
            feedback: '',
            savedAt: new Date(),
          });
        }
      }

      attempt.answers = gradedAnswers;
      attempt.score = Math.max(0, totalScore);
      attempt.status = (isTimedOut || autoSubmitted || attempt.autoSubmitted) ? 'timed-out' : 'submitted';
      attempt.gradingStatus = hasPendingEssay ? 'pending-review' : 'graded';
      attempt.submittedAt = new Date(subMs);
      attempt.timeTaken = timeTakenSec;
      attempt.remainingSeconds = 0;
      attempt.isPassed = attempt.score >= (attempt.passingMarks || 40);

      if (autoSubmitted || req.body.autoSubmitted || attempt.autoSubmitted) {
        attempt.autoSubmitted = true;
        attempt.autoSubmitReason = autoSubmitReason || req.body.autoSubmitReason || attempt.autoSubmitReason || (isTimedOut ? 'time_expired' : 'security_violation');
        attempt.isFlagged = true;
      }

      await attempt.save();

      // Dispatch results email asynchronously if grading is complete
      if (attempt.gradingStatus === 'graded') {
        const studentObj = await User.findById(attempt.student);
        if (studentObj && studentObj.email) {
          sendExamResultsEmail({
            toEmail: studentObj.email,
            studentName: studentObj.name,
            examTitle: exam ? exam.title : 'Online Exam',
            score: attempt.score,
            totalMarks: attempt.totalMarks || (exam ? exam.totalMarks : 100),
            isPassed: attempt.isPassed,
            attemptId: attempt._id,
          }).catch(err => console.error('[submitAttempt] Email error:', err));
        }
      }

      return res.status(200).json({
        success: true,
        message: (isTimedOut || attempt.autoSubmitted) ? 'Security violation limit reached or time expired. Exam auto-submitted.' : 'Exam submitted successfully.',
        data: attempt,
      });
    }

    // Mock fallback
    const mockAttempt = MOCK_ATTEMPTS_STORE.find(a => a._id === id);
    if (!mockAttempt) {
      return res.status(404).json({ success: false, message: 'Mock attempt not found' });
    }

    mockAttempt.status = (isTimedOut || autoSubmitted) ? 'timed-out' : 'submitted';
    mockAttempt.gradingStatus = 'graded';
    mockAttempt.submittedAt = new Date().toISOString();
    mockAttempt.remainingSeconds = 0;
    mockAttempt.score = 85;
    mockAttempt.isPassed = true;
    if (autoSubmitted || req.body.autoSubmitted) {
      mockAttempt.autoSubmitted = true;
      mockAttempt.autoSubmitReason = autoSubmitReason || 'security_violation';
      mockAttempt.isFlagged = true;
    }

    return res.status(200).json({
      success: true,
      message: 'Exam submitted (Mock DB).',
      data: mockAttempt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed attempt result & answer comparison review
 * @route   GET /api/attempts/:id/result
 * @access  Private
 */
const getAttemptResult = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (getDBStatus() === 'Connected') {
      const attempt = await Attempt.findById(id)
        .populate('student', 'name email role')
        .populate({
          path: 'exam',
          populate: { path: 'questions.question' },
        })
        .populate('answers.question');

      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt result not found' });
      }

      return res.status(200).json({
        success: true,
        data: attempt,
      });
    }

    const mockAttempt = MOCK_ATTEMPTS_STORE.find(a => a._id === id);
    if (!mockAttempt) {
      return res.status(404).json({ success: false, message: 'Mock result not found' });
    }

    return res.status(200).json({
      success: true,
      data: mockAttempt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complete attempt review details & itemized answer sheet for Teacher / Admin / Student
 * @route   GET /api/attempts/:attemptId/review
 * @access  Private (Teacher, Admin, or Attempt Owner Student)
 */
const getAttemptReview = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user ? (req.user._id || req.user.id) : null;
    const userRole = req.user ? req.user.role : 'student';

    if (getDBStatus() === 'Connected') {
      const attempt = await Attempt.findById(attemptId)
        .populate('student', 'name email role')
        .populate({
          path: 'exam',
          populate: [
            { path: 'questions.question' },
            { path: 'course', select: 'title enrollmentCode teacher' },
          ],
        })
        .populate('answers.question');

      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt record not found' });
      }

      const isOwnerStudent = String(attempt.student?._id || attempt.student) === String(userId);
      let isExamTeacher = false;

      if (userRole === 'teacher') {
        const examCreatedBy = attempt.exam?.createdBy;
        const courseTeacher = attempt.exam?.course?.teacher;
        isExamTeacher = String(examCreatedBy) === String(userId) || String(courseTeacher) === String(userId);
      }

      if (userRole !== 'admin' && !isOwnerStudent && !isExamTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to review this attempt.',
        });
      }

      const startMs = attempt.startedAt ? new Date(attempt.startedAt).getTime() : new Date(attempt.createdAt).getTime();
      const endMs = attempt.submittedAt ? new Date(attempt.submittedAt).getTime() : Date.now();
      const calculatedSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));
      const finalTimeTaken = attempt.timeTaken || calculatedSeconds;

      const mins = Math.floor(finalTimeTaken / 60);
      const secs = finalTimeTaken % 60;
      const formattedTimeTaken = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

      const examDoc = attempt.exam;
      const formattedAnswers = [];

      if (examDoc && Array.isArray(examDoc.questions)) {
        for (let idx = 0; idx < examDoc.questions.length; idx++) {
          const item = examDoc.questions[idx];
          const qDoc = item.question;
          const qId = qDoc ? qDoc._id : item.question;

          const savedAns = attempt.answers.find(a => 
            String(a.question?._id || a.question) === String(qId)
          );

          const qText = savedAns?.questionTextSnapshot || qDoc?.title || qDoc?.questionText || `Question ${idx + 1}`;
          const qType = savedAns?.questionTypeSnapshot || qDoc?.type || 'mcq-single';

          let rawOptions = savedAns?.optionsSnapshot;
          if (!rawOptions || rawOptions.length === 0) {
            rawOptions = qDoc?.options
              ? qDoc.options.map(opt => typeof opt === 'object' ? (opt.text || opt.optionText || '') : String(opt))
              : [];
          }

          const maxMarks = item.marksOverride !== null && item.marksOverride !== undefined
            ? item.marksOverride
            : (qDoc?.marks || 1);

          const selOption = savedAns ? savedAns.selectedOption : null;
          const correctAns = savedAns?.correctAnswerSnapshot !== undefined && savedAns?.correctAnswerSnapshot !== null
            ? savedAns.correctAnswerSnapshot
            : qDoc?.correctAnswer;

          const isCorrect = savedAns ? savedAns.isCorrect : false;
          const marksAwarded = savedAns ? (savedAns.marksAwarded || savedAns.marksObtained || 0) : 0;
          const status = savedAns ? savedAns.status : 'auto-graded';
          const feedback = savedAns ? savedAns.feedback : '';
          const explanation = savedAns?.explanationSnapshot || qDoc?.explanation || qDoc?.solution || '';

          formattedAnswers.push({
            index: idx + 1,
            questionId: qId,
            questionText: qText,
            type: qType,
            options: rawOptions,
            selectedAnswer: selOption,
            correctAnswer: correctAns,
            isCorrect,
            maxMarks,
            marksAwarded,
            status,
            feedback,
            explanation,
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          attemptId: attempt._id,
          student: {
            id: attempt.student?._id,
            name: attempt.student?.name || 'Student',
            email: attempt.student?.email || '',
            role: attempt.student?.role || 'student',
          },
          exam: {
            id: examDoc?._id,
            title: examDoc?.title || 'Examination',
            code: examDoc?.code || '',
            totalMarks: attempt.totalMarks || examDoc?.totalMarks || 100,
            passingMarks: attempt.passingMarks || examDoc?.passingMarks || 40,
            durationMinutes: examDoc?.durationMinutes || 60,
          },
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          timeTakenSeconds: finalTimeTaken,
          formattedTimeTaken,
          score: attempt.score,
          totalMarks: attempt.totalMarks || examDoc?.totalMarks || 100,
          isPassed: attempt.isPassed,
          status: attempt.status,
          gradingStatus: attempt.gradingStatus,
          isFlagged: attempt.isFlagged,
          autoSubmitted: attempt.autoSubmitted,
          autoSubmitReason: attempt.autoSubmitReason,
          answers: formattedAnswers,
        },
      });
    }

    const mockAttempt = MOCK_ATTEMPTS_STORE.find(a => a._id === attemptId);
    return res.status(200).json({
      success: true,
      data: {
        attemptId: mockAttempt ? mockAttempt._id : attemptId,
        student: { name: 'Student', email: 'student@example.com' },
        exam: { title: 'Mock Exam', code: 'MOCK-101', totalMarks: 100 },
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        timeTakenSeconds: 1800,
        formattedTimeTaken: '30m 00s',
        score: mockAttempt ? mockAttempt.score : 85,
        totalMarks: 100,
        isPassed: true,
        answers: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student attempt history
 * @route   GET /api/attempts/my-attempts
 * @access  Private (Student)
 */
const getStudentAttempts = async (req, res, next) => {
  try {
    const studentId = req.user ? (req.user._id || req.user.id) : null;

    if (getDBStatus() === 'Connected') {
      const attempts = await Attempt.find({ student: studentId })
        .populate('exam')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: attempts.length,
        source: 'database',
        data: attempts,
      });
    }

    const mockStudentAttempts = MOCK_ATTEMPTS_STORE.filter(a => String(a.student) === String(studentId));

    return res.status(200).json({
      success: true,
      count: mockStudentAttempts.length,
      source: 'mock',
      data: mockStudentAttempts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pending essay reviews for Teachers/Admins
 * @route   GET /api/attempts/pending-reviews
 * @access  Private (Admin, Teacher)
 */
const getPendingReviews = async (req, res, next) => {
  try {
    if (getDBStatus() === 'Connected') {
      const pendingAttempts = await Attempt.find({ gradingStatus: 'pending-review' })
        .populate('student', 'name email')
        .populate('exam', 'title code')
        .populate('answers.question');

      return res.status(200).json({
        success: true,
        count: pendingAttempts.length,
        data: pendingAttempts,
      });
    }

    const mockPending = MOCK_ATTEMPTS_STORE.filter(a => a.gradingStatus === 'pending-review');

    return res.status(200).json({
      success: true,
      count: mockPending.length,
      data: mockPending,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Grade Essay Answer manually (Teacher / Admin)
 * @route   POST /api/attempts/:id/grade-essay
 * @access  Private (Admin, Teacher)
 */
const gradeEssayAnswer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questionId, marksAssigned, feedback } = req.body;

    if (!questionId || marksAssigned === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Question ID and assigned marks are required.',
      });
    }

    if (getDBStatus() === 'Connected') {
      const attempt = await Attempt.findById(id);
      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt record not found' });
      }

      const answerItem = attempt.answers.find(a => String(a.question) === String(questionId));
      if (!answerItem) {
        return res.status(404).json({ success: false, message: 'Answer item not found in attempt' });
      }

      const prevMarks = answerItem.marksObtained || 0;
      const newMarks = Number(marksAssigned);

      answerItem.marksObtained = newMarks;
      answerItem.status = 'manually-graded';
      answerItem.feedback = feedback || '';

      attempt.score = Math.max(0, attempt.score - prevMarks + newMarks);
      attempt.isPassed = attempt.score >= (attempt.passingMarks || 40);

      const stillPending = attempt.answers.some(a => a.status === 'pending-review');
      attempt.gradingStatus = stillPending ? 'pending-review' : 'graded';

      await attempt.save();

      if (attempt.gradingStatus === 'graded') {
        const studentObj = await User.findById(attempt.student);
        const examObj = await Exam.findById(attempt.exam);
        if (studentObj && studentObj.email) {
          sendExamResultsEmail({
            toEmail: studentObj.email,
            studentName: studentObj.name,
            examTitle: examObj ? examObj.title : 'Online Exam',
            score: attempt.score,
            totalMarks: attempt.totalMarks || (examObj ? examObj.totalMarks : 100),
            isPassed: attempt.isPassed,
            attemptId: attempt._id,
          }).catch(err => console.error('[gradeEssayAnswer] Email error:', err));
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Essay response graded successfully.',
        data: attempt,
      });
    }

    // Mock fallback
    const mockAttempt = MOCK_ATTEMPTS_STORE.find(a => a._id === id);
    if (!mockAttempt) {
      return res.status(404).json({ success: false, message: 'Mock attempt not found' });
    }

    mockAttempt.gradingStatus = 'graded';
    mockAttempt.score += Number(marksAssigned);

    return res.status(200).json({
      success: true,
      message: 'Essay response graded (Mock DB).',
      data: mockAttempt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate and Download Passing PDF Certificate
 * @route   GET /api/attempts/:id/certificate
 * @access  Private
 */
const downloadCertificatePDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    let attempt = null;
    if (getDBStatus() === 'Connected') {
      attempt = await Attempt.findById(id)
        .populate('student', 'name email')
        .populate('exam', 'title code totalMarks passingMarks');
    } else {
      attempt = MOCK_ATTEMPTS_STORE.find(a => a._id === id);
    }

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt record not found.' });
    }

    if (!attempt.isPassed) {
      return res.status(400).json({ success: false, message: 'Certificates are only issued for passed examinations.' });
    }

    const studentName = attempt.student ? attempt.student.name || 'Student' : (req.user ? req.user.name : 'Student');
    const examTitle = attempt.exam ? attempt.exam.title || 'Online Examination' : 'Online Examination';
    const examCode = attempt.exam ? attempt.exam.code || 'EXAM-101' : 'EXAM-101';
    const score = attempt.score || 0;
    const totalMarks = attempt.totalMarks || (attempt.exam ? attempt.exam.totalMarks : 100) || 100;
    const percentage = Math.round((score / totalMarks) * 100);
    const dateStr = new Date(attempt.submittedAt || attempt.updatedAt || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const certificateId = `CERT-${String(attempt._id).slice(-8).toUpperCase()}`;

    // Create PDF Document (Landscape A4)
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 40,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Certificate_${certificateId}.pdf`);

    doc.pipe(res);

    // Decorative Outer Border
    doc.rect(20, 20, 801.89, 555.28).lineWidth(3).stroke('#312e81');
    doc.rect(28, 28, 785.89, 539.28).lineWidth(1).stroke('#f59e0b');

    // Background Gradient Box
    doc.rect(34, 34, 773.89, 527.28).fill('#0f172a');

    // Header Titles
    doc.fillColor('#818cf8').fontSize(14).font('Helvetica-Bold').text('ONLINE EXAMINATION PORTAL', 0, 70, { align: 'center' });
    doc.fillColor('#f59e0b').fontSize(28).font('Helvetica-Bold').text('CERTIFICATE OF ACHIEVEMENT', 0, 98, { align: 'center' });

    doc.strokeColor('#334155').lineWidth(1).moveTo(200, 138).lineTo(641.89, 138).stroke();

    // Recipient Name Section
    doc.fillColor('#94a3b8').fontSize(12).font('Helvetica').text('THIS IS PROUDLY PRESENTED TO', 0, 162, { align: 'center' });
    doc.fillColor('#38bdf8').fontSize(30).font('Helvetica-Bold').text(studentName.toUpperCase(), 0, 192, { align: 'center' });

    doc.fillColor('#cbd5e1').fontSize(12).font('Helvetica').text('for successfully passing the official examination evaluation', 0, 242, { align: 'center' });

    // Exam Info
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(`"${examTitle}"`, 0, 268, { align: 'center' });
    doc.fillColor('#94a3b8').fontSize(11).font('Helvetica').text(`Exam Code: ${examCode}`, 0, 300, { align: 'center' });

    // Performance Metric Badge
    doc.rect(270, 328, 301.89, 60).fillAndStroke('#1e293b', '#475569');
    doc.fillColor('#f8fafc').fontSize(15).font('Helvetica-Bold').text(`Final Score: ${score} / ${totalMarks} (${percentage}%)`, 270, 343, { width: 301.89, align: 'center' });
    doc.fillColor('#10b981').fontSize(11).font('Helvetica-Bold').text('VERIFIED PASS & ACADEMIC CREDENTIAL', 270, 365, { width: 301.89, align: 'center' });

    // Footer Details & Verification Seal
    doc.fillColor('#94a3b8').fontSize(11).font('Helvetica').text(`Issued Date: ${dateStr}`, 80, 435);
    doc.fillColor('#94a3b8').fontSize(11).font('Helvetica').text(`Certificate ID: ${certificateId}`, 80, 455);

    doc.strokeColor('#475569').lineWidth(1).moveTo(560, 450).lineTo(740, 450).stroke();
    doc.fillColor('#e2e8f0').fontSize(11).font('Helvetica-Bold').text('Official Academic Board', 560, 457, { width: 180, align: 'center' });

    doc.fillColor('#475569').fontSize(9).font('Helvetica').text('Verified Electronic Credential - Online Examination Platform Security System', 0, 525, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('[CertificatePDF] Error generating PDF:', error);
    next(error);
  }
};

module.exports = {
  startOrResumeAttempt,
  autoSaveAnswers,
  logProctoringViolation,
  submitAttempt,
  getStudentAttempts,
  getAttemptResult,
  getAttemptReview,
  getPendingReviews,
  gradeEssayAnswer,
  downloadCertificatePDF,
};
