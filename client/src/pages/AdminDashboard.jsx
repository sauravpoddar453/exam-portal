import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
import AnimatedCounter from '../components/AnimatedCounter';
import BrandedLoader from '../components/BrandedLoader';
import { 
  ShieldAlert, 
  Users, 
  Activity, 
  Lock, 
  BarChart2, 
  UserPlus, 
  Upload, 
  Download, 
  Search, 
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  X,
  BookOpen,
  ArrowUpRight,
  Layers,
  AlertTriangle,
  Trash2,
  UserCheck,
  UserX,
  Eye,
  Flag,
  Shield,
  Clock,
  Check,
  Copy,
  RefreshCw,
  Award,
  Megaphone,
  Server,
  HardDrive,
  Send,
  TrendingUp,
  LogOut,
  FileText,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

export default function AdminDashboard() {
  const { token, user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'approvals' | 'courses' | 'proctoring'

  // 1. Overview Stats & Charts State
  const [overviewData, setOverviewData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // 2. User Management State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userDeleteModal, setUserDeleteModal] = useState(null); // user object to delete
  const [deleteConfirmationData, setDeleteConfirmationData] = useState(null); // warning info

  // Bulk Import Users Modal
  const [showBulkUserModal, setShowBulkUserModal] = useState(false);
  const [parsedCsvUsers, setParsedCsvUsers] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');

  // 3. Teacher Approvals State
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('pending');
  const [rejectModalTarget, setRejectModalTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // 4. Course & Exam Oversight State
  const [adminCourses, setAdminCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseDeleteTarget, setCourseDeleteTarget] = useState(null);
  const [courseDeleteWarning, setCourseDeleteWarning] = useState(null);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseSort, setCourseSort] = useState('newest'); // 'newest' | 'oldest' | 'students-high' | 'students-low' | 'title-asc'
  const [copiedCourseId, setCopiedCourseId] = useState(null);
  const [courseViewMode, setCourseViewMode] = useState('table'); // 'table' | 'cards'

  // 5. Proctoring Security Audit & System Logs State
  const [proctorAttempts, setProctorAttempts] = useState([]);
  const [proctorLoading, setProctorLoading] = useState(false);
  const [proctorSearch, setProctorSearch] = useState('');
  const [proctorReasonFilter, setProctorReasonFilter] = useState('All');

  const [systemLogs, setSystemLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logTypeFilter, setLogTypeFilter] = useState('all');

  // 6. Platform Usage & Question Quality State
  const [platformUsage, setPlatformUsage] = useState(null);
  const [qualityAuditData, setQualityAuditData] = useState(null);

  // 7. Question Moderation Reports State
  const [questionReports, setQuestionReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('pending');

  // 8. Broadcast Announcement State
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState('all');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // 9. Advanced Analytics State
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [teacherLeaderboard, setTeacherLeaderboard] = useState([]);
  const [peakUsageData, setPeakUsageData] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // API Call: Fetch Executive Overview Stats
  const fetchOverview = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setOverviewData(data.data);
      }
    } catch (err) {
      console.error('[AdminDashboard] Fetch overview error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  // API Call: Fetch Users List
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (userSearch) queryParams.append('search', userSearch);
      if (userRoleFilter !== 'All') queryParams.append('role', userRoleFilter);

      const { ok, data } = await safeFetchJson(`/api/admin/users?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setUsers(data.data || []);
      }
    } catch (err) {
      console.error('[AdminDashboard] Fetch users error:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [token, userSearch, userRoleFilter]);

  // API Call: Fetch Teacher Approvals
  const fetchTeacherApprovals = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (approvalStatusFilter !== 'All') queryParams.append('status', approvalStatusFilter);

      const { ok, data } = await safeFetchJson(`/api/admin/teacher-approvals?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setTeachers(data.data || []);
      }
    } catch (err) {
      console.error('[AdminDashboard] Fetch teacher approvals error:', err);
    } finally {
      setTeachersLoading(false);
    }
  }, [token, approvalStatusFilter]);

  // API Call: Fetch Admin Courses
  const fetchAdminCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/admin/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setAdminCourses(data.data || []);
      }
    } catch (err) {
      console.error('[AdminDashboard] Fetch admin courses error:', err);
    } finally {
      setCoursesLoading(false);
    }
  }, [token]);

  // API Call: Fetch Security & Proctor Audit
  const fetchProctorAudit = useCallback(async () => {
    setProctorLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (proctorSearch) queryParams.append('search', proctorSearch);
      if (proctorReasonFilter !== 'All') queryParams.append('reason', proctorReasonFilter);

      const { ok, data } = await safeFetchJson(`/api/admin/proctor-audit?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        setProctorAttempts(data.data || []);
      }
    } catch (err) {
      console.error('[AdminDashboard] Fetch proctor audit error:', err);
    } finally {
      setProctorLoading(false);
    }
  }, [token, proctorSearch, proctorReasonFilter]);

  // API Call: Fetch Platform Usage & Question Quality Audit
  const fetchPlatformUsageAndQuality = useCallback(async () => {
    try {
      const [usageRes, qualityRes] = await Promise.all([
        safeFetchJson('/api/admin/platform-usage', { headers: { Authorization: `Bearer ${token}` } }),
        safeFetchJson('/api/admin/question-quality', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (usageRes.ok && usageRes.data?.success) setPlatformUsage(usageRes.data.data);
      if (qualityRes.ok && qualityRes.data?.success) setQualityAuditData(qualityRes.data.data);
    } catch (err) {
      console.error('[AdminDashboard] Fetch platform usage error:', err);
    }
  }, [token]);

  // API Call: Fetch System Logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/logs?type=${logTypeFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) setSystemLogs(data.data || []);
    } catch (err) {
      console.error('[AdminDashboard] Fetch logs error:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [token, logTypeFilter]);

  // API Call: Fetch Question Reports
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/reports?status=${reportStatusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) setQuestionReports(data.data || []);
    } catch (err) {
      console.error('[AdminDashboard] Fetch reports error:', err);
    } finally {
      setReportsLoading(false);
    }
  }, [token, reportStatusFilter]);

  // API Call: Fetch Broadcast History
  const fetchBroadcastHistory = useCallback(async () => {
    setBroadcastLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/admin/broadcasts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) setBroadcastHistory(data.data || []);
    } catch (err) {
      console.error('[AdminDashboard] Fetch broadcast history error:', err);
    } finally {
      setBroadcastLoading(false);
    }
  }, [token]);

  // API Call: Fetch Advanced Analytics
  const fetchAdvancedAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [subjRes, teachRes, peakRes] = await Promise.all([
        safeFetchJson('/api/admin/analytics/subject-performance', { headers: { Authorization: `Bearer ${token}` } }),
        safeFetchJson('/api/admin/analytics/teacher-leaderboard', { headers: { Authorization: `Bearer ${token}` } }),
        safeFetchJson('/api/admin/analytics/peak-usage', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (subjRes.ok && subjRes.data?.success) setSubjectPerformance(subjRes.data.data || []);
      if (teachRes.ok && teachRes.data?.success) setTeacherLeaderboard(teachRes.data.data || []);
      if (peakRes.ok && peakRes.data?.success) setPeakUsageData(peakRes.data.data || []);
    } catch (err) {
      console.error('[AdminDashboard] Fetch analytics error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token]);

  // Tab change effect triggers
  useEffect(() => {
    fetchOverview();
    fetchPlatformUsageAndQuality();
  }, [fetchOverview, fetchPlatformUsageAndQuality]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'approvals') fetchTeacherApprovals();
    if (activeTab === 'courses') fetchAdminCourses();
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'broadcast') fetchBroadcastHistory();
    if (activeTab === 'logs') {
      fetchProctorAudit();
      fetchLogs();
    }
    if (activeTab === 'analytics') fetchAdvancedAnalytics();
  }, [activeTab, fetchUsers, fetchTeacherApprovals, fetchAdminCourses, fetchReports, fetchBroadcastHistory, fetchProctorAudit, fetchLogs, fetchAdvancedAnalytics]);

  // Handle Force Logout
  const handleForceLogoutUser = async (userId, userName) => {
    if (!window.confirm(`Revoke all active login sessions for ${userName || 'this user'}?`)) return;
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/users/${userId}/force-logout`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok && data?.success) {
        alert(data.message);
        fetchUsers();
      } else {
        alert(data?.message || 'Failed to force logout user');
      }
    } catch (err) {
      alert('Error in force logout: ' + err.message);
    }
  };

  // Handle Report Status Update
  const handleUpdateReportStatus = async (reportId, newStatus) => {
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/reports/${reportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (ok && data?.success) {
        setQuestionReports(prev => prev.map(r => r._id === reportId ? { ...r, status: newStatus } : r));
      } else {
        alert(data?.message || 'Failed to update report status');
      }
    } catch (err) {
      alert('Error updating report: ' + err.message);
    }
  };

  // Handle Send Broadcast
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    if (!window.confirm(`Dispatch email announcement to ${broadcastAudience.toUpperCase()} users?`)) return;

    setBroadcastSending(true);
    try {
      const { ok, data } = await safeFetchJson('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: broadcastMessage, audience: broadcastAudience }),
      });
      if (ok && data?.success) {
        alert(data.message);
        setBroadcastMessage('');
        fetchBroadcastHistory();
      } else {
        alert(data?.message || 'Failed to send broadcast announcement');
      }
    } catch (err) {
      alert('Error sending broadcast: ' + err.message);
    } finally {
      setBroadcastSending(false);
    }
  };

  // Handle Export CSV
  const handleExportCsv = async (exportType) => {
    try {
      const response = await fetch(`/api/admin/export/${exportType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Export failed with status ' + response.status);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${exportType}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleToggleBlockUser = async (userId, currentBlockedStatus) => {
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isBlocked: !currentBlockedStatus }),
      });

      if (ok && data?.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBlocked: !currentBlockedStatus } : u));
      } else {
        alert(data?.message || 'Error updating user status');
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (ok && data?.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      } else {
        alert(data?.message || 'Error updating user role');
      }
    } catch (err) {
      alert('Failed to update role: ' + err.message);
    }
  };

  const handleDeleteUser = async (userTarget, force = false) => {
    const targetUser = userTarget || userDeleteModal;
    const userId = targetUser?._id || targetUser?.id;
    if (!userId) {
      alert('Invalid user selection for deletion.');
      return;
    }

    try {
      setUserDeleteModal(targetUser);
      const endpoint = `/api/admin/users/${userId}${force ? '?force=true' : ''}`;
      const { ok, data } = await safeFetchJson(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (ok && data?.success) {
        alert(`User ${targetUser.name || 'Account'} deleted successfully.`);
        setUserDeleteModal(null);
        setDeleteConfirmationData(null);
        fetchUsers();
      } else if (data?.requiresConfirmation) {
        setDeleteConfirmationData(data);
      } else {
        alert(data?.message || 'Failed to delete user');
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  const handleSelectAllUsers = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map(u => u._id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleSelectUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkBlock = async () => {
    if (selectedUserIds.length === 0) return;
    if (!window.confirm(`Block ${selectedUserIds.length} selected user account(s)?`)) return;

    try {
      const { ok, data } = await safeFetchJson('/api/admin/users/bulk-block', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });

      if (ok && data?.success) {
        alert(data.message);
        setSelectedUserIds([]);
        fetchUsers();
      } else {
        alert(data?.message || 'Bulk block failed.');
      }
    } catch (err) {
      alert('Error in bulk block: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedUserIds.length} selected user account(s) and all associated data?`)) return;

    try {
      const { ok, data } = await safeFetchJson('/api/admin/users/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: selectedUserIds, force: true }),
      });

      if (ok && data?.success) {
        alert(data.message);
        setSelectedUserIds([]);
        fetchUsers();
      } else {
        alert(data?.message || 'Bulk delete failed.');
      }
    } catch (err) {
      alert('Error in bulk delete: ' + err.message);
    }
  };

  // CSV Import Helpers
  const handleCsvUserUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length <= 1) return;

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const results = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        if (values.length === 0) continue;

        const obj = {};
        headers.forEach((header, idx) => {
          obj[header] = values[idx] || '';
        });

        if (obj.email) {
          results.push({
            name: obj.name || 'Student Account',
            email: obj.email,
            password: obj.password || 'student123',
            role: obj.role || 'student',
          });
        }
      }

      setParsedCsvUsers(results);
    };

    reader.readAsText(file);
  };

  const handleBulkUserSubmit = async () => {
    if (parsedCsvUsers.length === 0) return;
    try {
      const { ok, data } = await safeFetchJson('/api/admin/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ users: parsedCsvUsers }),
      });

      if (ok && data?.success) {
        alert(`Successfully imported ${data.count} student accounts!`);
        setShowBulkUserModal(false);
        setParsedCsvUsers([]);
        fetchUsers();
      } else {
        alert(data?.message || 'Error processing bulk user import');
      }
    } catch (err) {
      alert('Bulk import failed: ' + err.message);
    }
  };

  const downloadSampleStudentCsv = () => {
    const csvContent = 
`name,email,password,role
"Alex Johnson",alex.johnson@student.edu,student123,student
"Sophia Martinez",sophia.martinez@student.edu,student123,student
"Ethan Wright",ethan.wright@student.edu,student123,student`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_students_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- TEACHER APPROVAL HANDLERS ---
  const handleApproveTeacher = async (teacherId) => {
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/teacher-approvals/${teacherId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (ok && data?.success) {
        alert(data.message);
        fetchTeacherApprovals();
      } else {
        alert(data?.message || 'Approval failed');
      }
    } catch (err) {
      alert('Error approving teacher: ' + err.message);
    }
  };

  const handleRejectTeacher = async () => {
    if (!rejectModalTarget) return;
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/teacher-approvals/${rejectModalTarget._id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (ok && data?.success) {
        alert(data.message);
        setRejectModalTarget(null);
        setRejectReason('');
        fetchTeacherApprovals();
      } else {
        alert(data?.message || 'Rejection failed');
      }
    } catch (err) {
      alert('Error rejecting teacher: ' + err.message);
    }
  };

  // --- COURSE & EXAM MODERATION HANDLERS ---
  const handleToggleFlagCourse = async (courseId, currentFlag) => {
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/courses/${courseId}/flag`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isUnderReview: !currentFlag }),
      });

      if (ok && data?.success) {
        setAdminCourses(prev => prev.map(c => c._id === courseId ? { ...c, isUnderReview: !currentFlag } : c));
      } else {
        alert(data?.message || 'Failed to update course status');
      }
    } catch (err) {
      alert('Error flagging course: ' + err.message);
    }
  };

  const handleDeleteAdminCourse = async (course, force = false) => {
    try {
      const endpoint = `/api/admin/courses/${course._id}${force ? '?force=true' : ''}`;
      const { ok, data } = await safeFetchJson(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (ok && data?.success) {
        alert(data.message);
        setCourseDeleteTarget(null);
        setCourseDeleteWarning(null);
        fetchAdminCourses();
      } else if (data?.requiresConfirmation) {
        setCourseDeleteWarning(data);
      } else {
        alert(data?.message || 'Failed to delete course');
      }
    } catch (err) {
      alert('Error deleting course: ' + err.message);
    }
  };

  const handleCopyCourseCode = (code, courseId) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCourseId(courseId);
    setTimeout(() => {
      setCopiedCourseId(null);
    }, 2000);
  };

  const getFilteredAndSortedCourses = () => {
    let filtered = [...adminCourses];

    if (courseSearch.trim()) {
      const sLower = courseSearch.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(sLower) ||
        c.enrollmentCode?.toLowerCase().includes(sLower) ||
        c.teacher?.name?.toLowerCase().includes(sLower) ||
        c.teacher?.email?.toLowerCase().includes(sLower)
      );
    }

    if (courseSort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (courseSort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (courseSort === 'students-high') {
      filtered.sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0));
    } else if (courseSort === 'students-low') {
      filtered.sort((a, b) => (a.studentCount || 0) - (b.studentCount || 0));
    } else if (courseSort === 'title-asc') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return filtered;
  };

  const chartData = overviewData?.chartData || [];
  const recentActivity = overviewData?.recentActivity || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Header Banner */}
      <div className="glass-card p-6 sm:p-8 border border-amber-500/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
        
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            System Administrator Control Plane
          </div>
          <h1 className="text-3xl font-extrabold text-[#f4f4f8]">
            Root Admin Dashboard - {currentUser?.name || 'Administrator'}
          </h1>
          <p className="text-[#a5a3c9] text-sm mt-1">
            Platform oversight, candidate statistics, teacher approvals, course moderation, and proctoring audit.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold shadow-sm">
          <Lock className="w-4 h-4 text-amber-400" />
          SUPERUSER ACCESS ENABLED
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="glass-card p-2 border border-amber-500/15 flex items-center overflow-x-auto space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-indigo-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-[#a5a3c9] hover:text-white hover:bg-indigo-900/40'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Executive Overview
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-amber-500 text-indigo-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-[#a5a3c9] hover:text-white hover:bg-indigo-900/40'
          }`}
        >
          <Users className="w-4 h-4" />
          User Management
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'approvals'
              ? 'bg-amber-500 text-indigo-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-[#a5a3c9] hover:text-white hover:bg-indigo-900/40'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Faculty Approvals
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'courses'
              ? 'bg-amber-500 text-indigo-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-[#a5a3c9] hover:text-white hover:bg-indigo-900/40'
          }`}
        >
          <Layers className="w-4 h-4" />
          Course Moderation
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-amber-500 text-indigo-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-[#a5a3c9] hover:text-white hover:bg-indigo-900/40'
          }`}
        >
          <Flag className="w-4 h-4" />
          Question Reports
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'broadcast'
              ? 'bg-amber-500 text-indigo-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-[#a5a3c9] hover:text-white hover:bg-indigo-900/40'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Broadcast
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-amber-500 text-indigo-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-[#a5a3c9] hover:text-white hover:bg-indigo-900/40'
          }`}
        >
          <Server className="w-4 h-4" />
          System Logs & Audit
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-amber-500 text-indigo-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-[#a5a3c9] hover:text-white hover:bg-indigo-900/40'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Advanced Analytics
        </button>
      </div>

      {/* ==================== TAB 1: EXECUTIVE OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Executive Real DB Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="glass-card p-5 border border-amber-500/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-[#a5a3c9]">Students</span>
                <Users className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {statsLoading ? '...' : <AnimatedCounter value={overviewData?.totalStudents || 0} />}
              </div>
              <span className="text-[10px] text-[#a5a3c9] mt-1 block">Registered Candidates</span>
            </div>

            <div className="glass-card p-5 border border-amber-500/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-[#a5a3c9]">Teachers</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400">
                {statsLoading ? '...' : <AnimatedCounter value={overviewData?.totalTeachers || 0} />}
              </div>
              <span className="text-[10px] text-[#a5a3c9] mt-1 block">Faculty Educators</span>
            </div>

            <div className="glass-card p-5 border border-amber-500/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-[#a5a3c9]">Courses</span>
                <Layers className="w-4 h-4 text-teal-300" />
              </div>
              <div className="text-2xl font-extrabold text-teal-300">
                {statsLoading ? '...' : <AnimatedCounter value={overviewData?.totalCourses || 0} />}
              </div>
              <span className="text-[10px] text-[#a5a3c9] mt-1 block">Subject Groups</span>
            </div>

            <div className="glass-card p-5 border border-amber-500/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-[#a5a3c9]">Exams</span>
                <BookOpen className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400">
                {statsLoading ? '...' : <AnimatedCounter value={overviewData?.totalExams || 0} />}
              </div>
              <span className="text-[10px] text-[#a5a3c9] mt-1 block">Published Tests</span>
            </div>

            <div className="glass-card p-5 border border-amber-500/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-[#a5a3c9]">Submissions</span>
                <BarChart2 className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-extrabold text-teal-400">
                {statsLoading ? '...' : <AnimatedCounter value={overviewData?.totalAttempts || 0} />}
              </div>
              <span className="text-[10px] text-[#a5a3c9] mt-1 block">Completed Attempts</span>
            </div>
          </div>

          {/* Recharts Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Chart 1: Pass vs Fail Distribution */}
            <div className="glass-card p-6 border border-amber-500/15 space-y-4">
              <div className="border-b border-indigo-900/40 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-teal-400" />
                  Pass vs Fail Distribution per Exam
                </h3>
                <p className="text-xs text-[#a5a3c9] mt-0.5">Candidate pass rate breakdown across examinations</p>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#25235c" />
                    <XAxis dataKey="name" stroke="#a5a3c9" fontSize={11} />
                    <YAxis stroke="#a5a3c9" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#171545', borderColor: 'rgba(245,166,35,0.2)', borderRadius: '12px', fontSize: '12px', color: '#f4f4f8' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="pass" name="Passed" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fail" name="Failed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Average Score per Exam */}
            <div className="glass-card p-6 border border-amber-500/15 space-y-4">
              <div className="border-b border-indigo-900/40 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-400" />
                  Average Score Achieved per Exam
                </h3>
                <p className="text-xs text-[#a5a3c9] mt-0.5">Mean performance score benchmark across exams</p>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#25235c" />
                    <XAxis dataKey="name" stroke="#a5a3c9" fontSize={11} />
                    <YAxis stroke="#a5a3c9" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#171545', borderColor: 'rgba(245,166,35,0.2)', borderRadius: '12px', fontSize: '12px', color: '#f4f4f8' }} 
                    />
                    <Bar dataKey="avgScore" name="Avg Score (Pts)" fill="#f5a623" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Platform Health, Resource Usage & Question Quality Audit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Platform Usage & Resource Monitoring Widget */}
            <div className="glass-card p-6 border border-amber-500/15 space-y-4">
              <div className="border-b border-indigo-900/40 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-amber-400" />
                    Platform Resource & Usage Monitoring
                  </h3>
                  <p className="text-xs text-[#a5a3c9] mt-0.5">Database storage, AI PDF parsing, and email dispatch metrics</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 uppercase">
                  Healthy
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#a5a3c9]">
                    <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                    <span>MongoDB DB</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white">
                    {platformUsage?.mongoDbEstimate?.sizeMb || '0.5'} MB
                  </div>
                  <div className="text-[10px] text-[#a5a3c9]">
                    {platformUsage?.mongoDbEstimate?.totalDocs || 0} Total Docs
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#a5a3c9]">
                    <Activity className="w-3.5 h-3.5 text-teal-400" />
                    <span>AI PDF Calls</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-teal-300">
                    {platformUsage?.pdfParseCount || 0}
                  </div>
                  <div className="text-[10px] text-[#a5a3c9]">
                    Claude Extract Calls
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#a5a3c9]">
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>Emails Sent</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-amber-400">
                    {platformUsage?.emailSentCount || 0}
                  </div>
                  <div className="text-[10px] text-[#a5a3c9]">
                    Resend Dispatched
                  </div>
                </div>
              </div>
            </div>

            {/* Question Quality & Health Audit Widget */}
            <div className="glass-card p-6 border border-amber-500/15 space-y-4">
              <div className="border-b border-indigo-900/40 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-400" />
                    Question Bank Integrity & Quality Audit
                  </h3>
                  <p className="text-xs text-[#a5a3c9] mt-0.5">Detect missing answer keys and orphaned question items</p>
                </div>
                <Link
                  to="/teacher/questions"
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  Manage Bank <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#a5a3c9]">
                    <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                    <span>Total Bank</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white">
                    {qualityAuditData?.totalQuestions || 0}
                  </div>
                  <div className="text-[10px] text-[#a5a3c9]">
                    Questions Stored
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#a5a3c9]">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Missing Key</span>
                  </div>
                  <div className={`text-lg font-mono font-bold ${qualityAuditData?.missingAnswerCount > 0 ? 'text-rose-400' : 'text-teal-400'}`}>
                    {qualityAuditData?.missingAnswerCount || 0}
                  </div>
                  <div className="text-[10px] text-[#a5a3c9]">
                    Action Required
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#a5a3c9]">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unused Items</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-amber-400">
                    {qualityAuditData?.unusedCount || 0}
                  </div>
                  <div className="text-[10px] text-[#a5a3c9]">
                    Not in Exams
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Platform Recent Activity Feed */}
          <div className="glass-card p-6 border border-amber-500/15 space-y-4">
            <div className="border-b border-indigo-900/40 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  Platform-Wide Recent Activity Feed
                </h3>
                <p className="text-xs text-[#a5a3c9] mt-0.5">Real-time log of registrations, course creations, and exam submissions</p>
              </div>
              <span className="text-xs font-mono text-[#a5a3c9]">{recentActivity.length} Events</span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#a5a3c9]">No activity logged yet.</div>
            ) : (
              <div className="divide-y divide-indigo-900/40">
                {recentActivity.map((act, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4 hover:bg-indigo-900/30 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${
                        act.type === 'user_registration'
                          ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                          : act.type === 'course_created'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {act.type === 'user_registration' && <Users className="w-4 h-4" />}
                        {act.type === 'course_created' && <Layers className="w-4 h-4" />}
                        {act.type === 'exam_submission' && <Award className="w-4 h-4" />}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white">{act.title}</h4>
                        <span className="text-[11px] text-[#a5a3c9]">{act.subtext}</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-[#a5a3c9]">
                      {new Date(act.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==================== TAB 2: USER ACCOUNT MANAGEMENT ==================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          
          {/* Action & Filter Bar */}
          <div className="glass-card p-4 border border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#a5a3c9] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs w-64 focus:border-amber-400 focus:outline-none placeholder:text-[#a5a3c9]"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs font-medium cursor-pointer"
              >
                <option value="All">Role: All</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {selectedUserIds.length > 0 && (
                <div className="flex items-center gap-2 mr-2">
                  <button
                    onClick={handleBulkBlock}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Bulk Block ({selectedUserIds.length})
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-2 rounded-xl bg-rose-600/80 text-white hover:bg-rose-600 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    Bulk Delete ({selectedUserIds.length})
                  </button>
                </div>
              )}

              <button
                onClick={() => handleExportCsv('users')}
                className="px-3.5 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 hover:bg-teal-500 hover:text-indigo-950 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Users CSV
              </button>

              <button
                onClick={downloadSampleStudentCsv}
                className="px-3.5 py-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-slate-200 hover:bg-indigo-900/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Sample CSV
              </button>

              <button
                onClick={() => setShowBulkUserModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-indigo-950 font-bold hover:bg-amber-400 text-xs shadow-md shadow-amber-500/20 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Bulk Import Students
              </button>
            </div>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <BrandedLoader message="Loading user accounts..." />
          ) : (
            <div className="glass-card rounded-2xl border border-amber-500/15 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-indigo-950/90 text-[#a5a3c9] uppercase text-[10px] font-mono border-b border-indigo-900/60">
                    <tr>
                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          onChange={handleSelectAllUsers}
                          checked={users.length > 0 && selectedUserIds.length === users.length}
                          className="rounded border-indigo-700 bg-indigo-950 text-amber-400 focus:ring-amber-400 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">User Name</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Approval Status</th>
                      <th className="p-4">Account Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-900/40">
                    {users.map((u) => {
                      const isAdminRow = u.role === 'admin';
                      return (
                        <tr key={u._id} className="hover:bg-indigo-900/30 transition-colors">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              disabled={isAdminRow}
                              checked={selectedUserIds.includes(u._id)}
                              onChange={() => handleToggleSelectUser(u._id)}
                              className="rounded border-indigo-700 bg-indigo-950 text-amber-400 focus:ring-amber-400 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="p-4 font-bold text-white">{u.name}</td>
                          <td className="p-4 text-[#a5a3c9] font-mono">{u.email}</td>
                          <td className="p-4">
                            {isAdminRow ? (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 uppercase">
                                Admin
                              </span>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleChangeRole(u._id, e.target.value)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-800 text-xs font-semibold capitalize cursor-pointer text-white focus:border-amber-400"
                              >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                          </td>
                          <td className="p-4">
                            {u.role === 'teacher' ? (
                              <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                u.teacherApprovalStatus === 'approved'
                                  ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                                  : u.teacherApprovalStatus === 'rejected'
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {u.teacherApprovalStatus || 'approved'}
                              </span>
                            ) : (
                              <span className="text-[#a5a3c9] text-[11px]">N/A</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              u.isBlocked 
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                            }`}>
                              {u.isBlocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {isAdminRow ? (
                              <span className="text-[#a5a3c9] text-xs font-medium italic">— Protected</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleBlockUser(u._id, u.isBlocked)}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    u.isBlocked
                                      ? 'bg-teal-500/10 text-teal-300 hover:bg-teal-500 hover:text-indigo-950 border border-teal-500/20'
                                      : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-indigo-950 border border-amber-500/20'
                                  }`}
                                >
                                  {u.isBlocked ? 'Unblock' : 'Block'}
                                </button>

                                <button
                                  onClick={() => handleForceLogoutUser(u._id, u.name)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-indigo-950 text-xs font-semibold transition-all cursor-pointer"
                                  title="Force Logout (Revoke Tokens)"
                                >
                                  <LogOut className="w-3.5 h-3.5 inline" />
                                </button>

                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                                  title="Delete User Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5 inline" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ==================== TAB 3: TEACHER APPROVAL WORKFLOW ==================== */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <div className="glass-card p-4 border border-amber-500/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#f4f4f8]">Approval Status Filter:</span>
              <select
                value={approvalStatusFilter}
                onChange={(e) => setApprovalStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs font-semibold cursor-pointer"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="All">All Teachers</option>
              </select>
            </div>

            <span className="text-xs font-mono text-[#a5a3c9]">{teachers.length} Faculty Record(s)</span>
          </div>

          {teachersLoading ? (
            <BrandedLoader message="Loading teacher approvals..." />
          ) : teachers.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#a5a3c9] glass-card border border-amber-500/15">
              No faculty applications found matching status filter "{approvalStatusFilter}".
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-amber-500/15 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-indigo-950/90 text-[#a5a3c9] uppercase text-[10px] font-mono border-b border-indigo-900/60">
                  <tr>
                    <th className="p-4">Teacher Name</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4">Registered Date</th>
                    <th className="p-4">Approval Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-900/40">
                  {teachers.map((t) => (
                    <tr key={t._id} className="hover:bg-indigo-900/30 transition-colors">
                      <td className="p-4 font-bold text-white">{t.name}</td>
                      <td className="p-4 text-[#a5a3c9] font-mono">{t.email}</td>
                      <td className="p-4 text-[#a5a3c9]">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          t.teacherApprovalStatus === 'approved'
                            ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                            : t.teacherApprovalStatus === 'rejected'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {t.teacherApprovalStatus || 'pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {t.teacherApprovalStatus !== 'approved' && (
                          <button
                            onClick={() => handleApproveTeacher(t._id)}
                            className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-indigo-950 font-bold text-xs shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}

                        {t.teacherApprovalStatus !== 'rejected' && (
                          <button
                            onClick={() => setRejectModalTarget(t)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: ALL COURSES & ENROLLMENT CODES ==================== */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          
          {/* Controls & Filter Bar */}
          <div className="glass-card p-4 border border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#a5a3c9] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search course or teacher..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs w-64 focus:border-amber-400 focus:outline-none placeholder:text-[#a5a3c9]"
                />
              </div>

              {/* Sort By Dropdown */}
              <select
                value={courseSort}
                onChange={(e) => setCourseSort(e.target.value)}
                className="px-3 py-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs font-semibold cursor-pointer focus:border-amber-400 focus:outline-none"
              >
                <option value="newest">Sort: Newest Created</option>
                <option value="oldest">Sort: Oldest Created</option>
                <option value="students-high">Sort: Most Students</option>
                <option value="students-low">Sort: Least Students</option>
                <option value="title-asc">Sort: Course Title (A-Z)</option>
              </select>

              {/* View Mode Switcher */}
              <div className="flex items-center rounded-xl bg-indigo-950/80 border border-indigo-800/60 p-1">
                <button
                  onClick={() => setCourseViewMode('table')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    courseViewMode === 'table'
                      ? 'bg-amber-500 text-indigo-950 font-bold shadow-sm'
                      : 'text-[#a5a3c9] hover:text-white'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setCourseViewMode('cards')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    courseViewMode === 'cards'
                      ? 'bg-amber-500 text-indigo-950 font-bold shadow-sm'
                      : 'text-[#a5a3c9] hover:text-white'
                  }`}
                >
                  Cards View
                </button>
              </div>
              {/* Export Courses CSV */}
              <button
                onClick={() => handleExportCsv('courses')}
                className="px-3.5 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 hover:bg-teal-500 hover:text-indigo-950 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Courses CSV
              </button>
            </div>

            <span className="text-xs font-mono text-[#a5a3c9]">
              Showing {getFilteredAndSortedCourses().length} of {adminCourses.length} Course(s)
            </span>
          </div>

          {/* Courses Table / Cards Container */}
          {coursesLoading ? (
            <BrandedLoader message="Loading platform courses & enrollment codes..." />
          ) : getFilteredAndSortedCourses().length === 0 ? (
            <div className="py-12 text-center text-xs text-[#a5a3c9] glass-card border border-amber-500/15">
              {courseSearch ? `No courses match search "${courseSearch}".` : 'No courses created on platform yet.'}
            </div>
          ) : courseViewMode === 'table' ? (
            /* CONSOLIDATED TABLE VIEW */
            <div className="glass-card rounded-2xl border border-amber-500/15 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-indigo-950/90 text-[#a5a3c9] uppercase text-[10px] font-mono border-b border-indigo-900/60">
                    <tr>
                      <th className="p-4">Course Name</th>
                      <th className="p-4">Teacher</th>
                      <th className="p-4">Enrollment Code</th>
                      <th className="p-4">Students Enrolled</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-900/40">
                    {getFilteredAndSortedCourses().map((c) => {
                      const isCopied = copiedCourseId === c._id;
                      return (
                        <tr key={c._id} className="hover:bg-indigo-900/30 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{c.title}</div>
                            {c.description && (
                              <p className="text-[11px] text-[#a5a3c9] line-clamp-1 max-w-xs">{c.description}</p>
                            )}
                            {c.isUnderReview && (
                              <span className="mt-1 inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Under Review
                              </span>
                            )}
                          </td>

                          <td className="p-4">
                            <div className="font-semibold text-white">{c.teacher?.name || 'Faculty User'}</div>
                            <div className="text-[11px] font-mono text-[#a5a3c9]">{c.teacher?.email || 'N/A'}</div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs tracking-wider">
                                {c.enrollmentCode}
                              </span>

                              <button
                                onClick={() => handleCopyCourseCode(c.enrollmentCode, c._id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                                  isCopied
                                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                    : 'bg-indigo-900/40 text-[#a5a3c9] border-indigo-700/50 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/30'
                                }`}
                                title="Copy Enrollment Code"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-teal-400" />
                                    <span className="text-[10px]">Code copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Code</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-800 text-teal-300 font-bold text-xs">
                              {c.studentCount} Student(s)
                            </span>
                            <span className="ml-2 text-[11px] text-[#a5a3c9]">
                              ({c.examCount} exam{c.examCount === 1 ? '' : 's'})
                            </span>
                          </td>

                          <td className="p-4 font-mono text-[#a5a3c9]">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>

                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleToggleFlagCourse(c._id, c.isUnderReview)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                c.isUnderReview
                                  ? 'bg-teal-500/10 text-teal-300 border-teal-500/20 hover:bg-teal-500 hover:text-indigo-950'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500 hover:text-indigo-950'
                              }`}
                            >
                              <Flag className="w-3.5 h-3.5 inline mr-1" />
                              {c.isUnderReview ? 'Clear Flag' : 'Flag'}
                            </button>

                            <button
                              onClick={() => handleDeleteAdminCourse(c)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredAndSortedCourses().map((c) => {
                const isCopied = copiedCourseId === c._id;
                return (
                  <div key={c._id} className="glass-card p-5 border border-amber-500/15 rounded-2xl space-y-4 relative flex flex-col justify-between hover:border-amber-500/30 transition-colors">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="text-base font-bold text-white">{c.title}</h4>
                          <span className="text-xs text-[#a5a3c9] block mt-0.5">
                            Instructor: <strong className="text-white">{c.teacher?.name || 'Faculty User'}</strong> ({c.teacher?.email})
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border shrink-0 ${
                          c.isUnderReview
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                        }`}>
                          {c.isUnderReview ? 'Under Review' : 'Active'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-between mt-3">
                        <span className="text-xs text-[#a5a3c9]">Enrollment Code:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">
                            {c.enrollmentCode}
                          </span>
                          <button
                            onClick={() => handleCopyCourseCode(c.enrollmentCode, c._id)}
                            className="p-1.5 rounded-lg bg-indigo-900/50 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1"
                            title="Copy Enrollment Code"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-[#a5a3c9]">
                        <span>{c.studentCount} Student(s) Enrolled</span>
                        <span className="font-mono">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-indigo-900/40 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleFlagCourse(c._id, c.isUnderReview)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          c.isUnderReview
                            ? 'bg-teal-500/10 text-teal-300 border-teal-500/20 hover:bg-teal-500 hover:text-indigo-950'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500 hover:text-indigo-950'
                        }`}
                      >
                        <Flag className="w-3.5 h-3.5 inline mr-1" />
                        {c.isUnderReview ? 'Clear Flag' : 'Flag Under Review'}
                      </button>

                      <button
                        onClick={() => handleDeleteAdminCourse(c)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 5: QUESTION MODERATION REPORTS ==================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="glass-card p-4 border border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#f4f4f8]">Report Status Filter:</span>
              <select
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs font-semibold cursor-pointer focus:border-amber-400 focus:outline-none"
              >
                <option value="pending">Pending Review</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
                <option value="all">All Statuses</option>
              </select>
            </div>

            <span className="text-xs font-mono text-[#a5a3c9]">
              {questionReports.length} Question Report(s)
            </span>
          </div>

          {reportsLoading ? (
            <BrandedLoader message="Loading question moderation reports..." />
          ) : questionReports.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#a5a3c9] glass-card border border-amber-500/15">
              No question reports found matching status filter "{reportStatusFilter}".
            </div>
          ) : (
            <div className="space-y-4">
              {questionReports.map((r) => (
                <div key={r._id} className="glass-card p-5 border border-amber-500/15 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-900/40 pb-3">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white uppercase font-mono">
                        Reason: {r.reason}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                        r.status === 'resolved'
                          ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                          : r.status === 'dismissed'
                          ? 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {r.status}
                      </span>
                      <span className="text-[11px] font-mono text-[#a5a3c9]">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/40 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-[#a5a3c9]">Question Snippet</span>
                      <p className="text-white font-medium line-clamp-3">
                        {r.question?.text || 'Question Text Unavailable'}
                      </p>
                      {r.question?.subject?.name && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-1">
                          {r.question.subject.name}
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-900/40 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-[#a5a3c9]">Reporter & Details</span>
                      <div className="text-white font-bold">{r.reportedBy?.name || 'Student Candidate'}</div>
                      <div className="text-[#a5a3c9] font-mono text-[11px]">{r.reportedBy?.email}</div>
                      {r.comment && (
                        <p className="text-amber-300 italic pt-1 text-[11px]">"{r.comment}"</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <Link
                      to="/teacher/questions"
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-950 border border-indigo-800 text-amber-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Jump to Question Bank
                    </Link>

                    <div className="flex items-center gap-2">
                      {r.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateReportStatus(r._id, 'resolved')}
                          className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-indigo-950 font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                        </button>
                      )}

                      {r.status !== 'dismissed' && (
                        <button
                          onClick={() => handleUpdateReportStatus(r._id, 'dismissed')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 6: BROADCAST ANNOUNCEMENTS ==================== */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dispatch Announcement Form */}
          <div className="lg:col-span-1 glass-card p-6 border border-amber-500/15 space-y-4">
            <div className="border-b border-indigo-900/40 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                Dispatch Email Broadcast
              </h3>
              <p className="text-xs text-[#a5a3c9] mt-0.5">Send batch platform notifications to students and educators</p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Target Audience</label>
                <select
                  value={broadcastAudience}
                  onChange={(e) => setBroadcastAudience(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-xs text-white focus:border-amber-400 focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="all">All Registered Users (Students & Faculty)</option>
                  <option value="student">Students Only</option>
                  <option value="teacher">Teachers / Faculty Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Announcement Message Body</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Type official system announcement or notification message..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-xs text-white focus:border-amber-400 focus:outline-none placeholder:text-[#a5a3c9]"
                />
              </div>

              <button
                type="submit"
                disabled={broadcastSending || !broadcastMessage.trim()}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {broadcastSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching Emails...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Dispatch Announcement
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Broadcast History List */}
          <div className="lg:col-span-2 glass-card p-6 border border-amber-500/15 space-y-4">
            <div className="border-b border-indigo-900/40 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-400" />
                  Sent Announcement History
                </h3>
                <p className="text-xs text-[#a5a3c9] mt-0.5">Audit log of previously dispatched broadcast notifications</p>
              </div>
              <span className="text-xs font-mono text-[#a5a3c9]">{broadcastHistory.length} Dispatched</span>
            </div>

            {broadcastLoading ? (
              <BrandedLoader message="Loading broadcast history..." />
            ) : broadcastHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#a5a3c9]">
                No broadcast announcements sent yet.
              </div>
            ) : (
              <div className="divide-y divide-indigo-900/40 max-h-[480px] overflow-y-auto pr-1">
                {broadcastHistory.map((b) => (
                  <div key={b._id} className="py-4 space-y-2 hover:bg-indigo-900/20 px-3 rounded-xl transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Audience: {b.audience}
                      </span>
                      <span className="text-xs font-mono text-[#a5a3c9]">
                        {new Date(b.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium whitespace-pre-wrap">{b.message}</p>

                    <div className="flex items-center justify-between text-[11px] text-[#a5a3c9] font-mono pt-1">
                      <span>Sent to {b.sentCount} Recipient(s)</span>
                      <span>By: {b.sentBy?.name || 'Admin'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 7: SYSTEM LOGS & PROCTORING AUDIT ==================== */}
      {activeTab === 'logs' && (
        <div className="space-y-8">
          
          {/* Section 1: System Authentication & Error Logs */}
          <div className="space-y-4">
            <div className="glass-card p-4 border border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Platform System & Authentication Audit Trail</h3>
                
                <select
                  value={logTypeFilter}
                  onChange={(e) => setLogTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs font-semibold cursor-pointer focus:border-amber-400 focus:outline-none"
                >
                  <option value="all">Log Type: All Events</option>
                  <option value="failed-login">Failed Login Attempts</option>
                  <option value="success-login">Successful Logins</option>
                </select>
              </div>

              <button
                onClick={fetchLogs}
                className="px-3 py-1.5 rounded-xl bg-indigo-950 border border-indigo-800 text-amber-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
              </button>
            </div>

            {logsLoading ? (
              <BrandedLoader message="Fetching system logs..." />
            ) : systemLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#a5a3c9] glass-card border border-amber-500/15">
                No system logs recorded matching filter "{logTypeFilter}".
              </div>
            ) : (
              <div className="glass-card rounded-2xl border border-amber-500/15 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="bg-indigo-950/90 text-[#a5a3c9] uppercase text-[10px] font-mono border-b border-indigo-900/60">
                      <tr>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Account Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">IP Address</th>
                        <th className="p-4">Details / Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-900/40">
                      {systemLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-indigo-900/30 transition-colors">
                          <td className="p-4 font-mono text-[#a5a3c9]">
                            {new Date(log.timestamp || log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-4 font-bold text-white">{log.email}</td>
                          <td className="p-4 font-mono text-[#a5a3c9] uppercase text-[11px]">
                            {log.role || '—'}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              log.success
                                ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                            }`}>
                              {log.success ? 'Success' : 'Failed'}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-[#a5a3c9]">
                            {log.ipAddress || '127.0.0.1'}
                          </td>
                          <td className="p-4 text-[#a5a3c9]">
                            {log.reason || (log.success ? 'Authenticated successfully' : 'Security event')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Exam Proctoring Audit */}
          <div className="space-y-4 pt-4 border-t border-indigo-900/60">
            <div className="glass-card p-4 border border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Live Exam Proctoring Incident Log</h3>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#a5a3c9] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student or exam title..."
                    value={proctorSearch}
                    onChange={(e) => setProctorSearch(e.target.value)}
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs w-56 focus:border-amber-400 focus:outline-none placeholder:text-[#a5a3c9]"
                  />
                </div>

                <select
                  value={proctorReasonFilter}
                  onChange={(e) => setProctorReasonFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-white text-xs font-semibold cursor-pointer"
                >
                  <option value="All">Reason: All Flagged</option>
                  <option value="tab_switch_exceeded">Tab Switch Limit Exceeded</option>
                  <option value="fullscreen_exit_exceeded">Fullscreen Exit Exceeded</option>
                  <option value="timer_expired">Timer Expired</option>
                </select>
              </div>

              <span className="text-xs font-mono text-[#a5a3c9]">{proctorAttempts.length} Flagged Incident(s)</span>
            </div>

            {proctorLoading ? (
              <BrandedLoader message="Loading security audit log..." />
            ) : proctorAttempts.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#a5a3c9] glass-card border border-amber-500/15">
                No security violations or auto-submitted attempts recorded.
              </div>
            ) : (
              <div className="glass-card rounded-2xl border border-amber-500/15 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-indigo-950/90 text-[#a5a3c9] uppercase text-[10px] font-mono border-b border-indigo-900/60">
                    <tr>
                      <th className="p-4">Candidate Student</th>
                      <th className="p-4">Exam Paper</th>
                      <th className="p-4">Tab Switches</th>
                      <th className="p-4">Fullscreen Exits</th>
                      <th className="p-4">Auto-Submitted</th>
                      <th className="p-4">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-900/40">
                    {proctorAttempts.map((a) => (
                      <tr key={a._id} className="hover:bg-indigo-900/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{a.student?.name || 'Candidate'}</div>
                          <span className="text-[11px] font-mono text-[#a5a3c9]">{a.student?.email}</span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{a.exam?.title || 'Exam'}</div>
                          <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">{a.exam?.code}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                            a.tabSwitchCount >= 2
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {a.tabSwitchCount || 0} Switch(es)
                          </span>
                        </td>
                        <td className="p-4 font-mono">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 border border-indigo-800 text-slate-200">
                            {a.fullscreenExitCount || 0} Exit(s)
                          </span>
                          <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-300">
                            {a.cameraViolationCount || 0} Cam
                          </span>
                        </td>
                        <td className="p-4">
                          {a.autoSubmitted ? (
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20 uppercase">
                              Yes ({
                                a.autoSubmitReason === 'camera_violation_limit_exceeded'
                                  ? 'Camera Violation'
                                  : a.autoSubmitReason === 'tab_switch_limit_exceeded'
                                  ? 'Tab Switch'
                                  : a.autoSubmitReason === 'fullscreen_exit_limit_exceeded'
                                  ? 'FS Exit'
                                  : 'Security Violation'
                              })
                            </span>
                          ) : (
                            <span className="text-[#a5a3c9] text-[11px]">No</span>
                          )}
                        </td>
                        <td className="p-4 text-[#a5a3c9] font-mono">
                          {new Date(a.updatedAt || a.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==================== TAB 8: ADVANCED ANALYTICS ==================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Header Action */}
          <div className="glass-card p-4 border border-amber-500/15 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                Platform Academic Performance Analytics
              </h3>
              <p className="text-xs text-[#a5a3c9] mt-0.5">Subject benchmarks, teacher leaderboards, and peak traffic hours</p>
            </div>

            <button
              onClick={() => handleExportCsv('results')}
              className="px-4 py-2 rounded-xl bg-amber-500 text-indigo-950 font-bold hover:bg-amber-400 text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Exam Results CSV
            </button>
          </div>

          {analyticsLoading ? (
            <BrandedLoader message="Calculating platform analytics..." />
          ) : (
            <>
              {/* Analytics Section 1: Subject Performance Bar Chart */}
              <div className="glass-card p-6 border border-amber-500/15 space-y-4">
                <div className="border-b border-indigo-900/40 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-teal-400" />
                    Mean Score Percentage Breakdown by Subject
                  </h4>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#25235c" />
                      <XAxis dataKey="subject" stroke="#a5a3c9" fontSize={11} />
                      <YAxis stroke="#a5a3c9" fontSize={11} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171545', borderColor: 'rgba(245,166,35,0.2)', borderRadius: '12px', fontSize: '12px', color: '#f4f4f8' }}
                      />
                      <Bar dataKey="avgScorePercentage" name="Avg Score (%)" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Analytics Section 2 & 3: Peak Usage Line Chart & Teacher Leaderboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Peak Usage Line Chart */}
                <div className="glass-card p-6 border border-amber-500/15 space-y-4">
                  <div className="border-b border-indigo-900/40 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Candidate Exam Submission Hours (Peak Activity)
                    </h4>
                  </div>

                  <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={peakUsageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#25235c" />
                        <XAxis dataKey="hour" stroke="#a5a3c9" fontSize={11} />
                        <YAxis stroke="#a5a3c9" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#171545', borderColor: 'rgba(245,166,35,0.2)', borderRadius: '12px', fontSize: '12px', color: '#f4f4f8' }}
                        />
                        <Line type="monotone" dataKey="submissions" name="Submissions" stroke="#f5a623" strokeWidth={3} dot={{ fill: '#f5a623', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Teacher Activity Leaderboard */}
                <div className="glass-card p-6 border border-amber-500/15 space-y-4">
                  <div className="border-b border-indigo-900/40 pb-3 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-teal-300" />
                      Faculty Educator Activity Leaderboard
                    </h4>
                    <span className="text-xs font-mono text-[#a5a3c9]">{teacherLeaderboard.length} Faculty</span>
                  </div>

                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs text-slate-200">
                      <thead className="bg-indigo-950/90 text-[#a5a3c9] uppercase text-[10px] font-mono border-b border-indigo-900/60">
                        <tr>
                          <th className="p-3">Faculty Name</th>
                          <th className="p-3">Courses</th>
                          <th className="p-3">Exams Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-900/40">
                        {teacherLeaderboard.map((t, idx) => (
                          <tr key={idx} className="hover:bg-indigo-900/30 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-white">{t.teacherName}</div>
                              <div className="text-[10px] font-mono text-[#a5a3c9]">{t.teacherEmail}</div>
                            </td>
                            <td className="p-3 font-mono font-bold text-amber-400">{t.courseCount}</td>
                            <td className="p-3 font-mono font-bold text-teal-300">{t.examCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}

      {/* --- MODAL: REJECT TEACHER --- */}
      {rejectModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#171545] max-w-md w-full p-6 space-y-4 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white">
            <button
              onClick={() => {
                setRejectModalTarget(null);
                setRejectReason('');
              }}
              className="absolute top-4 right-4 text-[#a5a3c9] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white">Reject Faculty Application</h3>
            <p className="text-xs text-[#a5a3c9]">
              Rejecting <strong>{rejectModalTarget.name}</strong> ({rejectModalTarget.email}). An email notification will be dispatched.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">Reason for Rejection (Optional)</label>
              <textarea
                rows={3}
                placeholder="Specify rejection reason or missing credentials..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectModalTarget(null);
                  setRejectReason('');
                }}
                className="w-1/2 py-2 rounded-xl bg-indigo-950 border border-indigo-800 text-[#a5a3c9] hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectTeacher}
                className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: USER DELETE WARNING / FORCE CONFIRMATION --- */}
      {deleteConfirmationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#171545] max-w-md w-full p-6 space-y-4 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Associated Data Confirmation Required</h3>
            </div>

            <p className="text-xs text-[#a5a3c9]">
              {deleteConfirmationData.message}
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1">
              <div>Courses: <strong>{deleteConfirmationData.courseCount}</strong></div>
              <div>Exams: <strong>{deleteConfirmationData.examCount}</strong></div>
              <div>Attempts: <strong>{deleteConfirmationData.attemptCount}</strong></div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmationData(null)}
                className="w-1/2 py-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-[#a5a3c9] hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(userDeleteModal, true)}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm"
              >
                Force Delete User & Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: COURSE DELETE WARNING / FORCE CONFIRMATION --- */}
      {courseDeleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#171545] max-w-md w-full p-6 space-y-4 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Course Deletion Warning</h3>
            </div>

            <p className="text-xs text-[#a5a3c9]">
              {courseDeleteWarning.message}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCourseDeleteWarning(null)}
                className="w-1/2 py-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-[#a5a3c9] hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAdminCourse(courseDeleteTarget, true)}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm"
              >
                Force Delete Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: BULK STUDENT CSV IMPORT --- */}
      {showBulkUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#171545] max-w-2xl w-full p-6 space-y-6 border border-amber-500/20 rounded-2xl shadow-2xl relative text-white">
            <button
              onClick={() => {
                setShowBulkUserModal(false);
                setParsedCsvUsers([]);
              }}
              className="absolute top-4 right-4 text-[#a5a3c9] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-indigo-900/40 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Bulk Import Student Accounts via CSV</h3>
            </div>

            <div className="border-2 border-dashed border-indigo-800/80 hover:border-amber-400/60 rounded-2xl p-6 text-center space-y-3 bg-indigo-950/40">
              <Upload className="w-8 h-8 text-amber-400 mx-auto" />
              <label className="cursor-pointer text-xs font-semibold text-amber-400 hover:underline block">
                Select Student CSV File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUserUpload}
                  className="hidden"
                />
              </label>
              {csvFileName && (
                <span className="text-xs font-mono text-[#a5a3c9] block">{csvFileName}</span>
              )}
            </div>

            {parsedCsvUsers.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-white">Parsed {parsedCsvUsers.length} Candidate Accounts:</span>
                <div className="max-h-40 overflow-y-auto p-3 rounded-xl bg-indigo-950 border border-indigo-800 text-xs font-mono space-y-1">
                  {parsedCsvUsers.map((u, i) => (
                    <div key={i} className="flex justify-between text-[#a5a3c9]">
                      <span>{u.name} ({u.email})</span>
                      <span className="text-amber-400 font-bold">{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkUserModal(false);
                  setParsedCsvUsers([]);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-[#a5a3c9] hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUserSubmit}
                disabled={parsedCsvUsers.length === 0}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 text-indigo-950 font-bold hover:bg-amber-400 text-xs disabled:opacity-50 shadow-sm"
              >
                Confirm Import ({parsedCsvUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
