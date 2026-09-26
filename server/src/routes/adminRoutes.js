const express = require('express');
const router = express.Router();
const {
  getAdminOverviewStats,
  getTeacherOverviewStats,
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
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// 1. Executive Overview Analytics (Admin only)
router.get('/overview', authorize('admin'), getAdminOverviewStats);

// Teacher Overview Stats & Activity (Admin and Teacher)
router.get('/teacher-overview', authorize('admin', 'teacher'), getTeacherOverviewStats);

// Per-exam analytics (Admin and Teacher)
router.get('/analytics/exam/:examId', authorize('admin', 'teacher'), getExamAnalytics);

// 2. User Management Module (Admin only)
router.get('/users', authorize('admin'), getAllUsers);
router.put('/users/:id/block', authorize('admin'), blockUser);
router.put('/users/:id/unblock', authorize('admin'), unblockUser);
router.put('/users/:id/status', authorize('admin'), updateUserStatus);
router.put('/users/:id/role', authorize('admin'), updateUserRole);
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

// 5. Security & Proctoring Audit (Admin only)
router.get('/proctor-audit', authorize('admin'), getProctorAudit);

module.exports = router;
