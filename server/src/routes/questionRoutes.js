const express = require('express');
const router = express.Router();
const {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  importDocumentQuestions,
  downloadDocumentTemplate,
} = require('../controllers/questionController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadDocument } = require('../middleware/uploadMiddleware');

// Download template routes (public/protected)
router.get('/template', downloadDocumentTemplate);
router.get('/pdf-template', downloadDocumentTemplate);

// Protect all remaining question management routes
router.use(protect);
router.use(authorize('admin', 'teacher'));

router.route('/')
  .get(getQuestions)
  .post(createQuestion);

router.post('/bulk', bulkUploadQuestions);
router.post('/import-document', uploadDocument.single('file'), importDocumentQuestions);
router.post('/import-pdf', uploadDocument.single('file'), importDocumentQuestions);

router.route('/:id')
  .get(getQuestionById)
  .put(updateQuestion)
  .delete(deleteQuestion);

module.exports = router;
