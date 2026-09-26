const Course = require('../models/Course');
const Exam = require('../models/Exam');
const User = require('../models/User');
const { getDBStatus } = require('../config/db');

// In-memory mock store for fallback when MongoDB is disconnected
const MOCK_COURSES_STORE = [
  {
    _id: '650000000000000000000101',
    title: 'CS101 - DSA & Algorithms',
    description: 'Foundational Data Structures, Sorting, Searching, and Complexity Analysis.',
    teacher: '650000000000000000000002',
    teacherName: 'Sarah Teacher',
    enrollmentCode: 'CS101X9',
    students: ['650000000000000000000003'],
    createdAt: new Date().toISOString(),
  },
  {
    _id: '650000000000000000000102',
    title: 'WEB202 - Full Stack Web Dev',
    description: 'Modern MERN Stack Architecture, RESTful APIs, and React Components.',
    teacher: '650000000000000000000002',
    teacherName: 'Sarah Teacher',
    enrollmentCode: 'WEB202M7',
    students: ['650000000000000000000003'],
    createdAt: new Date().toISOString(),
  },
];

/**
 * Helper to generate a unique 7-8 char uppercase enrollment code
 */
const generateUniqueCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 20) {
    attempts++;
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `CS${randomPart}`;

    if (getDBStatus() === 'Connected') {
      const existing = await Course.findOne({ enrollmentCode: code });
      if (!existing) isUnique = true;
    } else {
      const existingMock = MOCK_COURSES_STORE.find(c => c.enrollmentCode === code);
      if (!existingMock) isUnique = true;
    }
  }

  return code;
};

/**
 * @desc    Create a new Course (Teacher/Admin)
 * @route   POST /api/courses
 * @access  Private (Teacher, Admin)
 */
