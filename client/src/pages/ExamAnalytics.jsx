import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
import BrandedLoader from '../components/BrandedLoader';
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
  ShieldCheck,
  FileText
} from 'lucide-react';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '00m 00s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

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
    return <BrandedLoader message="Computing per-exam question error rates..." />;
  }

  if (error || !analyticsData) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4">
        <div className="glass-card p-8 text-center border-rose-500/30 space-y-4">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Analytics Unavailable</h2>
          <p className="text-[#a5a3c9] text-xs">{error || 'Exam analytics details could not be loaded.'}</p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20"
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-900/40 pb-6">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a5a3c9] hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            Back to Admin Overview
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-xs font-bold">
              {exam.code}
            </span>
            <h1 className="text-3xl font-extrabold text-[#f4f4f8] tracking-tight">{exam.title} Analytics</h1>
          </div>
        </div>

        <button
          onClick={exportToCSV}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Candidate Results CSV
        </button>
      </div>

      {/* Question-Wise Performance & Error Rate Table */}
      <div className="glass-card p-6 space-y-6 border border-amber-500/15 rounded-2xl">
        <div className="flex items-center justify-between border-b border-indigo-900/40 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-amber-400" />
              Question-Wise Error Rate Performance
            </h3>
            <p className="text-xs text-[#a5a3c9] mt-0.5">Identifies difficult or frequently answered incorrect questions</p>
          </div>
          <span className="text-xs text-[#a5a3c9] font-mono">{questionStats.length} Questions Analyzed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-indigo-950/90 text-[#a5a3c9] uppercase text-[10px] font-mono border-b border-indigo-900/60">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Question Statement</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-center">Correct / Incorrect</th>
                <th className="p-3 text-right">Error Rate (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-900/40">
              {questionStats.map((qs, idx) => (
                <tr key={idx} className="hover:bg-indigo-900/30 transition-colors">
                  <td className="p-3 font-mono text-[#a5a3c9]">{idx + 1}</td>
                  <td className="p-3 max-w-md font-bold text-white">
                    {qs.questionText}
                  </td>
                  <td className="p-3 font-mono text-[#a5a3c9] capitalize">{qs.type || 'MCQ'}</td>
                  <td className="p-3 text-center">
                    <span className="text-teal-400 font-bold">{qs.correctCount || 0}</span>
                    <span className="text-[#a5a3c9] mx-1">/</span>
                    <span className="text-rose-400 font-bold">{qs.incorrectCount || 0}</span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded border ${
                      (qs.errorRate || 0) > 50
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                    }`}>
                      {qs.errorRate || 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
