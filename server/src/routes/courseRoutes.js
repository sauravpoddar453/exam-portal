const express = require('express');
const router = express.Router();
const {
  createCourse,
  getMyCourses,
  enrollCourse,
  getCourseStudents,
  removeStudentFromCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createCourse);
router.get('/my-courses', protect, getMyCourses);
router.post('/enroll', protect, enrollCourse);
router.get('/:id/students', protect, getCourseStudents);
router.delete('/:id/students/:studentId', protect, removeStudentFromCourse);
router.put('/:id', protect, updateCourse);
router.delete('/:id', protect, deleteCourse);

module.exports = router;