const createCourse = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const teacherId = req.user ? (req.user._id || req.user.id) : null;

    if (req.user && req.user.role === 'teacher' && req.user.teacherApprovalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your teacher account is pending admin approval. You cannot create courses or exams until approved.',
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Course title is required.',
      });
    }

    const enrollmentCode = await generateUniqueCode();

    if (getDBStatus() === 'Connected') {
      const newCourse = await Course.create({
        title: title.trim(),
        description: description ? description.trim() : '',
        teacher: teacherId,
        enrollmentCode,
        students: [],
      });

      return res.status(201).json({
        success: true,
        message: 'Course created successfully!',
        data: newCourse,
      });
    }

    // Mock fallback
    const newMockCourse = {
      _id: `course-mock-${Date.now()}`,
      title: title.trim(),
      description: description ? description.trim() : '',
      teacher: teacherId,
      teacherName: req.user?.name || 'Teacher',
      enrollmentCode,
      students: [],
      createdAt: new Date().toISOString(),
    };

    MOCK_COURSES_STORE.push(newMockCourse);

    return res.status(201).json({
      success: true,
      message: 'Course created successfully! (Mock DB)',
      data: newMockCourse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get My Courses (Teacher: created courses; Student: enrolled courses)
 * @route   GET /api/courses/my-courses
 * @access  Private
 */
const getMyCourses = async (req, res, next) => {
  try {
    const userId = req.user ? (req.user._id || req.user.id) : null;
    const userRole = req.user ? req.user.role : 'teacher';

    if (getDBStatus() === 'Connected') {
      let courses = [];

      if (userRole === 'teacher' || userRole === 'admin') {
        courses = await Course.find({ teacher: userId })
          .populate('students', 'name email createdAt')
          .sort({ createdAt: -1 });
      } else {
        courses = await Course.find({ students: userId })
          .populate('teacher', 'name email')
          .sort({ createdAt: -1 });
      }

      // Attach exam counts for each course & strip enrollmentCode for students
      const coursesWithStats = await Promise.all(
        courses.map(async (c) => {
          const examCount = await Exam.countDocuments({ course: c._id });
          const obj = c.toObject();
          if (userRole === 'student') {
            delete obj.enrollmentCode;
          }
          obj.studentCount = c.students ? c.students.length : 0;
          obj.examCount = examCount;
          return obj;
        })
      );

      return res.status(200).json({
        success: true,
        count: coursesWithStats.length,
        data: coursesWithStats,
      });
    }

    // Mock fallback
    let filteredMock = [];
    if (userRole === 'teacher' || userRole === 'admin') {
      filteredMock = MOCK_COURSES_STORE.filter(c => String(c.teacher) === String(userId));
    } else {
      filteredMock = MOCK_COURSES_STORE.filter(c => c.students.some(sId => String(sId) === String(userId)));
    }

    const mockWithStats = filteredMock.map(c => {
      const copy = {
        ...c,
        studentCount: c.students.length,
        examCount: 2,
      };
      if (userRole === 'student') {
        delete copy.enrollmentCode;
      }
      return copy;
    });

    return res.status(200).json({
      success: true,
      count: mockWithStats.length,
      data: mockWithStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Student enroll in course by enrollment code
 * @route   POST /api/courses/enroll
 * @access  Private (Student, All)
 */
const enrollCourse = async (req, res, next) => {
  try {
    const { enrollmentCode } = req.body;
    const studentId = req.user ? (req.user._id || req.user.id) : null;
    const userRole = req.user ? req.user.role : 'student';

    if (!enrollmentCode || !enrollmentCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an enrollment code.',
      });
    }

    const cleanCode = enrollmentCode.trim().toUpperCase();

    if (getDBStatus() === 'Connected') {
      const course = await Course.findOne({ enrollmentCode: cleanCode });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course with code '${cleanCode}' does not exist. Please check the code and try again.`,
        });
      }

      // Check if already enrolled
      const alreadyEnrolled = course.students.some(id => String(id) === String(studentId));
      if (alreadyEnrolled) {
        return res.status(400).json({
          success: false,
          message: 'Already enrolled in this course.',
        });
      }

      course.students.push(studentId);
      await course.save();

      const courseObj = course.toObject();
      if (userRole === 'student') {
        delete courseObj.enrollmentCode;
      }

      return res.status(200).json({
        success: true,
        message: `Successfully enrolled in course "${course.title}"!`,
        data: courseObj,
      });
    }

    // Mock fallback
    const mockCourse = MOCK_COURSES_STORE.find(c => c.enrollmentCode === cleanCode);
    if (!mockCourse) {
      return res.status(404).json({
        success: false,
        message: `Course with code '${cleanCode}' does not exist (Mock DB).`,
      });
    }

    if (mockCourse.students.some(id => String(id) === String(studentId))) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course.',
      });
    }

    mockCourse.students.push(studentId);

    const mockObj = { ...mockCourse };
    if (userRole === 'student') {
      delete mockObj.enrollmentCode;
    }

    return res.status(200).json({
      success: true,
      message: `Successfully enrolled in course "${mockCourse.title}"! (Mock DB)`,
      data: mockObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of enrolled students for a course (Teacher)
 * @route   GET /api/courses/:id/students
 * @access  Private (Teacher, Admin)
 */
const getCourseStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? (req.user._id || req.user.id) : null;

    if (getDBStatus() === 'Connected') {
      const course = await Course.findById(id).populate('students', 'name email role createdAt');
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      if (String(course.teacher) !== String(userId) && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to view students for this course.' });
      }

      return res.status(200).json({
        success: true,
        count: course.students.length,
        courseTitle: course.title,
        enrollmentCode: course.enrollmentCode,
        data: course.students,
      });
    }

    // Mock fallback
    const mockCourse = MOCK_COURSES_STORE.find(c => String(c._id) === String(id));
    if (!mockCourse) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const currentStudentId = req.user ? (req.user._id || req.user.id) : 'student-1';
    return res.status(200).json({
      success: true,
      count: mockCourse.students.length,
      courseTitle: mockCourse.title,
      enrollmentCode: mockCourse.enrollmentCode,
      data: [
        { _id: currentStudentId, name: 'John Student', email: 'student@examportal.com', createdAt: new Date().toISOString() },
      ],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove student from course (Teacher)
 * @route   DELETE /api/courses/:id/students/:studentId
 * @access  Private (Teacher, Admin)
 */
const removeStudentFromCourse = async (req, res, next) => {
  try {
    const { id, studentId } = req.params;
    const userId = req.user ? (req.user._id || req.user.id) : null;

    if (getDBStatus() === 'Connected') {
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      if (String(course.teacher) !== String(userId) && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this course.' });
      }

      course.students = course.students.filter(sId => String(sId) !== String(studentId));
      await course.save();

      return res.status(200).json({
        success: true,
        message: 'Student removed from course successfully.',
        studentCount: course.students.length,
      });
    }

    // Mock fallback
    const mockCourse = MOCK_COURSES_STORE.find(c => String(c._id) === String(id));
    if (mockCourse) {
      mockCourse.students = mockCourse.students.filter(sId => String(sId) !== String(studentId));
    }

    return res.status(200).json({
      success: true,
      message: 'Student removed from course successfully. (Mock DB)',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update course details (Teacher)
 * @route   PUT /api/courses/:id
 * @access  Private (Teacher, Admin)
 */
const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user ? (req.user._id || req.user.id) : null;

    if (getDBStatus() === 'Connected') {
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      if (String(course.teacher) !== String(userId) && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to edit this course.' });
      }

      if (title) course.title = title.trim();
      if (description !== undefined) course.description = description.trim();
      await course.save();

      return res.status(200).json({
        success: true,
        message: 'Course updated successfully.',
        data: course,
      });
    }

    // Mock fallback
    const mockCourse = MOCK_COURSES_STORE.find(c => String(c._id) === String(id));
    if (mockCourse) {
      if (title) mockCourse.title = title.trim();
      if (description !== undefined) mockCourse.description = description.trim();
    }

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully. (Mock DB)',
      data: mockCourse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete course (Teacher)
 * @route   DELETE /api/courses/:id
 * @access  Private (Teacher, Admin)
 */
const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? (req.user._id || req.user.id) : null;

    if (getDBStatus() === 'Connected') {
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      if (String(course.teacher) !== String(userId) && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this course.' });
      }

      await Course.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: 'Course deleted successfully.',
      });
    }

    // Mock fallback
    const index = MOCK_COURSES_STORE.findIndex(c => String(c._id) === String(id));
    if (index !== -1) {
      MOCK_COURSES_STORE.splice(index, 1);
    }

    return res.status(200).json({
      success: true,
      message: 'Course deleted successfully. (Mock DB)',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCourse,
  getMyCourses,
  enrollCourse,
  getCourseStudents,
  removeStudentFromCourse,
  updateCourse,
  deleteCourse,
  MOCK_COURSES_STORE,
};
