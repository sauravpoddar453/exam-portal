import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
import BrandedLoader from '../components/BrandedLoader';
import { 
  FileCheck, 
  User, 
  CheckCircle, 
  MessageSquare, 
  BookOpen, 
  Award, 
  AlertCircle, 
  Sparkles,
  Send
} from 'lucide-react';

export default function ManualGrading() {
  const { token } = useAuth();

  const [pendingAttempts, setPendingAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active item being graded
  const [gradeMarks, setGradeMarks] = useState({});
  const [gradeFeedback, setGradeFeedback] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const fetchPendingReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await safeFetchJson('/api/attempts/pending-reviews', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setPendingAttempts(data.data || []);
      } else {
        throw new Error(data?.message || 'Failed to load pending essay submissions.');
      }
    } catch (err) {
      console.error('[ManualGrading] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPendingReviews();
  }, [fetchPendingReviews]);

  const handleGradeSubmit = async (attemptId, questionId, maxMarks) => {
    const marksKey = `${attemptId}_${questionId}`;
    const assignedMarks = gradeMarks[marksKey];

    if (assignedMarks === undefined || assignedMarks === '') {
      alert('Please enter a valid marks score!');
      return;
    }

    if (Number(assignedMarks) < 0 || Number(assignedMarks) > maxMarks) {
      alert(`Assigned marks must be between 0 and ${maxMarks}!`);
      return;
    }

    try {
      setSubmittingId(marksKey);
      const { ok, data } = await safeFetchJson(`/api/attempts/${attemptId}/grade-essay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId,
          marksAssigned: Number(assignedMarks),
          feedback: gradeFeedback[marksKey] || '',
        }),
      });

      if (ok && data?.success) {
        alert('Essay response graded successfully!');
        fetchPendingReviews();
      } else {
        alert(data?.message || 'Error saving grade.');
      }
    } catch (err) {
      alert('Failed to submit grade: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-900/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#f4f4f8] tracking-tight">Manual Essay Grading Studio</h1>
          </div>
          <p className="text-[#a5a3c9] text-sm mt-1">
            Review, evaluate, and assign custom scores and feedback for student essay responses.
          </p>
        </div>

        <button
          onClick={fetchPendingReviews}
          className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 hover:bg-indigo-900/40 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          Refresh Queue
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <BrandedLoader message="Loading pending essay submissions..." />
      ) : error ? (
        <div className="glass-card p-6 text-center text-rose-300 text-xs border border-rose-500/20">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
          {error}
        </div>
      ) : pendingAttempts.length === 0 ? (
        <div className="glass-card py-16 text-center text-[#a5a3c9] space-y-3 border border-amber-500/15">
          <CheckCircle className="w-12 h-12 text-teal-400 mx-auto" />
          <p className="text-base font-bold text-white">All Essay Submissions Evaluated!</p>
          <p className="text-xs text-[#a5a3c9]">There are no pending essay answers requiring manual review at this time.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingAttempts.map((attempt) => {
            const studentName = attempt.student?.name || 'Student Candidate';
            const studentEmail = attempt.student?.email || '';
            const examTitle = attempt.exam?.title || 'Exam Paper';
            const pendingAnswers = (attempt.answers || []).filter(a => a.status === 'pending-review');

            return (
              <div key={attempt._id} className="glass-card p-6 space-y-6 border border-amber-500/15 rounded-2xl">
                
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-900/40 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{studentName}</h3>
                      <span className="text-xs text-[#a5a3c9]">{studentEmail} | Exam: <strong className="text-amber-400">{examTitle}</strong></span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {pendingAnswers.length} Pending Essay(s)
                  </span>
                </div>

                {/* List of Pending Essay Questions */}
                <div className="space-y-6">
                  {pendingAnswers.map((item, idx) => {
                    const q = item.question || {};
                    const qId = q._id || item.question;
                    const marksKey = `${attempt._id}_${qId}`;
                    const maxMarks = q.marks || 10;

                    return (
                      <div key={idx} className="p-5 rounded-2xl bg-indigo-950/80 border border-indigo-800 space-y-4">
                        
                        {/* Question Prompt */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-amber-400">Essay Question #{idx + 1}</span>
                          <span className="text-xs font-mono font-bold text-teal-400">Max Marks: {maxMarks}</span>
                        </div>

                        <p className="text-sm font-bold text-white leading-relaxed">
                          {q.questionText || 'Essay Question Prompt'}
                        </p>

                        {/* Candidate Submitted Response */}
                        <div className="p-4 rounded-xl bg-indigo-950 border border-indigo-800 space-y-1">
                          <span className="text-[11px] font-semibold uppercase text-[#a5a3c9] block">Candidate Submitted Answer:</span>
                          <p className="text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                            {item.selectedOption || '(Empty response submitted)'}
                          </p>
                        </div>

                        {/* Sample Solution / Rubric if available */}
                        {q.correctAnswer && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                            <span className="text-amber-400 font-bold block mb-1">Sample Evaluation Rubric:</span>
                            <span className="text-slate-300 text-[11px]">{q.correctAnswer}</span>
                          </div>
                        )}

                        {/* Grading Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <div>
                            <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Assign Marks (0 to {maxMarks}) *</label>
                            <input
                              type="number"
                              min={0}
                              max={maxMarks}
                              step={0.5}
                              placeholder="0"
                              value={gradeMarks[marksKey] ?? ''}
                              onChange={(e) => setGradeMarks(prev => ({ ...prev, [marksKey]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-teal-400 font-mono font-bold text-xs focus:border-amber-400"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Feedback / Notes (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. Well explained key principles..."
                              value={gradeFeedback[marksKey] ?? ''}
                              onChange={(e) => setGradeFeedback(prev => ({ ...prev, [marksKey]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs focus:border-amber-400"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleGradeSubmit(attempt._id, qId, maxMarks)}
                          disabled={submittingId === marksKey}
                          className="px-5 py-2 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {submittingId === marksKey ? 'Saving Grade...' : 'Confirm Grade & Save'}
                        </button>

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
