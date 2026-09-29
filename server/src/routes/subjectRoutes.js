const express = require('express');
const router = express.Router();
const {
  getSubjects,
  createSubject,
  deleteSubject,
} = require('../controllers/subjectController');
const { protect } = require('../middleware/authMiddleware');

const authMiddleware = protect;

router.get('/', authMiddleware, getSubjects);
router.post('/', authMiddleware, createSubject);
router.delete('/:id', authMiddleware, deleteSubject);

module.exports = router;
