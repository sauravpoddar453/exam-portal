const express = require('express');
const router = express.Router();
const {
  startOrResumeAttempt,
  autoSaveAnswers,
  logProctoringViolation,
  submitAttempt,
  getStudentAttempts,
  getAttemptResult,
  getPendingReviews,
  gradeEssayAnswer,
  downloadCertificatePDF,
} = require('../controllers/attemptController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/start/:examId', startOrResumeAttempt);
router.put('/:id/save', autoSaveAnswers);
router.post('/:id/proctor', logProctoringViolation);
router.post('/:id/submit', submitAttempt);
router.get('/my-attempts', getStudentAttempts);

// Results & Manual Grading Endpoints
router.get('/pending-reviews', authorize('admin', 'teacher'), getPendingReviews);
router.get('/:id/result', getAttemptResult);
router.get('/:id/certificate', downloadCertificatePDF);
router.post('/:id/grade-essay', authorize('admin', 'teacher'), gradeEssayAnswer);

module.exports = router;
