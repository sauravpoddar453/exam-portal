const User = require('../models/User');
const Exam = require('../models/Exam');
const Course = require('../models/Course');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const AuthLog = require('../models/AuthLog');
const Report = require('../models/Report');
const Broadcast = require('../models/Broadcast');
const Setting = require('../models/Setting');
const { getDBStatus } = require('../config/db');
const { sendEmail, sendTeacherApprovalEmail, sendTeacherRejectionEmail } = require('../services/emailService');

/**
 * @desc    Get executive overview stats, growth trends, and recent activity feed (Admin)
 * @route   GET /api/admin/overview
 * @access  Private (Admin)
 */
const getAdminOverviewStats = async (req, res, next) => {
  try {
    if (getDBStatus() === 'Connected') {
      const totalStudents = await User.countDocuments({ role: 'student' });
      const totalTeachers = await User.countDocuments({ role: 'teacher' });
      const totalCourses = await Course.countDocuments({});
      const totalExams = await Exam.countDocuments({});
      const totalAttempts = await Attempt.countDocuments({ status: { $in: ['submitted', 'timed-out'] } });

      // Build growth & activity trends dataset
      const exams = await Exam.find({});
      const chartData = [];

      for (const exam of exams) {
        const attempts = await Attempt.find({ exam: exam._id, status: { $in: ['submitted', 'timed-out'] } });
        const passCount = attempts.filter(a => a.isPassed).length;
        const failCount = attempts.length - passCount;
        const totalScoreSum = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
        const avgScore = attempts.length > 0 ? Math.round(totalScoreSum / attempts.length) : 0;

        chartData.push({
          examId: exam._id,
          name: exam.code || exam.title,
          fullTitle: exam.title,
          pass: passCount,
          fail: failCount,
          avgScore: avgScore,
          totalAttempts: attempts.length,
        });
      }

      // Recent Activity Feed across entire platform
      const recentUsers = await User.find({})
        .select('name email role createdAt')
        .sort({ createdAt: -1 })
        .limit(5);

      const recentCourses = await Course.find({})
        .populate('teacher', 'name email')
        .sort({ createdAt: -1 })
        .limit(5);

      const recentAttempts = await Attempt.find({ status: { $in: ['submitted', 'timed-out'] } })
        .populate('student', 'name email')
        .populate('exam', 'title code')
        .sort({ createdAt: -1 })
        .limit(5);

      const recentActivity = [
        ...recentUsers.map(u => ({
          type: 'user_registration',
          title: `New ${u.role.toUpperCase()} registered: ${u.name}`,
          subtext: u.email,
          timestamp: u.createdAt,
        })),
        ...recentCourses.map(c => ({
          type: 'course_created',
          title: `Course created: ${c.title}`,
          subtext: `Instructor: ${c.teacher?.name || 'Staff'}`,
          timestamp: c.createdAt,
        })),
        ...recentAttempts.map(a => ({
          type: 'exam_submission',
          title: `Exam completed: ${a.exam?.title || 'Assessment'}`,
          subtext: `Candidate: ${a.student?.name || 'Student'} | Score: ${a.score}`,
          timestamp: a.createdAt,
        })),
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

      return res.status(200).json({
        success: true,
        data: {
          totalStudents,
          totalTeachers,
          totalCourses,
          totalExams,
          totalAttempts,
          chartData,
          recentActivity,
        },
      });
    }

    // Database disconnected fallback
    return res.status(200).json({
      success: true,
      data: {
        totalStudents: 0,
        totalTeachers: 0,
        totalCourses: 0,
        totalExams: 0,
        totalAttempts: 0,
        chartData: [],
        recentActivity: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get real stats & candidate activity for logged-in teacher / admin
 * @route   GET /api/admin/teacher-overview
 * @access  Private (Teacher, Admin)
 */
/**
 * @desc    Get real stats & candidate activity for logged-in teacher / admin
 * @route   GET /api/admin/teacher-overview
 * @access  Private (Teacher, Admin)
 */
const getTeacherOverviewStats = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;

    if (getDBStatus() === 'Connected') {
      const isTeacher = req.user.role === 'teacher';

      // Find all courses taught by this teacher
      const teacherCourses = await Course.find(isTeacher ? { teacher: teacherId } : {});
      const teacherCourseIds = teacherCourses.map(c => c._id);

      // Find exams created by teacher OR belonging to teacher's courses
      const examQuery = isTeacher
        ? { $or: [{ createdBy: teacherId }, { course: { $in: teacherCourseIds } }] }
        : {};

      const teacherExams = await Exam.find(examQuery)
        .populate('course', 'title code teacher')
        .populate('questions.question')
        .sort({ createdAt: -1 });

      const examIds = teacherExams.map(e => e._id);

      const publishedCount = teacherExams.filter(e => e.isActive).length;
      const draftCount = teacherExams.filter(e => !e.isActive).length;

      // Find ALL attempt records for teacher's exams (no filter first)
      const rawAttempts = await Attempt.find({ exam: { $in: examIds } })
        .populate('student', 'name email role')
        .populate('exam', 'title code durationMinutes totalMarks')
        .sort({ createdAt: -1 });

      // Calculate submission status counts
      const submittedCount = rawAttempts.filter(a => a.status === 'submitted').length;
      const timedOutCount = rawAttempts.filter(a => a.status === 'timed-out').length;
      const inProgressCount = rawAttempts.filter(a => a.status === 'in-progress').length;
      const evaluatedCount = submittedCount + timedOutCount;

      const autoGradedCount = rawAttempts.filter(a => (a.status === 'submitted' || a.status === 'timed-out') && a.gradingStatus !== 'pending-review').length;
      const pendingReviewCount = rawAttempts.filter(a => a.gradingStatus === 'pending-review').length;

      // Calculate unique active students (from enrolled courses + exam attempts)
      const uniqueStudentIds = new Set();
      teacherCourses.forEach(c => {
        if (Array.isArray(c.students)) {
          c.students.forEach(stId => uniqueStudentIds.add(String(stId)));
        }
      });
      rawAttempts.forEach(a => {
        if (a.student) {
          uniqueStudentIds.add(String(a.student._id || a.student));
        }
      });
      const activeStudentsCount = uniqueStudentIds.size;

      // Console log raw vs filtered stats for debugging
      console.log(`\n=================== TEACHER OVERVIEW STATS DEBUG ===================`);
      console.log(`[Teacher Stats] Teacher ID: ${teacherId} | Role: ${req.user.role}`);
      console.log(`[Teacher Stats] Total Teacher Courses: ${teacherCourses.length}`);
      console.log(`[Teacher Stats] Total Teacher Exams: ${teacherExams.length}`);
      console.log(`[Teacher Stats] Raw Total Attempt Records (No Filters): ${rawAttempts.length}`);
      console.log(`[Teacher Stats] Attempts by Status -> submitted: ${submittedCount} | timed-out: ${timedOutCount} | in-progress: ${inProgressCount}`);
      console.log(`[Teacher Stats] Total Evaluated Submissions: ${evaluatedCount}`);
      console.log(`[Teacher Stats] Unique Active Candidates Count: ${activeStudentsCount}`);
      console.log(`====================================================================\n`);

      // Format recent activity feed for frontend display
      const recentActivity = rawAttempts.slice(0, 10).map(a => ({
        _id: a._id,
        examCode: a.exam?.code || 'EXAM',
        examTitle: a.exam?.title || 'Assessment',
        studentName: a.student?.name || 'Candidate',
        studentEmail: a.student?.email || '',
        score: a.score || 0,
        totalMarks: a.totalMarks || a.exam?.totalMarks || 100,
        submittedAt: a.submittedAt || a.updatedAt || a.createdAt,
        isPassed: !!a.isPassed,
        status: a.status,
        gradingStatus: a.gradingStatus,
      }));

      return res.status(200).json({
        success: true,
        data: {
          totalExams: teacherExams.length,
          examsCount: teacherExams.length,
          publishedCount,
          draftCount,
          totalAttempts: rawAttempts.length,
          totalSubmissions: evaluatedCount,
          evaluatedCount,
          activeStudentsCount,
          autoGradedCount,
          pendingReviewCount,
          recentAttempts: rawAttempts.slice(0, 10),
          recentActivity,
          exams: teacherExams,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        totalExams: 0,
        examsCount: 0,
        publishedCount: 0,
        draftCount: 0,
        totalAttempts: 0,
        totalSubmissions: 0,
        evaluatedCount: 0,
        activeStudentsCount: 0,
        autoGradedCount: 0,
        pendingReviewCount: 0,
        recentAttempts: [],
        recentActivity: [],
        exams: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Debug endpoint to inspect raw vs filtered teacher attempt stats
 * @route   GET /api/admin/debug-teacher-stats
 * @access  Private (Teacher, Admin)
 */
const debugTeacherStats = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const isTeacher = req.user.role === 'teacher';

    const teacherCourses = await Course.find(isTeacher ? { teacher: teacherId } : {});
    const teacherCourseIds = teacherCourses.map(c => c._id);

    const examQuery = isTeacher
      ? { $or: [{ createdBy: teacherId }, { course: { $in: teacherCourseIds } }] }
      : {};

    const teacherExams = await Exam.find(examQuery);
    const examIds = teacherExams.map(e => e._id);

    const rawAttempts = await Attempt.find({ exam: { $in: examIds } })
      .populate('student', 'name email')
      .populate('exam', 'title code');

    const submittedCount = rawAttempts.filter(a => a.status === 'submitted').length;
    const timedOutCount = rawAttempts.filter(a => a.status === 'timed-out').length;
    const inProgressCount = rawAttempts.filter(a => a.status === 'in-progress').length;
    const totalEvaluated = submittedCount + timedOutCount;

    const uniqueStudents = new Set();
    teacherCourses.forEach(c => c.students?.forEach(s => uniqueStudents.add(String(s))));
    rawAttempts.forEach(a => { if (a.student) uniqueStudents.add(String(a.student._id || a.student)); });

    const debugReport = {
      teacherId,
      teacherRole: req.user.role,
      totalCourses: teacherCourses.length,
      totalExams: teacherExams.length,
      rawAttemptsTotalNoFilter: rawAttempts.length,
      statusBreakdown: {
        submitted: submittedCount,
        timedOut: timedOutCount,
        inProgress: inProgressCount,
        totalEvaluated: totalEvaluated,
      },
      activeStudentsUniqueCount: uniqueStudents.size,
      rawAttemptDetails: rawAttempts.map(a => ({
        attemptId: a._id,
        studentName: a.student?.name,
        examTitle: a.exam?.title,
        status: a.status,
        gradingStatus: a.gradingStatus,
        score: a.score,
        totalMarks: a.totalMarks,
      })),
    };

    console.log('[DEBUG TEACHER STATS REPORT]:', JSON.stringify(debugReport, null, 2));

    return res.status(200).json({
      success: true,
      debugReport,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed itemized question performance analytics for an exam
 * @route   GET /api/admin/analytics/exam/:examId
 * @access  Private (Teacher, Admin)
 */
const getExamAnalytics = async (req, res, next) => {
  try {
    const { examId } = req.params;

    if (getDBStatus() === 'Connected') {
      const exam = await Exam.findById(examId)
        .populate('questions.question')
        .populate('course', 'title code');

      if (!exam) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }

      const attempts = await Attempt.find({ exam: examId, status: { $in: ['submitted', 'timed-out'] } })
        .populate('student', 'name email')
        .sort({ createdAt: -1 });

      const questionStats = [];
      if (Array.isArray(exam.questions)) {
        for (const item of exam.questions) {
          const q = item.question;
          if (!q) continue;

          let correctCount = 0;
          let incorrectCount = 0;

          attempts.forEach(attempt => {
            const ans = attempt.answers.find(a => String(a.question) === String(q._id));
            if (ans && ans.marksObtained > 0) {
              correctCount++;
            } else if (ans) {
              incorrectCount++;
            }
          });

          const totalResponded = attempts.length;
          const errorRatePercent = totalResponded > 0 ? Math.round((incorrectCount / totalResponded) * 100) : 0;

          questionStats.push({
            questionId: q._id,
            questionText: q.questionText,
            type: q.type,
            subject: q.subject,
            difficulty: q.difficulty,
            marks: item.marksOverride || q.marks,
            correctCount,
            incorrectCount,
            errorRatePercent,
          });
        }
      }

      questionStats.sort((a, b) => b.errorRatePercent - a.errorRatePercent);

      return res.status(200).json({
        success: true,
        data: {
          exam,
          questionStats,
          attempts,
          totalAttempts: attempts.length,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        exam: { _id: examId, title: 'Exam Analytics', code: 'EXAM', totalMarks: 100 },
        questionStats: [],
        attempts: [],
        totalAttempts: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users list with pagination, search, & role filters
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;

    if (getDBStatus() === 'Connected') {
      let query = {};
      if (role && role !== 'All') {
        query.role = role.toLowerCase();
      }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 50;
      const skip = (pageNum - 1) * limitNum;

      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        count: users.length,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
        currentPage: pageNum,
        data: users,
      });
    }

    return res.status(200).json({
      success: true,
      count: 0,
      total: 0,
      totalPages: 1,
      currentPage: 1,
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Block a user
 * @route   PUT /api/admin/users/:id/block
 * @access  Private (Admin)
 */
const blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (getDBStatus() === 'Connected') {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (user.role === 'admin') {
        return res.status(400).json({ success: false, message: 'Cannot block an administrator account.' });
      }

      user.isBlocked = true;
      await user.save();
      return res.status(200).json({ success: true, message: `User ${user.name} blocked successfully.`, data: user });
    }
    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unblock a user
 * @route   PUT /api/admin/users/:id/unblock
 * @access  Private (Admin)
 */
const unblockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (getDBStatus() === 'Connected') {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      user.isBlocked = false;
      await user.save();
      return res.status(200).json({ success: true, message: `User ${user.name} unblocked successfully.`, data: user });
    }
    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle block/unblock status of user account
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (Admin)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (getDBStatus() === 'Connected') {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.role === 'admin' && isBlocked) {
        return res.status(400).json({ success: false, message: 'Cannot block an administrator account.' });
      }

      user.isBlocked = !!isBlocked;
      await user.save();

      return res.status(200).json({
        success: true,
        message: `User account ${user.isBlocked ? 'blocked' : 'unblocked'} successfully.`,
        data: user,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Database is disconnected. Cannot update user status.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change user role (admin, teacher, student)
 * @route   PUT /api/admin/users/:id/role
 * @access  Private (Admin)
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'teacher', 'student'];
    if (!role || !validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, teacher, or student.',
      });
    }

    if (getDBStatus() === 'Connected') {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      user.role = role.toLowerCase();
      if (user.role === 'teacher' && !user.teacherApprovalStatus) {
        user.teacherApprovalStatus = 'approved'; // Role assigned by admin is pre-approved
      }
      await user.save();

      return res.status(200).json({
        success: true,
        message: `User role updated to '${user.role}' successfully.`,
        data: user,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Database is disconnected. Cannot update user role.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user with safety checks & cascade option
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isForce = req.query.force === 'true' || req.body?.confirmDelete === true;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, please log in again' });
    }

    if (getDBStatus() === 'Connected') {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const currentAdminId = req.user._id || req.user.id;
      if (currentAdminId && String(user._id) === String(currentAdminId)) {
        return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
      }

      const courseCount = await Course.countDocuments({ teacher: id });
      const examCount = await Exam.countDocuments({ createdBy: id });
      const attemptCount = await Attempt.countDocuments({ student: id });

      const totalAssociated = courseCount + examCount + attemptCount;

      if (totalAssociated > 0 && !isForce) {
        return res.status(400).json({
          success: false,
          requiresConfirmation: true,
          courseCount,
          examCount,
          attemptCount,
          message: `User ${user.name} has ${courseCount} course(s), ${examCount} exam(s), and ${attemptCount} attempt(s). Deleting will permanently remove associated data.`,
        });
      }

      // Cascade delete associated courses, exams, attempts
      if (isForce) {
        await Course.deleteMany({ teacher: id });
        await Exam.deleteMany({ createdBy: id });
        await Attempt.deleteMany({ student: id });
      }

      await user.deleteOne();

      return res.status(200).json({
        success: true,
        message: `User ${user.name} deleted successfully.`,
      });
    }

    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk block multiple users
 * @route   PUT /api/admin/users/bulk-block
 * @access  Private (Admin)
 */
const bulkBlockUsers = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide array of user IDs' });
    }

    if (getDBStatus() === 'Connected') {
      // Exclude admin accounts from being blocked
      const result = await User.updateMany(
        { _id: { $in: userIds }, role: { $ne: 'admin' } },
        { $set: { isBlocked: true } }
      );

      return res.status(200).json({
        success: true,
        message: `Blocked ${result.modifiedCount} user accounts.`,
      });
    }

    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk delete multiple users
 * @route   DELETE /api/admin/users/bulk-delete
 * @access  Private (Admin)
 */
const bulkDeleteUsers = async (req, res, next) => {
  try {
    const { userIds, force } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide array of user IDs' });
    }

    if (getDBStatus() === 'Connected') {
      // Filter out current admin user
      const validIds = userIds.filter(id => String(id) !== String(req.user._id));

      if (force) {
        await Course.deleteMany({ teacher: { $in: validIds } });
        await Exam.deleteMany({ createdBy: { $in: validIds } });
        await Attempt.deleteMany({ student: { $in: validIds } });
      }

      const result = await User.deleteMany({ _id: { $in: validIds }, role: { $ne: 'admin' } });

      return res.status(200).json({
        success: true,
        message: `Permanently deleted ${result.deletedCount} user accounts.`,
      });
    }

    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk import student accounts via CSV
 * @route   POST /api/admin/users/bulk
 * @access  Private (Admin)
 */
const bulkImportUsers = async (req, res, next) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty array of user objects.',
      });
    }

    const formattedUsers = users.map(u => ({
      name: u.name || 'Student Account',
      email: u.email ? u.email.toLowerCase().trim() : `student-${Date.now()}@examportal.com`,
      password: u.password || 'student123',
      role: u.role && ['admin', 'teacher', 'student'].includes(u.role.toLowerCase()) ? u.role.toLowerCase() : 'student',
      teacherApprovalStatus: 'approved',
    }));

    if (getDBStatus() === 'Connected') {
      const inserted = [];
      for (const uData of formattedUsers) {
        const exists = await User.findOne({ email: uData.email });
        if (!exists) {
          const newUser = await User.create(uData);
          inserted.push(newUser);
        }
      }

      return res.status(201).json({
        success: true,
        count: inserted.length,
        message: `Bulk imported ${inserted.length} user accounts.`,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Database is disconnected. Cannot process bulk import.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get teachers pending admin approval
 * @route   GET /api/admin/teacher-approvals
 * @access  Private (Admin)
 */
const getTeacherApprovals = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;

    if (getDBStatus() === 'Connected') {
      let query = { role: 'teacher' };
      if (status !== 'All') {
        query.teacherApprovalStatus = status.toLowerCase();
      }

      const teachers = await User.find(query).select('-password').sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: teachers.length,
        data: teachers,
      });
    }

    return res.status(200).json({ success: true, count: 0, data: [] });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a pending teacher account
 * @route   PUT /api/admin/teacher-approvals/:id/approve
 * @access  Private (Admin)
 */
const approveTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (getDBStatus() === 'Connected') {
      const teacher = await User.findById(id);
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher account not found' });

      teacher.teacherApprovalStatus = 'approved';
      await teacher.save();

      // Send approval notification email via Nodemailer
      sendTeacherApprovalEmail({ toEmail: teacher.email, userName: teacher.name }).catch(err => {
        console.error('Failed to send approval email:', err.message);
      });

      return res.status(200).json({
        success: true,
        message: `Teacher account ${teacher.name} approved successfully! Notification email dispatched.`,
        data: teacher,
      });
    }

    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a pending teacher account
 * @route   PUT /api/admin/teacher-approvals/:id/reject
 * @access  Private (Admin)
 */
const rejectTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (getDBStatus() === 'Connected') {
      const teacher = await User.findById(id);
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher account not found' });

      teacher.teacherApprovalStatus = 'rejected';
      await teacher.save();

      // Send rejection notification email via Nodemailer
      sendTeacherRejectionEmail({ toEmail: teacher.email, userName: teacher.name, reason }).catch(err => {
        console.error('Failed to send rejection email:', err.message);
      });

      return res.status(200).json({
        success: true,
        message: `Teacher account ${teacher.name} rejected.`,
        data: teacher,
      });
    }

    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all courses platform-wide for admin oversight
 * @route   GET /api/admin/courses
 * @access  Private (Admin)
 */
const getAdminCourses = async (req, res, next) => {
  try {
    if (getDBStatus() === 'Connected') {
      const courses = await Course.find({})
        .populate('teacher', 'name email role')
        .sort({ createdAt: -1 });

      const formatted = [];
      for (const course of courses) {
        const examCount = await Exam.countDocuments({ course: course._id });
        const cObj = course.toObject();
        formatted.push({
          _id: cObj._id,
          title: cObj.title || 'Untitled Course',
          description: cObj.description || '',
          enrollmentCode: cObj.enrollmentCode || 'N/A',
          teacher: cObj.teacher ? {
            _id: cObj.teacher._id,
            name: cObj.teacher.name || 'Faculty User',
            email: cObj.teacher.email || '',
            role: cObj.teacher.role || 'teacher',
          } : { name: 'Unknown Teacher', email: '' },
          students: cObj.students || [],
          studentCount: Array.isArray(cObj.students) ? cObj.students.length : 0,
          examCount,
          isUnderReview: !!cObj.isUnderReview,
          createdAt: cObj.createdAt || new Date(),
          updatedAt: cObj.updatedAt || new Date(),
        });
      }

      return res.status(200).json({
        success: true,
        count: formatted.length,
        data: formatted,
      });
    }

    return res.status(200).json({ success: true, count: 0, data: [] });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get course details for admin
 * @route   GET /api/admin/courses/:id
 * @access  Private (Admin)
 */
const getAdminCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (getDBStatus() === 'Connected') {
      const course = await Course.findById(id)
        .populate('teacher', 'name email')
        .populate('students', 'name email');

      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

      const exams = await Exam.find({ course: id }).populate('createdBy', 'name email');

      return res.status(200).json({
        success: true,
        data: {
          course,
          exams,
        },
      });
    }

    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Flag / unflag a course as under review
 * @route   PUT /api/admin/courses/:id/flag
 * @access  Private (Admin)
 */
const flagCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isUnderReview } = req.body;

    if (getDBStatus() === 'Connected') {
      const course = await Course.findById(id);
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

      course.isUnderReview = isUnderReview !== undefined ? !!isUnderReview : !course.isUnderReview;
      await course.save();

      return res.status(200).json({
        success: true,
        message: `Course '${course.title}' ${course.isUnderReview ? 'flagged as Under Review' : 'unflagged'}.`,
        data: course,
      });
    }

    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a course platform-wide (Admin)
 * @route   DELETE /api/admin/courses/:id
 * @access  Private (Admin)
 */
const deleteAdminCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isForce = req.query.force === 'true' || req.body?.confirmDelete === true;

    if (getDBStatus() === 'Connected') {
      const course = await Course.findById(id);
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

      const exams = await Exam.find({ course: id });
      const examIds = exams.map(e => e._id);
      const attemptCount = await Attempt.countDocuments({ exam: { $in: examIds } });

      if (attemptCount > 0 && !isForce) {
        return res.status(400).json({
          success: false,
          requiresConfirmation: true,
          examCount: exams.length,
          attemptCount,
          message: `Course '${course.title}' has ${exams.length} exam(s) and ${attemptCount} student attempt(s). Deleting will remove all associated exams and results.`,
        });
      }

      // Cascade delete exams and attempts
      if (isForce || attemptCount === 0) {
        await Attempt.deleteMany({ exam: { $in: examIds } });
        await Exam.deleteMany({ course: id });
        await course.deleteOne();
      }

      return res.status(200).json({
        success: true,
        message: `Course '${course.title}' deleted successfully.`,
      });
    }

    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Flag / unflag an exam as under review
 * @route   PUT /api/admin/exams/:id/flag
 * @access  Private (Admin)
 */
const flagExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isUnderReview } = req.body;

    if (getDBStatus() === 'Connected') {
      const exam = await Exam.findById(id);
      if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

      exam.isUnderReview = isUnderReview !== undefined ? !!isUnderReview : !exam.isUnderReview;
      await exam.save();

      return res.status(200).json({
        success: true,
        message: `Exam '${exam.title}' ${exam.isUnderReview ? 'flagged as Under Review' : 'unflagged'}.`,
        data: exam,
      });
    }

    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get platform-wide proctoring security audit (flagged / auto-submitted attempts)
 * @route   GET /api/admin/proctor-audit
 * @access  Private (Admin)
 */
const getProctorAudit = async (req, res, next) => {
  try {
    const { search, reason } = req.query;

    if (getDBStatus() === 'Connected') {
      let query = {
        $or: [
          { autoSubmitted: true },
          { tabSwitchCount: { $gt: 0 } },
          { fullscreenExitCount: { $gt: 0 } },
        ],
      };

      if (reason && reason !== 'All') {
        query.autoSubmitReason = reason;
      }

      const attempts = await Attempt.find(query)
        .populate('student', 'name email role')
        .populate({
          path: 'exam',
          select: 'title code durationMinutes',
          populate: { path: 'course', select: 'title enrollmentCode' },
        })
        .sort({ updatedAt: -1 });

      let filtered = attempts;
      if (search) {
        const sLower = search.toLowerCase();
        filtered = attempts.filter(a => 
          a.student?.name?.toLowerCase().includes(sLower) ||
          a.student?.email?.toLowerCase().includes(sLower) ||
          a.exam?.title?.toLowerCase().includes(sLower) ||
          a.exam?.code?.toLowerCase().includes(sLower)
        );
      }

      return res.status(200).json({
        success: true,
        count: filtered.length,
        data: filtered,
      });
    }

    return res.status(200).json({ success: true, count: 0, data: [] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};

/**
 * @desc    Get system & login logs (AuthLog)
 * @route   GET /api/admin/logs
 * @access  Private (Admin)
 */
const getSystemLogs = async (req, res, next) => {
  try {
    const { type = 'all', limit = 100 } = req.query;
    if (getDBStatus() === 'Connected') {
      let query = {};
      if (type === 'failed') query.success = false;
      if (type === 'success') query.success = true;

      const logs = await AuthLog.find(query)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit, 10) || 100);

      return res.status(200).json({ success: true, count: logs.length, data: logs });
    }
    return res.status(200).json({ success: true, count: 0, data: [] });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get platform usage metrics & counters
 * @route   GET /api/admin/platform-usage
 * @access  Private (Admin)
 */
const getPlatformUsage = async (req, res, next) => {
  try {
    if (getDBStatus() === 'Connected') {
      const userCount = await User.countDocuments({});
      const courseCount = await Course.countDocuments({});
      const examCount = await Exam.countDocuments({});
      const attemptCount = await Attempt.countDocuments({});
      const questionCount = await Question.countDocuments({});

      const pdfParseSetting = await Setting.findOne({ key: 'pdfParseCount' });
      const emailSentSetting = await Setting.findOne({ key: 'emailSentCount' });

      // Rough estimate of DB storage in KB
      const estimatedDbSizeKb = Math.round((userCount * 2 + courseCount * 3 + examCount * 5 + attemptCount * 8 + questionCount * 4));

      return res.status(200).json({
        success: true,
        data: {
          userCount,
          courseCount,
          examCount,
          attemptCount,
          questionCount,
          estimatedDbSizeKb,
          pdfParseCount: pdfParseSetting ? pdfParseSetting.value || 0 : 0,
          emailSentCount: emailSentSetting ? emailSentSetting.value || 0 : 0,
        },
      });
    }
    return res.status(200).json({
      success: true,
      data: { userCount: 0, courseCount: 0, examCount: 0, attemptCount: 0, questionCount: 0, estimatedDbSizeKb: 0, pdfParseCount: 0, emailSentCount: 0 },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get question reports list
 * @route   GET /api/admin/reports
 * @access  Private (Admin)
 */
const getQuestionReports = async (req, res, next) => {
  try {
    const { status = 'all' } = req.query;
    if (getDBStatus() === 'Connected') {
      let query = {};
      if (status !== 'all') query.status = status;

      const reports = await Report.find(query)
        .populate({
          path: 'question',
          select: 'questionText type subject difficulty options correctAnswer correctAnswers',
        })
        .populate('reportedBy', 'name email role')
        .sort({ createdAt: -1 });

      return res.status(200).json({ success: true, count: reports.length, data: reports });
    }
    return res.status(200).json({ success: true, count: 0, data: [] });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Resolve or dismiss a question report
 * @route   PUT /api/admin/reports/:id/status
 * @access  Private (Admin)
 */
const updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (getDBStatus() === 'Connected') {
      const report = await Report.findById(id);
      if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

      report.status = status || 'resolved';
      await report.save();

      return res.status(200).json({ success: true, message: `Report marked as ${report.status}`, data: report });
    }
    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get Question Quality Audit (missing answers or unused questions)
 * @route   GET /api/admin/question-quality
 * @access  Private (Admin)
 */
const getQuestionQualityAudit = async (req, res, next) => {
  try {
    if (getDBStatus() === 'Connected') {
      const allQuestions = await Question.find({}).populate('createdBy', 'name email');

      // 1. Missing correct answer
      const missingAnswerQuestions = allQuestions.filter(q => {
        if (q.type === 'mcq-single' || q.type === 'short-answer') {
          return !q.correctAnswer || String(q.correctAnswer).trim() === '';
        } else if (q.type === 'mcq-multiple') {
          return !Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0;
        }
        return false;
      });

      // 2. Unused questions
      const allExams = await Exam.find({}, 'questions.question');
      const usedQuestionIds = new Set();
      allExams.forEach(e => {
        e.questions?.forEach(item => {
          if (item.question) usedQuestionIds.add(String(item.question));
        });
      });

      const unusedQuestions = allQuestions.filter(q => !usedQuestionIds.has(String(q._id)));

      return res.status(200).json({
        success: true,
        data: {
          missingAnswerQuestions,
          unusedQuestions,
          totalQuestionsCount: allQuestions.length,
        },
      });
    }
    return res.status(200).json({ success: true, data: { missingAnswerQuestions: [], unusedQuestions: [], totalQuestionsCount: 0 } });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Send broadcast announcement via email
 * @route   POST /api/admin/broadcast
 * @access  Private (Admin)
 */
const sendBroadcastAnnouncement = async (req, res, next) => {
  try {
    const { message, audience } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Broadcast message content is required.' });
    }

    const targetAudience = audience || 'all';

    if (getDBStatus() === 'Connected') {
      let query = { isVerified: true };
      if (targetAudience === 'teacher') query.role = 'teacher';
      if (targetAudience === 'student') query.role = 'student';

      const targetUsers = await User.find(query).select('email name');
      const recipientEmails = targetUsers.map(u => u.email).filter(Boolean);

      const batchSize = 5;
      let sentSuccessCount = 0;

      for (let i = 0; i < recipientEmails.length; i += batchSize) {
        const batch = recipientEmails.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (toEmail) => {
            const result = await sendEmail({
              to: toEmail,
              subject: '📢 System Announcement - ExamPortal Platform Update',
              html: `
                <div style="font-family: Arial, sans-serif; background-color: #0b0a26; color: #f4f4f8; padding: 30px; border-radius: 12px;">
                  <h2 style="color: #f5a623;">📢 Announcement from ExamPortal Admin</h2>
                  <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0;">${message.replace(/\n/g, '<br/>')}</p>
                  <hr style="border: 0; border-top: 1px solid rgba(245,166,35,0.2); margin: 20px 0;" />
                  <p style="font-size: 11px; color: #a5a3c9;">This is an automated broadcast sent by ExamPortal Administration.</p>
                </div>
              `,
              text: message,
            });
            if (result && result.success) sentSuccessCount++;
          })
        );
        if (i + batchSize < recipientEmails.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      const broadcastLog = await Broadcast.create({
        message,
        audience: targetAudience,
        sentBy: req.user._id,
        sentCount: sentSuccessCount,
      });

      return res.status(200).json({
        success: true,
        message: `Broadcast message sent to ${sentSuccessCount} recipient(s).`,
        data: broadcastLog,
      });
    }

    return res.status(200).json({ success: true, message: 'Broadcast sent (Mock Mode).' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get broadcast history list
 * @route   GET /api/admin/broadcasts
 * @access  Private (Admin)
 */
const getBroadcastHistory = async (req, res, next) => {
  try {
    if (getDBStatus() === 'Connected') {
      const history = await Broadcast.find({})
        .populate('sentBy', 'name email')
        .sort({ createdAt: -1 });

      return res.status(200).json({ success: true, count: history.length, data: history });
    }
    return res.status(200).json({ success: true, count: 0, data: [] });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get average score percentage per subject across platform
 * @route   GET /api/admin/analytics/subject-performance
 * @access  Private (Admin)
 */
const getSubjectPerformanceAnalytics = async (req, res, next) => {
  try {
    if (getDBStatus() === 'Connected') {
      const attempts = await Attempt.find({ status: { $in: ['submitted', 'timed-out'] } });

      const subjectStatsMap = new Map();

      for (const attempt of attempts) {
        if (!attempt.answers || attempt.answers.length === 0) continue;
        for (const ans of attempt.answers) {
          const subject = ans.subject || 'General';
          if (!subjectStatsMap.has(subject)) {
            subjectStatsMap.set(subject, { subject, totalObtained: 0, totalMarks: 0, count: 0 });
          }
          const item = subjectStatsMap.get(subject);
          item.totalObtained += (ans.marksObtained || 0);
          item.totalMarks += (ans.marks || 1);
          item.count += 1;
        }
      }

      const subjectPerformance = Array.from(subjectStatsMap.values()).map(item => ({
        subject: item.subject,
        avgPercentage: item.totalMarks > 0 ? Math.round((item.totalObtained / item.totalMarks) * 100) : 0,
        totalQuestionsAnswered: item.count,
      })).sort((a, b) => b.avgPercentage - a.avgPercentage);

      return res.status(200).json({ success: true, data: subjectPerformance });
    }
    return res.status(200).json({ success: true, data: [] });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get teacher activity leaderboard
 * @route   GET /api/admin/analytics/teacher-leaderboard
 * @access  Private (Admin)
 */
const getTeacherLeaderboard = async (req, res, next) => {
  try {
    if (getDBStatus() === 'Connected') {
      const teachers = await User.find({ role: 'teacher' }).select('name email createdAt');
      const leaderboard = [];

      for (const t of teachers) {
        const coursesCreated = await Course.countDocuments({ teacher: t._id });
        const teacherCourses = await Course.find({ teacher: t._id }, '_id');
        const courseIds = teacherCourses.map(c => c._id);
        const examsCreated = await Exam.countDocuments({ $or: [{ createdBy: t._id }, { course: { $in: courseIds } }] });
        const teacherExams = await Exam.find({ $or: [{ createdBy: t._id }, { course: { $in: courseIds } }] }, '_id');
        const examIds = teacherExams.map(e => e._id);
        const totalSubmissions = await Attempt.countDocuments({ exam: { $in: examIds }, status: { $in: ['submitted', 'timed-out'] } });

        leaderboard.push({
          teacherId: t._id,
          name: t.name,
          email: t.email,
          coursesCreated,
          examsCreated,
          totalSubmissions,
          activityScore: coursesCreated * 10 + examsCreated * 5 + totalSubmissions,
        });
      }

      leaderboard.sort((a, b) => b.activityScore - a.activityScore);

      return res.status(200).json({ success: true, data: leaderboard });
    }
    return res.status(200).json({ success: true, data: [] });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get peak usage attempts grouped by hour of day (0 to 23)
 * @route   GET /api/admin/analytics/peak-usage
 * @access  Private (Admin)
 */
const getPeakUsageAnalytics = async (req, res, next) => {
  try {
    if (getDBStatus() === 'Connected') {
      const attempts = await Attempt.find({}, 'createdAt startedAt');
      const hourCounts = new Array(24).fill(0);

      attempts.forEach(a => {
        const dt = new Date(a.startedAt || a.createdAt);
        const hour = dt.getHours();
        if (hour >= 0 && hour < 24) {
          hourCounts[hour] += 1;
        }
      });

      const peakUsageData = hourCounts.map((count, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        attempts: count,
      }));

      return res.status(200).json({ success: true, data: peakUsageData });
    }
    return res.status(200).json({ success: true, data: [] });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Force logout a user by invalidating existing JWT tokens
 * @route   PUT /api/admin/users/:id/force-logout
 * @access  Private (Admin)
 */
const forceLogoutUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (getDBStatus() === 'Connected') {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      user.tokenInvalidatedAt = new Date();
      await user.save();

      return res.status(200).json({
        success: true,
        message: `Force logged out ${user.name}. All active sessions for this account have been revoked.`,
        data: user,
      });
    }
    return res.status(400).json({ success: false, message: 'DB disconnected' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Export platform data in CSV format (users, results, courses)
 * @route   GET /api/admin/export/:type
 * @access  Private (Admin)
 */
const exportDataCsv = async (req, res, next) => {
  try {
    const { type } = req.params;

    if (getDBStatus() === 'Connected') {
      if (type === 'users') {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        let csv = 'ID,Name,Email,Role,IsVerified,IsBlocked,TeacherStatus,CreatedAt\n';
        users.forEach(u => {
          csv += `"${u._id}","${u.name}","${u.email}","${u.role}",${u.isVerified},${u.isBlocked},"${u.teacherApprovalStatus || 'approved'}","${u.createdAt}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="export_users.csv"');
        return res.send(csv);
      } else if (type === 'courses') {
        const courses = await Course.find({}).populate('teacher', 'name email');
        let csv = 'ID,Title,EnrollmentCode,TeacherName,TeacherEmail,StudentsCount,IsUnderReview,CreatedAt\n';
        courses.forEach(c => {
          csv += `"${c._id}","${c.title}","${c.enrollmentCode}","${c.teacher?.name || ''}","${c.teacher?.email || ''}",${c.students?.length || 0},${c.isUnderReview},"${c.createdAt}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="export_courses.csv"');
        return res.send(csv);
      } else if (type === 'results') {
        const attempts = await Attempt.find({ status: { $in: ['submitted', 'timed-out'] } })
          .populate('student', 'name email')
          .populate('exam', 'title code totalMarks');
        let csv = 'AttemptID,CandidateName,CandidateEmail,ExamCode,ExamTitle,Score,TotalMarks,IsPassed,Status,SubmittedAt\n';
        attempts.forEach(a => {
          csv += `"${a._id}","${a.student?.name || ''}","${a.student?.email || ''}","${a.exam?.code || ''}","${a.exam?.title || ''}",${a.score || 0},${a.totalMarks || 100},${a.isPassed},"${a.status}","${a.submittedAt || a.createdAt}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="export_results.csv"');
        return res.send(csv);
      }
    }
    return res.status(400).json({ success: false, message: 'Export unavailable or DB disconnected' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
