const express = require('express');
const router = express.Router();
const {
  getAdminOverviewStats,
  getTeacherOverviewStats,
  debugTeacherStats,
  getExamAnalytics,
  getAllUsers,
  blockUser,
  unblockUser,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  bulkBlockUsers,
  bulkDeleteUsers,
  bulkImportUsers,
  getTeacherApprovals,
  approveTeacher,
  rejectTeacher,
  getAdminCourses,
  getAdminCourseById,
  flagCourse,
  deleteAdminCourse,
  flagExam,
  getProctorAudit,
  getSystemLogs,
  getPlatformUsage,
  getQuestionReports,
  updateReportStatus,
  getQuestionQualityAudit,
  sendBroadcastAnnouncement,
  getBroadcastHistory,
  getSubjectPerformanceAnalytics,
  getTeacherLeaderboard,
  getPeakUsageAnalytics,
  forceLogoutUser,
  exportDataCsv,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// 1. Executive Overview Analytics (Admin only)
router.get('/overview', authorize('admin'), getAdminOverviewStats);
router.get('/platform-usage', authorize('admin'), getPlatformUsage);

// Teacher Overview Stats & Activity (Admin and Teacher)
router.get('/teacher-overview', authorize('admin', 'teacher'), getTeacherOverviewStats);
router.get('/debug-teacher-stats', authorize('admin', 'teacher'), debugTeacherStats);

// Per-exam & Advanced analytics (Admin and Teacher)
router.get('/analytics/exam/:examId', authorize('admin', 'teacher'), getExamAnalytics);
router.get('/analytics/subject-performance', authorize('admin'), getSubjectPerformanceAnalytics);
router.get('/analytics/teacher-leaderboard', authorize('admin'), getTeacherLeaderboard);
router.get('/analytics/peak-usage', authorize('admin'), getPeakUsageAnalytics);

// 2. User Management Module (Admin only)
router.get('/users', authorize('admin'), getAllUsers);
router.put('/users/:id/block', authorize('admin'), blockUser);
router.put('/users/:id/unblock', authorize('admin'), unblockUser);
router.put('/users/:id/status', authorize('admin'), updateUserStatus);
router.put('/users/:id/role', authorize('admin'), updateUserRole);
router.put('/users/:id/force-logout', authorize('admin'), forceLogoutUser);
router.delete('/users/:id', authorize('admin'), deleteUser);
router.put('/users/bulk-block', authorize('admin'), bulkBlockUsers);
router.delete('/users/bulk-delete', authorize('admin'), bulkDeleteUsers);
router.post('/users/bulk', authorize('admin'), bulkImportUsers);

// 3. Teacher Approval Workflow (Admin only)
router.get('/teacher-approvals', authorize('admin'), getTeacherApprovals);
router.put('/teacher-approvals/:id/approve', authorize('admin'), approveTeacher);
router.put('/teacher-approvals/:id/reject', authorize('admin'), rejectTeacher);

// 4. Course & Exam Moderation (Admin only)
router.get('/courses', authorize('admin'), getAdminCourses);
router.get('/courses/:id', authorize('admin'), getAdminCourseById);
router.put('/courses/:id/flag', authorize('admin'), flagCourse);
router.delete('/courses/:id', authorize('admin'), deleteAdminCourse);
router.put('/exams/:id/flag', authorize('admin'), flagExam);

// 5. Content Moderation & Question Reports (Admin only)
router.get('/reports', authorize('admin'), getQuestionReports);
router.put('/reports/:id/status', authorize('admin'), updateReportStatus);
router.get('/question-quality', authorize('admin'), getQuestionQualityAudit);

// 6. Broadcast Announcements (Admin only)
router.post('/broadcast', authorize('admin'), sendBroadcastAnnouncement);
router.get('/broadcasts', authorize('admin'), getBroadcastHistory);

// 7. System & Security Audit Logs (Admin only)
router.get('/proctor-audit', authorize('admin'), getProctorAudit);
router.get('/logs', authorize('admin'), getSystemLogs);

// 8. Data Export (CSV) (Admin only)
router.get('/export/:type', authorize('admin'), exportDataCsv);

module.exports = router;
