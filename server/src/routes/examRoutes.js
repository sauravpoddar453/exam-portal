const express = require('express');
const router = express.Router();
const {
  getExams,
  getAvailableExamsForStudent,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
} = require('../controllers/examController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Student available exams route (Public or protected)
router.get('/available', getAvailableExamsForStudent);

// Staff management routes (Admin / Teacher only)
router.route('/')
  .get(protect, authorize('admin', 'teacher'), getExams)
  .post(protect, authorize('admin', 'teacher'), createExam);

router.route('/:id')
  .get(getExamById)
  .put(protect, authorize('admin', 'teacher'), updateExam)
  .delete(protect, authorize('admin', 'teacher'), deleteExam);

module.exports = router;
