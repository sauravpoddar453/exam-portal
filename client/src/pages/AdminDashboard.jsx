import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';
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
  RefreshCw,
  Award
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
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

  // 5. Proctoring Security Audit State
  const [proctorAttempts, setProctorAttempts] = useState([]);
  const [proctorLoading, setProctorLoading] = useState(false);
  const [proctorSearch, setProctorSearch] = useState('');
  const [proctorReasonFilter, setProctorReasonFilter] = useState('All');

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

  // Tab change effect triggers
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'approvals') fetchTeacherApprovals();
    if (activeTab === 'courses') fetchAdminCourses();
    if (activeTab === 'proctoring') fetchProctorAudit();
  }, [activeTab, fetchUsers, fetchTeacherApprovals, fetchAdminCourses, fetchProctorAudit]);

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

  const chartData = overviewData?.chartData || [];
  const recentActivity = overviewData?.recentActivity || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Header Banner */}
      <div className="bg-white p-6 sm:p-8 border border-gray-200 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/5 blur-3xl rounded-full pointer-events-none" />
        
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold uppercase mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            System Administrator Control Plane
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Root Admin Dashboard - {currentUser?.name || 'Administrator'}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Platform oversight, candidate statistics, teacher approvals, course moderation, and proctoring audit.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono font-bold shadow-sm">
          <Lock className="w-4 h-4 text-red-600" />
          SUPERUSER ACCESS ENABLED
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white p-2 border border-gray-200 rounded-2xl shadow-sm flex items-center overflow-x-auto space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Executive Overview
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          User Management
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'approvals'
              ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Teacher Approvals
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'courses'
              ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Course & Exam Moderation
        </button>

        <button
          onClick={() => setActiveTab('proctoring')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'proctoring'
              ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          Proctoring Audit
        </button>
      </div>

      {/* ==================== TAB 1: EXECUTIVE OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Executive Real DB Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-gray-500">Students</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-gray-900">
                {statsLoading ? '...' : overviewData?.totalStudents || 0}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">Registered Candidates</span>
            </div>

            <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-gray-500">Teachers</span>
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-extrabold text-purple-700">
                {statsLoading ? '...' : overviewData?.totalTeachers || 0}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">Faculty Educators</span>
            </div>

            <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-gray-500">Courses</span>
                <Layers className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-extrabold text-amber-700">
                {statsLoading ? '...' : overviewData?.totalCourses || 0}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">Subject Groups</span>
            </div>

            <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-gray-500">Exams</span>
                <BookOpen className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-extrabold text-red-600">
                {statsLoading ? '...' : overviewData?.totalExams || 0}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">Published Tests</span>
            </div>

            <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-gray-500">Submissions</span>
                <BarChart2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-700">
                {statsLoading ? '...' : overviewData?.totalAttempts || 0}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">Completed Attempts</span>
            </div>
          </div>

          {/* Recharts Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Chart 1: Pass vs Fail Distribution */}
            <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-md space-y-4">
              <div className="border-b border-gray-200 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-600" />
                  Pass vs Fail Distribution per Exam
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Candidate pass rate breakdown across examinations</p>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="pass" name="Passed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fail" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Average Score per Exam */}
            <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-md space-y-4">
              <div className="border-b border-gray-200 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-red-600" />
                  Average Score Achieved per Exam
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Mean performance score benchmark across exams</p>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
                    />
                    <Bar dataKey="avgScore" name="Avg Score (Pts)" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Platform Recent Activity Feed */}
          <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-md space-y-4">
            <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-600" />
                  Platform-Wide Recent Activity Feed
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Real-time log of registrations, course creations, and exam submissions</p>
              </div>
              <span className="text-xs font-mono text-gray-500">{recentActivity.length} Events</span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">No activity logged yet.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentActivity.map((act, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4 hover:bg-gray-50/60 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${
                        act.type === 'user_registration'
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : act.type === 'course_created'
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}>
                        {act.type === 'user_registration' && <Users className="w-4 h-4" />}
                        {act.type === 'course_created' && <Layers className="w-4 h-4" />}
                        {act.type === 'exam_submission' && <Award className="w-4 h-4" />}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{act.title}</h4>
                        <span className="text-[11px] text-gray-500">{act.subtext}</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-gray-400">
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
          <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-xs w-64 focus:ring-1 focus:ring-red-600 focus:border-red-600"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-xs font-medium cursor-pointer"
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
                    className="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 text-xs font-semibold transition-all"
                  >
                    Bulk Block ({selectedUserIds.length})
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-semibold shadow-sm transition-all"
                  >
                    Bulk Delete ({selectedUserIds.length})
                  </button>
                </div>
              )}

              <button
                onClick={downloadSampleStudentCsv}
                className="px-3.5 py-2 rounded-xl bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-red-600" />
                Sample CSV
              </button>

              <button
                onClick={() => setShowBulkUserModal(true)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm shadow-red-600/20 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Bulk Import Students
              </button>
            </div>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="py-16 text-center text-xs text-gray-500">Loading user accounts...</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-mono border-b border-gray-200">
                    <tr>
                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          onChange={handleSelectAllUsers}
                          checked={users.length > 0 && selectedUserIds.length === users.length}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
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
                  <tbody className="divide-y divide-gray-200">
                    {users.map((u) => {
                      const isAdminRow = u.role === 'admin';
                      return (
                        <tr key={u._id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              disabled={isAdminRow}
                              checked={selectedUserIds.includes(u._id)}
                              onChange={() => handleToggleSelectUser(u._id)}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="p-4 font-bold text-gray-900">{u.name}</td>
                          <td className="p-4 text-gray-600 font-mono">{u.email}</td>
                          <td className="p-4">
                            {isAdminRow ? (
                              <span className="px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-300 text-xs font-bold text-gray-800 uppercase">
                                Admin
                              </span>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleChangeRole(u._id, e.target.value)}
                                className="px-2.5 py-1 rounded-lg bg-white border border-gray-300 text-xs font-semibold capitalize cursor-pointer text-gray-900 focus:ring-1 focus:ring-red-500"
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
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : u.teacherApprovalStatus === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {u.teacherApprovalStatus || 'approved'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">N/A</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              u.isBlocked 
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {u.isBlocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {isAdminRow ? (
                              <span className="text-gray-400 text-xs font-medium italic">— Protected</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleBlockUser(u._id, u.isBlocked)}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    u.isBlocked
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200'
                                  }`}
                                >
                                  {u.isBlocked ? 'Unblock' : 'Block'}
                                </button>

                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-all cursor-pointer"
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
          <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-700">Approval Status Filter:</span>
              <select
                value={approvalStatusFilter}
                onChange={(e) => setApprovalStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-300 text-xs font-semibold cursor-pointer"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="All">All Teachers</option>
              </select>
            </div>

            <span className="text-xs font-mono text-gray-500">{teachers.length} Faculty Record(s)</span>
          </div>

          {teachersLoading ? (
            <div className="py-16 text-center text-xs text-gray-500">Loading teacher approvals...</div>
          ) : teachers.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200">
              No faculty applications found matching status filter "{approvalStatusFilter}".
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-mono border-b border-gray-200">
                  <tr>
                    <th className="p-4">Teacher Name</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4">Registered Date</th>
                    <th className="p-4">Approval Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teachers.map((t) => (
                    <tr key={t._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4 font-bold text-gray-900">{t.name}</td>
                      <td className="p-4 text-gray-600 font-mono">{t.email}</td>
                      <td className="p-4 text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          t.teacherApprovalStatus === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : t.teacherApprovalStatus === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {t.teacherApprovalStatus || 'pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {t.teacherApprovalStatus !== 'approved' && (
                          <button
                            onClick={() => handleApproveTeacher(t._id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}

                        {t.teacherApprovalStatus !== 'rejected' && (
                          <button
                            onClick={() => setRejectModalTarget(t)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
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

      {/* ==================== TAB 4: COURSE & EXAM MODERATION ==================== */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-600" />
              Platform-Wide Courses & Examinations Moderation
            </h3>
            <span className="text-xs font-mono text-gray-500">{adminCourses.length} Course(s)</span>
          </div>

          {coursesLoading ? (
            <div className="py-16 text-center text-xs text-gray-500">Loading platform courses...</div>
          ) : adminCourses.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200">
              No courses created on platform yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminCourses.map((c) => (
                <div key={c._id} className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4 relative flex flex-col justify-between hover:border-red-300 transition-colors">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{c.title}</h4>
                        <span className="text-xs text-gray-500 block mt-0.5">Instructor: {c.teacher?.name || 'Faculty'} ({c.teacher?.email})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 border border-gray-200 text-gray-700">
                        {c.enrollmentCode}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                        c.isUnderReview
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {c.isUnderReview ? 'Under Review' : 'Active'}
                      </span>
                      <span className="text-xs text-gray-500">{c.studentCount} Students | {c.examCount} Exams</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleFlagCourse(c._id, c.isUnderReview)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        c.isUnderReview
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-600 hover:text-white'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5 inline mr-1" />
                      {c.isUnderReview ? 'Clear Review Flag' : 'Flag Under Review'}
                    </button>

                    <button
                      onClick={() => handleDeleteAdminCourse(c)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 5: PROCTORING SECURITY AUDIT ==================== */}
      {activeTab === 'proctoring' && (
        <div className="space-y-6">
          <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student or exam title..."
                  value={proctorSearch}
                  onChange={(e) => setProctorSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-xs w-64 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <select
                value={proctorReasonFilter}
                onChange={(e) => setProctorReasonFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-xs font-semibold cursor-pointer"
              >
                <option value="All">Reason: All Flagged</option>
                <option value="tab_switch_exceeded">Tab Switch Limit Exceeded</option>
                <option value="fullscreen_exit_exceeded">Fullscreen Exit Exceeded</option>
                <option value="timer_expired">Timer Expired</option>
              </select>
            </div>

            <span className="text-xs font-mono text-gray-500">{proctorAttempts.length} Flagged Incident(s)</span>
          </div>

          {proctorLoading ? (
            <div className="py-16 text-center text-xs text-gray-500">Loading security audit log...</div>
          ) : proctorAttempts.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200">
              No security violations or auto-submitted attempts recorded.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-mono border-b border-gray-200">
                  <tr>
                    <th className="p-4">Candidate Student</th>
                    <th className="p-4">Exam Paper</th>
                    <th className="p-4">Tab Switches</th>
                    <th className="p-4">Fullscreen Exits</th>
                    <th className="p-4">Auto-Submitted</th>
                    <th className="p-4">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {proctorAttempts.map((a) => (
                    <tr key={a._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{a.student?.name || 'Candidate'}</div>
                        <span className="text-[11px] font-mono text-gray-500">{a.student?.email}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{a.exam?.title || 'Exam'}</div>
                        <span className="text-[10px] font-mono text-red-600 font-bold uppercase">{a.exam?.code}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                          a.tabSwitchCount >= 2
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {a.tabSwitchCount || 0} Switch(es)
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 border border-gray-200 text-gray-700">
                          {a.fullscreenExitCount || 0} Exit(s)
                        </span>
                      </td>
                      <td className="p-4">
                        {a.autoSubmitted ? (
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                            Yes ({a.autoSubmitReason || 'Security Alert'})
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">No</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-500 font-mono">
                        {new Date(a.updatedAt || a.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL: REJECT TEACHER --- */}
      {rejectModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full p-6 space-y-4 border border-gray-200 rounded-2xl shadow-xl relative">
            <button
              onClick={() => {
                setRejectModalTarget(null);
                setRejectReason('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-gray-900">Reject Faculty Application</h3>
            <p className="text-xs text-gray-500">
              Rejecting <strong>{rejectModalTarget.name}</strong> ({rejectModalTarget.email}). An email notification will be dispatched.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Rejection (Optional)</label>
              <textarea
                rows={3}
                placeholder="Specify rejection reason or missing credentials..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectModalTarget(null);
                  setRejectReason('');
                }}
                className="w-1/2 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectTeacher}
                className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: USER DELETE WARNING / FORCE CONFIRMATION --- */}
      {deleteConfirmationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full p-6 space-y-4 border border-gray-200 rounded-2xl shadow-xl relative">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">Associated Data Confirmation Required</h3>
            </div>

            <p className="text-xs text-gray-700">
              {deleteConfirmationData.message}
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div>Courses: <strong>{deleteConfirmationData.courseCount}</strong></div>
              <div>Exams: <strong>{deleteConfirmationData.examCount}</strong></div>
              <div>Attempts: <strong>{deleteConfirmationData.attemptCount}</strong></div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmationData(null)}
                className="w-1/2 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(userDeleteModal, true)}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
              >
                Force Delete User & Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: COURSE DELETE WARNING / FORCE CONFIRMATION --- */}
      {courseDeleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full p-6 space-y-4 border border-gray-200 rounded-2xl shadow-xl relative">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">Course Deletion Warning</h3>
            </div>

            <p className="text-xs text-gray-700">
              {courseDeleteWarning.message}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCourseDeleteWarning(null)}
                className="w-1/2 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAdminCourse(courseDeleteTarget, true)}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
              >
                Force Delete Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: BULK STUDENT CSV IMPORT --- */}
      {showBulkUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white max-w-2xl w-full p-6 space-y-6 border border-gray-200 rounded-2xl shadow-xl relative">
            <button
              onClick={() => {
                setShowBulkUserModal(false);
                setParsedCsvUsers([]);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Bulk Import Student Accounts via CSV</h3>
            </div>

            <div className="border-2 border-dashed border-gray-300 hover:border-red-400 rounded-2xl p-6 text-center space-y-3 bg-gray-50">
              <Upload className="w-8 h-8 text-red-600 mx-auto" />
              <label className="cursor-pointer text-xs font-semibold text-red-600 hover:underline block">
                Select Student CSV File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUserUpload}
                  className="hidden"
                />
              </label>
              {csvFileName && (
                <span className="text-xs font-mono text-gray-600 block">{csvFileName}</span>
              )}
            </div>

            {parsedCsvUsers.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-900">Parsed {parsedCsvUsers.length} Candidate Accounts:</span>
                <div className="max-h-40 overflow-y-auto p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono space-y-1">
                  {parsedCsvUsers.map((u, i) => (
                    <div key={i} className="flex justify-between text-gray-700">
                      <span>{u.name} ({u.email})</span>
                      <span className="text-red-600 font-bold">{u.role}</span>
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
                className="w-1/2 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUserSubmit}
                disabled={parsedCsvUsers.length === 0}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50 shadow-sm"
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
