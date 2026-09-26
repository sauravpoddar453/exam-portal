const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Course = require('../models/Course');
const Attempt = require('../models/Attempt');
const { getDBStatus } = require('../config/db');

// In-memory mock database for fallback testing when MongoDB is disconnected
const MOCK_EXAMS_STORE = [
  {
    _id: '650000000000000000000201',
    title: 'Data Structures & Algorithms Basics',
    code: 'CS101',
    course: '650000000000000000000101',
    description: 'Assess foundational knowledge of Arrays, Linked Lists, Trees, and Sorting Algorithms.',
    category: 'Computer Science',
    durationMinutes: 60,
    startTime: null,
    endTime: null,
    totalMarks: 100,
    passingMarks: 40,
    attemptsAllowed: 1,
    shuffleQuestions: true,
    shuffleOptions: true,
    negativeMarking: true,
    questions: [
      { question: 'q-mock-1', marksOverride: null },
      { question: 'q-mock-2', marksOverride: null },
      { question: 'q-mock-4', marksOverride: null },
    ],
    isActive: true,
    createdBy: '650000000000000000000002',
    createdAt: new Date().toISOString(),
  },
  {
    _id: '650000000000000000000202',
    title: 'Full Stack MERN Web Development',
    code: 'WEB202',
    course: '650000000000000000000102',
    description: 'Comprehensive test covering React hooks, Node Express middleware, and MongoDB query design.',
    category: 'Web Development',
    durationMinutes: 90,
    startTime: new Date(Date.now() - 3600000).toISOString(), // Started 1h ago
    endTime: new Date(Date.now() + 86400000 * 7).toISOString(), // Ends in 7 days
    totalMarks: 150,
    passingMarks: 60,
    attemptsAllowed: 2,
    shuffleQuestions: false,
    shuffleOptions: true,
    negativeMarking: true,
    questions: [
      { question: 'q-mock-2', marksOverride: null },
      { question: 'q-mock-3', marksOverride: null },
      { question: 'q-mock-4', marksOverride: null },
    ],
    isActive: true,
    createdBy: '650000000000000000000002',
    createdAt: new Date().toISOString(),
  },
  {
    _id: '650000000000000000000203',
    title: 'Database Management Systems (DBMS)',
    code: 'DB301',
    course: '650000000000000000000101',
    description: 'Relational algebra, SQL joins, Normalization, ACID properties, and Indexing principles.',
    category: 'Database Systems',
    durationMinutes: 45,
    startTime: null,
    endTime: null,
    totalMarks: 50,
    passingMarks: 20,
    attemptsAllowed: 1,
    shuffleQuestions: true,
    shuffleOptions: false,
    negativeMarking: false,
    questions: [
      { question: 'q-mock-3', marksOverride: null },
      { question: 'q-mock-5', marksOverride: null },
    ],
    isActive: true,
    createdBy: '650000000000000000000002',
    createdAt: new Date().toISOString(),
  },
];

const MOCK_ATTEMPTS_STORE = [];

/**
 * @desc    Get all exams (For Staff/Teachers/Admins)
 * @route   GET /api/exams
 * @access  Private (Admin, Teacher)
 */
