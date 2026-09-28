import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
import { 
  BarChart2, 
  Download, 
  ArrowLeft, 
  HelpCircle, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter,
  Clock,
  Sparkles,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

export default function ExamAnalytics() {
  const { examId } = useParams();
  const { token } = useAuth();

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchExamAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/analytics/exam/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setAnalyticsData(data.data);
      } else {
        throw new Error(data?.message || 'Failed to fetch exam analytics');
      }
    } catch (err) {
      console.error('[ExamAnalytics] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [examId, token]);

  useEffect(() => {
    fetchExamAnalytics();
  }, [fetchExamAnalytics]);

  // CSV Export Generator
  const exportToCSV = () => {
    if (!analyticsData || !analyticsData.attempts) return;

    const exam = analyticsData.exam || {};
    const attempts = analyticsData.attempts || [];

    let csvContent = `Exam Title,${exam.title || 'Exam'}\n`;
    csvContent += `Exam Code,${exam.code || ''}\n`;
    csvContent += `Export Date,${new Date().toLocaleDateString()}\n\n`;
    csvContent += `Candidate Name,Email,Score,Total Marks,Status,Passed,Submitted At\n`;

    attempts.forEach(att => {
      const name = `"${att.student?.name || 'Candidate'}"`;
      const email = att.student?.email || '';
      const score = att.score || 0;
      const total = att.totalMarks || exam.totalMarks || 100;
      const status = att.status || 'submitted';
      const passed = att.isPassed ? 'Passed' : 'Failed';
      const date = new Date(att.submittedAt || att.createdAt).toLocaleString();

      csvContent += `${name},${email},${score},${total},${status},${passed},"${date}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${exam.code || 'exam'}_candidate_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-xs">Computing per-exam question error rates...</p>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4">
        <div className="glass-card p-8 text-center border-red-200 space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Analytics Unavailable</h2>
          <p className="text-gray-600 text-xs">{error || 'Exam analytics details could not be loaded.'}</p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const exam = analyticsData.exam || {};
  const questionStats = analyticsData.questionStats || [];
  const attempts = analyticsData.attempts || [];

  const filteredAttempts = attempts.filter(att => {
    const matchesSearch = (att.student?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (att.student?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' ||
                          (statusFilter === 'passed' && att.isPassed) ||
                          (statusFilter === 'failed' && !att.isPassed);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Admin Overview
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-mono text-xs font-bold">
              {exam.code}
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{exam.title} Analytics</h1>
          </div>
        </div>

        <button
          onClick={exportToCSV}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Candidate Results CSV
        </button>
      </div>

      {/* Question-Wise Performance & Error Rate Table */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-red-600" />
              Question-Wise Error Rate Performance
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Identifies difficult or frequently answered incorrect questions</p>
          </div>
          <span className="text-xs text-gray-500 font-mono">{questionStats.length} Questions Analyzed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-mono border-b border-gray-200">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Question Statement</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-center">Correct / Incorrect</th>
                <th className="p-3 text-right">Error Rate (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {questionStats.map((qs, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-3 font-mono text-gray-400">{idx + 1}</td>
                  <td className="p-3 max-w-md font-bold text-gray-900">
                    {qs.questionText}
                  </td>
                  <td className="p-3 font-mono text-red-600">{qs.type}</td>
                  <td className="p-3 text-center">
                    <span className="text-emerald-700 font-bold">{qs.correctCount}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-rose-700 font-bold">{qs.incorrectCount}</span>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
                      qs.errorRatePercent >= 50
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : qs.errorRatePercent >= 25
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {qs.errorRatePercent}% Error Rate
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Attempt Records Table */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-600" />
            Student Attempt Records ({filteredAttempts.length})
          </h3>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-red-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs cursor-pointer focus:ring-2 focus:ring-red-500"
            >
              <option value="All">All Results</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {filteredAttempts.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">No student attempt records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-mono border-b border-gray-200">
                <tr>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Submitted At</th>
                  <th className="p-3">Proctoring Security</th>
                  <th className="p-3 text-right">Score</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAttempts.map((att) => (
                  <tr key={att._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-bold text-gray-900">{att.student?.name || 'Candidate'}</td>
                    <td className="p-3 text-gray-600">{att.student?.email}</td>
                    <td className="p-3 font-mono text-gray-500">{new Date(att.submittedAt || att.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      {att.autoSubmitted || att.autoSubmitReason ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 shadow-sm">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          {att.autoSubmitReason === 'camera_violation_limit_exceeded'
                            ? 'Auto-Submitted: Camera Violation'
                            : att.autoSubmitReason === 'tab_switch_limit_exceeded'
                            ? 'Auto-Submitted: Tab Switch Violation'
                            : att.autoSubmitReason === 'fullscreen_exit_limit_exceeded'
                            ? 'Auto-Submitted: Fullscreen Exit Violation'
                            : 'Auto-Submitted: Security Violation'}
                        </span>
                      ) : att.isFlagged || (att.tabSwitchCount > 0) || (att.fullscreenExitCount > 0) || (att.cameraViolationCount > 0) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          {att.isFlagged ? 'Flagged' : 'Warnings'} ({att.tabSwitchCount || 0} Tabs, {att.fullscreenExitCount || 0} Exits, {att.cameraViolationCount || 0} Cam)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Clean Session
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-gray-900">{att.score} / {exam.totalMarks || 100}</td>
                    <td className="p-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          att.isPassed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {att.isPassed ? 'Passed' : 'Failed'}
                        </span>
                        {(att.autoSubmitted || att.autoSubmitReason) && (
                          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 font-extrabold text-[9px] uppercase">
                            Auto-Submitted
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
