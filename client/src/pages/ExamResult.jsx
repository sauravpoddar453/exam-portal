import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson, getApiUrl } from '../utils/api';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Clock, 
  BookOpen, 
  ArrowLeft, 
  BarChart2, 
  Sparkles, 
  AlertCircle,
  MessageSquare,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Download,
  FileText
} from 'lucide-react';

export default function ExamResult() {
  const { attemptId } = useParams();
  const { token } = useAuth();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const handleDownloadCertificate = async () => {
    setDownloadingCert(true);
    try {
      const res = await fetch(getApiUrl(`/api/attempts/${attemptId}/certificate`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to generate PDF certificate.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${attemptId.slice(-8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[DownloadCertificate] Error:', err);
      alert('Could not generate PDF certificate. Please try again.');
    } finally {
      setDownloadingCert(false);
    }
  };

  const fetchAttemptResult = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await safeFetchJson(`/api/attempts/${attemptId}/result`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setResult(data.data);
      } else {
        throw new Error(data?.message || 'Failed to fetch result details.');
      }
    } catch (err) {
      console.error('[ExamResult] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [attemptId, token]);

  useEffect(() => {
    fetchAttemptResult();
  }, [fetchAttemptResult]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-300 text-sm">Loading exam performance score breakdown...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4">
        <div className="glass-card p-8 text-center border-rose-500/30 space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Result Not Found</h2>
          <p className="text-slate-400 text-xs">{error || 'Could not load attempt breakdown.'}</p>
          <Link
            to="/student"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const exam = result.exam || {};
  const answers = result.answers || [];
  const totalScore = result.score || 0;
  const maxPossible = result.totalMarks || exam.totalMarks || 100;
  const percentage = Math.round((totalScore / maxPossible) * 100);

  // Performance counts
  const correctCount = answers.filter(a => a.marksObtained > 0).length;
  const incorrectCount = answers.filter(a => a.marksObtained < 0).length;
  const pendingCount = answers.filter(a => a.status === 'pending-review').length;
  const unansweredCount = answers.filter(a => !a.selectedOption && a.marksObtained === 0).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/student"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </Link>

        {result.gradingStatus === 'pending-review' && (
          <div className="px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Essay Grading Pending Manual Review
          </div>
        )}
      </div>

      {/* Hero Score Banner */}
      <div className="glass-card p-6 sm:p-10 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white border-red-500 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
        <div className="space-y-3">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
            result.isPassed 
              ? 'bg-emerald-500/20 text-white border-emerald-300/40' 
              : 'bg-black/20 text-white border-white/30'
          }`}>
            <Award className="w-4 h-4" />
            {result.isPassed ? 'PASSED EXAMINATION' : 'DID NOT PASS'}
          </span>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            {exam.title || 'Examination Result'}
          </h1>

          <p className="text-red-100 text-xs font-mono">
            Code: {exam.code} | Submitted: {new Date(result.submittedAt || result.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Big Score Ring */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl min-w-[200px]">
          <span className="text-4xl font-black text-white">{totalScore}</span>
          <span className="text-xs text-red-100 font-mono mt-0.5">out of {maxPossible} Points</span>
        </div>
      </div>

      {/* Official Certificate Download Banner */}
      {result.isPassed && (
        <div className="glass-card p-6 bg-gradient-to-r from-amber-50 via-amber-100/40 to-white border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-extrabold flex-shrink-0 shadow-md">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[10px] uppercase tracking-wider">
                  VERIFIED CREDENTIAL
                </span>
                <span className="text-gray-500 text-xs font-mono">ID: CERT-{attemptId.slice(-8).toUpperCase()}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mt-1">Official Academic Certificate of Completion</h3>
              <p className="text-xs text-gray-700 mt-0.5">
                Congratulations! You passed this examination. Download your official PDF certificate signed with security seal.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadCertificate}
            disabled={downloadingCert}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 text-xs font-extrabold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
          >
            {downloadingCert ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF Certificate
              </>
            )}
          </button>
        </div>
      )}

      {/* Performance Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="glass-card p-4 border-emerald-200 bg-white">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block">Correct Answers</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {correctCount}
          </div>
        </div>

        <div className="glass-card p-4 border-red-200 bg-white">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block">Incorrect Answers</span>
          <div className="text-2xl font-bold text-red-700 mt-1 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            {incorrectCount}
          </div>
        </div>

        <div className="glass-card p-4 border-amber-200 bg-white">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block">Pending Review</span>
          <div className="text-2xl font-bold text-amber-700 mt-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            {pendingCount}
          </div>
        </div>

        <div className="glass-card p-4 border-gray-200 bg-white">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block">Unanswered</span>
          <div className="text-2xl font-bold text-gray-800 mt-1 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-gray-400" />
            {unansweredCount}
          </div>
        </div>

      </div>

      {/* Auto-Submitted Security Alert Banner */}
      {result.autoSubmitted && (
        <div className="p-4 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs flex items-center gap-3 font-semibold shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>
            <strong className="text-red-950 font-bold uppercase tracking-wide">Auto-Submitted (Security Violation):</strong> This examination attempt was forcibly submitted due to {
              result.autoSubmitReason === 'tab_switch_limit_exceeded'
                ? 'repeated tab-switching violations'
                : result.autoSubmitReason === 'fullscreen_exit_limit_exceeded'
                ? '3 full-screen exit violations'
                : 'security policy enforcement'
            }.
          </span>
        </div>
      )}

      {/* Proctoring & Security Audit Card */}
      <div className={`glass-card p-6 border transition-all ${
        result.isFlagged || (result.tabSwitchCount > 0) || (result.fullscreenExitCount > 0)
          ? 'border-amber-300 bg-amber-50/40'
          : 'border-emerald-200 bg-emerald-50/20'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              result.isFlagged
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}>
              {result.isFlagged ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Proctoring & Anti-Cheating Audit Log
                {result.isFlagged && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-800 border border-red-300">
                    Flagged Infraction
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Automated background security telemetry recorded during candidate attempt</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <span className="text-gray-500 text-[10px] block uppercase">Tab Switches</span>
              <span className={`font-bold ${result.tabSwitchCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {result.tabSwitchCount || 0} Events
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <span className="text-gray-500 text-[10px] block uppercase">Fullscreen Exits</span>
              <span className={`font-bold ${result.fullscreenExitCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {result.fullscreenExitCount || 0} Exits
              </span>
            </div>
          </div>
        </div>

        {/* Security Event Timeline */}
        {result.proctoringLogs && result.proctoringLogs.length > 0 ? (
          <div className="mt-4 space-y-2">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Recorded Violations Timeline</span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {result.proctoringLogs.map((log, lIdx) => (
                <div key={lIdx} className="p-2.5 rounded-xl bg-white border border-gray-200 text-xs flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-gray-900 font-medium capitalize">{log.eventType?.replace('_', ' ')}</span>
                    <span className="text-gray-500 text-[11px] font-mono">({log.details})</span>
                  </div>
                  <span className="text-gray-400 font-mono text-[11px] flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 text-xs text-emerald-700 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            No proctoring or tab-switch infractions detected during session.
          </div>
        )}
      </div>

      {/* Question-by-Question Detailed Answer Comparison */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-red-600" />
            Detailed Answer Review & Solutions
          </h3>
          <span className="text-xs text-gray-500">{answers.length} Questions Evaluated</span>
        </div>

        <div className="space-y-4">
          {answers.map((item, idx) => {
            const q = item.question || {};
            const isCorrect = item.marksObtained > 0;
            const isPending = item.status === 'pending-review';
            const isUnanswered = !item.selectedOption;

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border transition-all space-y-3 ${
                  isPending
                    ? 'bg-amber-50/60 border-amber-200'
                    : isCorrect
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : isUnanswered
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-red-50/60 border-red-200'
                }`}
              >
                {/* Item Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-gray-200 text-gray-800 font-mono text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-mono text-red-700 font-bold uppercase">{q.type || 'MCQ'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {isPending ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                        Pending Manual Evaluation
                      </span>
                    ) : isCorrect ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                        +{item.marksObtained} Marks
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 font-bold">
                        {item.marksObtained} Marks
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Prompt */}
                <h4 className="text-sm font-bold text-gray-900 leading-relaxed">
                  {q.questionText || 'Question details unavailable'}
                </h4>

                {/* Candidate Submitted Answer */}
                <div className="p-3 rounded-xl bg-white border border-gray-200 text-xs space-y-1">
                  <span className="text-gray-500 font-medium block">Your Submitted Response:</span>
                  <span className={`font-semibold ${
                    isPending 
                      ? 'text-amber-800' 
                      : isCorrect 
                      ? 'text-emerald-700' 
                      : isUnanswered 
                      ? 'text-gray-400 italic' 
                      : 'text-red-700 line-through'
                  }`}>
                    {Array.isArray(item.selectedOption)
                      ? item.selectedOption.join(', ')
                      : item.selectedOption || '(Unanswered)'}
                  </span>
                </div>

                {/* System Correct Answer */}
                {!isPending && q.correctAnswer && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <span className="text-emerald-800 font-medium block">System Correct Solution:</span>
                    <span className="text-emerald-900 font-semibold">
                      {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                    </span>
                  </div>
                )}

                {/* Teacher Feedback (if evaluated) */}
                {item.feedback && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-900">Teacher Evaluation Feedback:</span>
                      <p className="text-gray-800 mt-0.5">{item.feedback}</p>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
