const express = require('express');
const router = express.Router();
const {
  getSubjects,
  createSubject,
  deleteSubject,
} = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('teacher', 'admin'));

router.route('/')
  .get(getSubjects)
  .post(createSubject);

router.route('/:id')
  .delete(deleteSubject);

module.exports = router;
