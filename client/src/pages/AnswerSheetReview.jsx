import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
import BrandedLoader from '../components/BrandedLoader';
import { 
  ArrowLeft, 
  Clock, 
  Award, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  User, 
  BookOpen, 
  FileText, 
  ShieldAlert, 
  ShieldCheck, 
  ExternalLink,
  AlertTriangle,
  MessageSquare,
  Flag,
  Check
} from 'lucide-react';

export default function AnswerSheetReview() {
  const { attemptId } = useParams();
  const { token, user } = useAuth();

  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Report Question Modal State
  const [reportTargetQuestion, setReportTargetQuestion] = useState(null);
  const [reportReason, setReportReason] = useState('Incorrect Answer');
  const [reportComment, setReportComment] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState(null);

  const fetchAttemptReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await safeFetchJson(`/api/attempts/${attemptId}/review`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setReviewData(data.data);
      } else {
        throw new Error(data?.message || 'Failed to load attempt answer sheet review.');
      }
    } catch (err) {
      console.error('[AnswerSheetReview] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [attemptId, token]);

  useEffect(() => {
    fetchAttemptReview();
  }, [fetchAttemptReview]);

  const handleReportQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!reportTargetQuestion) return;

    setReportSubmitting(true);
    setReportSuccessMsg(null);
    try {
      const qId = reportTargetQuestion.questionId || reportTargetQuestion.question || reportTargetQuestion._id;
      const { ok, data } = await safeFetchJson('/api/questions/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId: qId,
          reason: reportReason,
          comment: reportComment,
        }),
      });

      if (ok && data?.success) {
        setReportSuccessMsg('Question report submitted to platform administrators successfully.');
        setTimeout(() => {
          setReportTargetQuestion(null);
          setReportSuccessMsg(null);
          setReportComment('');
        }, 1800);
      } else {
        alert(data?.message || 'Failed to submit report');
      }
    } catch (err) {
      alert('Error submitting report: ' + err.message);
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) {
    return <BrandedLoader message="Loading candidate answer sheet & timing telemetry..." />;
  }

  if (error || !reviewData) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4">
        <div className="glass-card p-8 text-center border border-rose-500/30 space-y-4">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Answer Sheet Unavailable</h2>
          <p className="text-[#a5a3c9] text-xs">{error || 'Could not load candidate attempt review.'}</p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { student, exam, answers, score, totalMarks, isPassed, formattedTimeTaken, timeTakenSeconds, submittedAt, gradingStatus, isFlagged, autoSubmitted, autoSubmitReason } = reviewData;

  const correctCount = answers.filter(a => a.isCorrect || a.marksAwarded > 0).length;
  const incorrectCount = answers.filter(a => !a.isCorrect && a.selectedAnswer && a.status !== 'pending-review').length;
  const pendingCount = answers.filter(a => a.status === 'pending-review').length;
  const unansweredCount = answers.filter(a => !a.selectedAnswer).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between border-b border-indigo-900/40 pb-4">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#a5a3c9] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          Back to Submissions
        </button>

        {gradingStatus === 'pending-review' && (
          <Link
            to="/grading"
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            Grade Pending Essays in Queue
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </Link>
        )}
      </div>

      {/* Main Candidate & Attempt Banner */}
      <div className="glass-card p-6 sm:p-8 border border-amber-500/15 rounded-2xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-xs font-bold uppercase">
                {exam.code || 'EXAM'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${
                isPassed
                  ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
              }`}>
                {isPassed ? 'Passed' : 'Failed'}
              </span>
              {autoSubmitted && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  Auto-Submitted
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Candidate Answer Sheet: {student.name}
            </h1>
            <p className="text-[#a5a3c9] text-xs flex items-center gap-3">
              <span>Candidate Email: <strong className="text-white">{student.email}</strong></span>
              <span>•</span>
              <span>Exam Paper: <strong className="text-white">{exam.title}</strong></span>
            </p>
          </div>

          {/* Big Score Card */}
          <div className="flex items-center gap-4 bg-indigo-950/80 p-4 rounded-2xl border border-indigo-800 min-w-[220px]">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#a5a3c9] uppercase block">Final Evaluated Score</span>
              <div className="text-2xl font-black text-white">
                {score} <span className="text-xs font-normal text-[#a5a3c9]">/ {totalMarks} pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-indigo-900/40 text-xs">
          <div className="flex items-center gap-2 text-[#a5a3c9]">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Time Taken: <strong className="text-white font-mono font-bold">{formattedTimeTaken}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-[#a5a3c9]">
            <FileText className="w-4 h-4 text-[#a5a3c9] flex-shrink-0" />
            <span>Submitted: <strong className="text-white">{submittedAt ? new Date(submittedAt).toLocaleString() : 'N/A'}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-[#a5a3c9]">
            {isFlagged ? (
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
            )}
            <span>Security Status: <strong className={isFlagged ? 'text-amber-400' : 'text-teal-300'}>
              {isFlagged ? 'Flagged Infraction' : 'Clean Session'}
            </strong></span>
          </div>
        </div>
      </div>

      {/* Stats Breakdown Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-amber-500/15">
          <span className="text-[11px] font-semibold text-[#a5a3c9] uppercase block">Correct</span>
          <div className="text-2xl font-bold text-teal-300 mt-1 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            {correctCount}
          </div>
        </div>

        <div className="glass-card p-4 border border-amber-500/15">
          <span className="text-[11px] font-semibold text-[#a5a3c9] uppercase block">Incorrect</span>
          <div className="text-2xl font-bold text-rose-300 mt-1 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-400" />
            {incorrectCount}
          </div>
        </div>

        <div className="glass-card p-4 border border-amber-500/15">
          <span className="text-[11px] font-semibold text-[#a5a3c9] uppercase block">Pending Essay Review</span>
          <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            {pendingCount}
          </div>
        </div>

        <div className="glass-card p-4 border border-amber-500/15">
          <span className="text-[11px] font-semibold text-[#a5a3c9] uppercase block">Unanswered</span>
          <div className="text-2xl font-bold text-slate-300 mt-1 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#a5a3c9]" />
            {unansweredCount}
          </div>
        </div>
      </div>

      {/* Itemized Questions & Answers Review List */}
      <div className="glass-card p-6 border border-amber-500/15 rounded-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-indigo-900/40 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Full Answer Sheet Review</h3>
          </div>
          <span className="text-xs text-[#a5a3c9] font-mono">{answers.length} Total Questions</span>
        </div>

        <div className="space-y-6">
          {answers.map((item, idx) => {
            const isCorrect = item.isCorrect || item.marksAwarded > 0;
            const isPending = item.status === 'pending-review';
            const isUnanswered = !item.selectedAnswer;
            const isEssay = item.type === 'essay';

            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl border transition-all space-y-4 ${
                  isPending
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : isCorrect
                    ? 'bg-teal-500/10 border-teal-500/20'
                    : isUnanswered
                    ? 'bg-indigo-950/60 border-indigo-800/80'
                    : 'bg-rose-500/10 border-rose-500/20'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-900 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold uppercase">{item.type || 'MCQ'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setReportTargetQuestion(item)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-900/40 border border-amber-500/20 text-indigo-200 hover:text-amber-400 hover:border-amber-400/50 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                      title="Report an issue with this question to administrators"
                    >
                      <Flag className="w-3 h-3 text-amber-400" />
                      <span>Report Question</span>
                    </button>

                    <span className="text-xs font-mono font-bold text-teal-400">
                      Awarded: {item.marksAwarded || 0} Points
                    </span>
                  </div>
                </div>

                <p className="text-sm font-bold text-white leading-relaxed">
                  {item.questionText || 'Question prompt unavailable'}
                </p>

                {/* Candidate Response */}
                <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-800 text-xs space-y-1">
                  <span className="text-[#a5a3c9] font-medium block">Candidate Submitted Response:</span>
                  <span className={`font-semibold ${
                    isPending 
                      ? 'text-amber-400' 
                      : isCorrect 
                      ? 'text-teal-300' 
                      : isUnanswered 
                      ? 'text-[#a5a3c9] italic' 
                      : 'text-rose-400 line-through'
                  }`}>
                    {Array.isArray(item.selectedAnswer) ? item.selectedAnswer.join(', ') : item.selectedAnswer || '(Unanswered)'}
                  </span>
                </div>

                {/* System Correct Solution */}
                {item.correctAnswer && (
                  <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs space-y-1">
                    <span className="text-teal-400 font-medium block">System Correct Solution:</span>
                    <span className="text-teal-200 font-semibold">
                      {Array.isArray(item.correctAnswer) ? item.correctAnswer.join(', ') : String(item.correctAnswer)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL: REPORT QUESTION FORM --- */}
      {reportTargetQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form 
            onSubmit={handleReportQuestionSubmit}
            className="bg-[#171545] max-w-md w-full p-6 space-y-4 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white"
          >
            <div className="flex items-center justify-between border-b border-indigo-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Report Question Issue</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportTargetQuestion(null);
                  setReportSuccessMsg(null);
                }}
                className="text-[#a5a3c9] hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-900/60 text-xs">
              <span className="text-[#a5a3c9] block mb-1">Question Prompt:</span>
              <p className="text-white font-semibold line-clamp-2">
                {reportTargetQuestion.questionText || 'Selected Question'}
              </p>
            </div>

            {reportSuccessMsg ? (
              <div className="p-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{reportSuccessMsg}</span>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">
                    Reason for Reporting *
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-xs text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="Incorrect Answer">Incorrect Answer / Wrong Key</option>
                    <option value="Unclear Question">Unclear Question / Ambiguous</option>
                    <option value="Typo/Error">Typo or Formatting Error</option>
                    <option value="Other">Other Reason</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about why this question or answer is incorrect..."
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-xs text-white focus:border-amber-400 focus:outline-none placeholder:text-[#a5a3c9]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportTargetQuestion(null)}
                    className="w-1/2 py-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-[#a5a3c9] hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

    </div>
  );
}