const getExams = async (req, res, next) => {
  try {
    if (getDBStatus() === 'Connected') {
      const exams = await Exam.find({})
        .populate('questions.question')
        .populate('course', 'title enrollmentCode')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: exams.length,
        source: 'database',
        data: exams,
      });
    }

    // Mock fallback
    return res.status(200).json({
      success: true,
      count: MOCK_EXAMS_STORE.length,
      source: 'mock',
      notice: 'MongoDB is disconnected. Returning mock exams.',
      data: MOCK_EXAMS_STORE,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available exams for Students (filtered by student's enrolled courses and timing window)
 * @route   GET /api/exams/available
 * @access  Private (Authenticated Students / All)
 */
const getAvailableExamsForStudent = async (req, res, next) => {
  try {
    const now = new Date();
    const studentId = req.user ? (req.user._id || req.user.id) : null;

    if (getDBStatus() === 'Connected') {
      let enrolledCourseIds = [];
      if (studentId) {
        const enrolledCourses = await Course.find({ students: studentId });
        enrolledCourseIds = enrolledCourses.map(c => c._id);
      }

      const query = {
        isActive: true,
        $or: [
          { startTime: null, endTime: null },
          { startTime: { $lte: now }, endTime: { $gte: now } },
          { startTime: { $lte: now }, endTime: null },
          { startTime: null, endTime: { $gte: now } },
        ],
      };

      if (enrolledCourseIds.length > 0) {
        query.course = { $in: enrolledCourseIds };
      }

      const exams = await Exam.find(query)
        .populate('course', 'title description')
        .select('-questions.question.correctAnswer')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: exams.length,
        source: 'database',
        data: exams,
      });
    }

    // Mock fallback: Filter mock exams by timing window and course enrollment
    const availableMockExams = MOCK_EXAMS_STORE.filter(exam => {
      if (!exam.isActive) return false;
      const start = exam.startTime ? new Date(exam.startTime) : null;
      const end = exam.endTime ? new Date(exam.endTime) : null;

      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    }).map(e => {
      const copy = JSON.parse(JSON.stringify(e));
      if (copy.course) delete copy.course.enrollmentCode;
      return copy;
    });

    return res.status(200).json({
      success: true,
      count: availableMockExams.length,
      source: 'mock',
      notice: 'MongoDB disconnected. Returning available mock exams.',
      data: availableMockExams,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single exam by ID
 * @route   GET /api/exams/:id
 * @access  Private
 */
const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (getDBStatus() === 'Connected') {
      const exam = await Exam.findById(id)
        .populate('questions.question')
        .populate('course', 'title description enrollmentCode teacher');

      if (!exam) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }

      const examObj = exam.toObject();
      if (req.user?.role === 'student' && examObj.course) {
        delete examObj.course.enrollmentCode;
      }

      return res.status(200).json({ success: true, data: examObj });
    }

    const mockExam = MOCK_EXAMS_STORE.find(e => e._id === id);
    if (!mockExam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    const mockCopy = JSON.parse(JSON.stringify(mockExam));
    if (req.user?.role === 'student' && mockCopy.course) {
      delete mockCopy.course.enrollmentCode;
    }
    return res.status(200).json({ success: true, data: mockCopy });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new Exam (Teacher / Admin - Requires course selection)
 * @route   POST /api/exams
 * @access  Private (Admin, Teacher)
 */
const createExam = async (req, res, next) => {
  try {
    const {
      title,
      code,
      course,
      description,
      category,
      questions,
      durationMinutes,
      startTime,
      endTime,
      totalMarks,
      passingMarks,
      attemptsAllowed,
      shuffleQuestions,
      shuffleOptions,
      negativeMarking,
    } = req.body;

    const teacherId = req.user ? (req.user._id || req.user.id) : null;

    if (req.user && req.user.role === 'teacher' && req.user.teacherApprovalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your teacher account is pending admin approval. You cannot create courses or exams until approved.',
      });
    }

    if (!title || !code) {
      return res.status(400).json({
        success: false,
        message: 'Exam Title and Code are required.',
      });
    }

    if (!course) {
      return res.status(400).json({
        success: false,
        message: 'Please select a course for this exam.',
      });
    }

    const formattedCode = code.toUpperCase().trim();

    if (getDBStatus() === 'Connected') {
      // Validate teacher has at least 1 course
      const teacherCourses = await Course.find({ teacher: teacherId });
      if (teacherCourses.length === 0 && req.user?.role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'You cannot create an exam without first having at least one course. Please create a course first.',
        });
      }

      // Validate selected course belongs to teacher
      const targetCourse = await Course.findById(course);
      if (!targetCourse) {
        return res.status(400).json({
          success: false,
          message: 'Selected course does not exist.',
        });
      }

      if (String(targetCourse.teacher) !== String(teacherId) && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only create exams for courses you own.',
        });
      }

      const existing = await Exam.findOne({ code: formattedCode });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `An exam with code '${formattedCode}' already exists.`,
        });
      }

      const exam = await Exam.create({
        title,
        code: formattedCode,
        course,
        description: description || '',
        category: category || 'General',
        questions: questions || [],
        durationMinutes: durationMinutes || 60,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        totalMarks: totalMarks || 100,
        passingMarks: passingMarks || 40,
        attemptsAllowed: attemptsAllowed || 1,
        shuffleQuestions: !!shuffleQuestions,
        shuffleOptions: !!shuffleOptions,
        negativeMarking: negativeMarking !== undefined ? !!negativeMarking : true,
        createdBy: teacherId,
      });

      return res.status(201).json({
        success: true,
        message: 'Exam created successfully.',
        data: exam,
      });
    }

    // Mock fallback
    const newMockExam = {
      _id: `exam-mock-${Date.now()}`,
      title,
      code: formattedCode,
      course: course || 'course-mock-1',
      description: description || '',
      category: category || 'General',
      durationMinutes: durationMinutes || 60,
      startTime: startTime || null,
      endTime: endTime || null,
      totalMarks: totalMarks || 100,
      passingMarks: passingMarks || 40,
      attemptsAllowed: attemptsAllowed || 1,
      shuffleQuestions: !!shuffleQuestions,
      shuffleOptions: !!shuffleOptions,
      negativeMarking: negativeMarking !== undefined ? !!negativeMarking : true,
      questions: questions || [],
      isActive: true,
      createdBy: teacherId,
      createdAt: new Date().toISOString(),
    };

    MOCK_EXAMS_STORE.push(newMockExam);

    return res.status(201).json({
      success: true,
      message: 'Exam created successfully. (Mock DB)',
      data: newMockExam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Exam details and question order
 * @route   PUT /api/exams/:id
 * @access  Private (Admin, Teacher)
 */
const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (getDBStatus() === 'Connected') {
      let exam = await Exam.findById(id);
      if (!exam) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }

      exam = await Exam.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });

      return res.status(200).json({
        success: true,
        message: 'Exam updated successfully.',
        data: exam,
      });
    }

    // Mock fallback
    const index = MOCK_EXAMS_STORE.findIndex(e => e._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Exam not found in mock store' });
    }

    MOCK_EXAMS_STORE[index] = {
      ...MOCK_EXAMS_STORE[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      message: 'Exam updated (Mock DB).',
      data: MOCK_EXAMS_STORE[index],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete Exam (Teacher / Admin) with safety & cascade checks
 * @route   DELETE /api/exams/:id
 * @access  Private (Admin, Teacher)
 */
const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? (req.user._id || req.user.id) : null;
    const userRole = req.user?.role;
    const isForce = req.query.force === 'true' || req.body?.confirmDelete === true || req.body?.force === true;
    const isCheckOnly = req.query.checkOnly === 'true';

    if (getDBStatus() === 'Connected') {
      const exam = await Exam.findById(id);
      if (!exam) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }

      // 1. Verify Ownership (unless Admin)
      if (userRole !== 'admin' && String(exam.createdBy) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not authorized to delete another teacher's exam.",
        });
      }

      // 2. Check if Exam is Currently Active / Ongoing
      let activeAttemptsCount = 0;
      let attemptCount = 0;
      try {
        const now = new Date();
        const isLiveWindow = exam.startTime && exam.endTime && new Date(exam.startTime) <= now && now <= new Date(exam.endTime);
        activeAttemptsCount = await Attempt.countDocuments({
          exam: id,
          status: 'in-progress',
        });

        if (isLiveWindow || activeAttemptsCount > 0) {
          return res.status(400).json({
            success: false,
            message: 'Cannot delete an exam while it is currently active. Please wait until the exam window closes, or edit the end time first.',
          });
        }

        // 3. Check for existing student attempts
        attemptCount = await Attempt.countDocuments({ exam: id });
      } catch (checkErr) {
        console.error('Server error while checking exam attempts:', checkErr);
        return res.status(500).json({
          success: false,
          message: 'Server error while checking exam attempts, please try again',
        });
      }

      if (isCheckOnly) {
        return res.status(200).json({
          success: true,
          requiresConfirmation: attemptCount > 0,
          attemptCount,
          examTitle: exam.title,
        });
      }

      if (attemptCount > 0 && !isForce) {
        return res.status(400).json({
          success: false,
          requiresConfirmation: true,
          attemptCount,
          message: `This exam has ${attemptCount} student attempt(s). Deleting will permanently remove all associated results and cannot be undone.`,
        });
      }

      // 4. Cascade Delete Attempts if Force or no attempts exist
      if (attemptCount > 0 && isForce) {
        await Attempt.deleteMany({ exam: id });
      }

      // 5. Remove Exam reference from parent Course documents
      await Course.updateMany({ exams: id }, { $pull: { exams: id } });

      // 6. Delete Exam document
      await exam.deleteOne();

      return res.status(200).json({
        success: true,
        message: attemptCount > 0 
          ? `Exam and all ${attemptCount} associated student attempt(s) deleted successfully.`
          : 'Exam deleted successfully.',
      });
    }

    // Mock fallback
    const index = MOCK_EXAMS_STORE.findIndex(e => e._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Exam not found in mock store' });
    }

    const mockExam = MOCK_EXAMS_STORE[index];
    if (userRole !== 'admin' && String(mockExam.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to delete another teacher's exam.",
      });
    }

    const mockAttempts = MOCK_ATTEMPTS_STORE.filter(a => String(a.exam) === String(id));
    const attemptCount = mockAttempts.length;

    if (isCheckOnly) {
      return res.status(200).json({
        success: true,
        requiresConfirmation: attemptCount > 0,
        attemptCount,
        examTitle: mockExam.title,
      });
    }

    if (attemptCount > 0 && !isForce) {
      return res.status(400).json({
        success: false,
        requiresConfirmation: true,
        attemptCount,
        message: `This exam has ${attemptCount} student attempts. Deleting will permanently remove all associated results and cannot be undone.`,
      });
    }

    // Cascade delete mock attempts
    for (let i = MOCK_ATTEMPTS_STORE.length - 1; i >= 0; i--) {
      if (String(MOCK_ATTEMPTS_STORE[i].exam) === String(id)) {
        MOCK_ATTEMPTS_STORE.splice(i, 1);
      }
    }

    MOCK_EXAMS_STORE.splice(index, 1);

    return res.status(200).json({
      success: true,
      message: 'Exam deleted successfully (Mock DB).',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExams,
  getAvailableExamsForStudent,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
};
