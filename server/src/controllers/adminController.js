const User = require('../models/User');
const Exam = require('../models/Exam');
const Course = require('../models/Course');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const { getDBStatus } = require('../config/db');
const { sendTeacherApprovalEmail, sendTeacherRejectionEmail } = require('../services/emailService');

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
