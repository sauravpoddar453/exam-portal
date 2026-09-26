const Exam = require('../models/Exam');
const User = require('../models/User');
const { getDBStatus } = require('../config/db');
const { sendExamReminderEmail } = require('./emailService');

/**
 * Check for upcoming exams starting in ~30 minutes and notify students
 */
const checkUpcomingExamsAndSendReminders = async () => {
  try {
    if (getDBStatus() !== 'Connected') {
      return;
    }

    const now = new Date();
    // Range: 25 mins to 35 mins from now
    const lowerWindow = new Date(now.getTime() + 25 * 60 * 1000);
    const upperWindow = new Date(now.getTime() + 35 * 60 * 1000);

    const upcomingExams = await Exam.find({
      startTime: { $gte: lowerWindow, $lte: upperWindow },
      reminderSent: { $ne: true },
    });

    if (upcomingExams.length === 0) {
      return;
    }

    console.log(`[ReminderScheduler] Found ${upcomingExams.length} upcoming exam(s) due for 30-min reminder.`);

    const students = await User.find({ role: 'student', isBlocked: false });

    for (const exam of upcomingExams) {
      for (const student of students) {
        if (student.email) {
          await sendExamReminderEmail({
            toEmail: student.email,
            studentName: student.name,
            examTitle: exam.title,
            examCode: exam.code,
            startTime: exam.startTime,
            durationMinutes: exam.durationMinutes,
          });
        }
      }

      exam.reminderSent = true;
      await exam.save();
      console.log(`[ReminderScheduler] Marked reminderSent=true for exam "${exam.title}" (${exam.code})`);
    }
  } catch (err) {
    console.error('[ReminderScheduler] Error running background reminder check:', err.message);
  }
};

/**
 * Initialize 5-minute recurring timer
 */
const initReminderScheduler = () => {
  console.log('[ReminderScheduler] Initialized 30-min pre-exam reminder background scheduler (5m polling interval).');
  // Initial check
  checkUpcomingExamsAndSendReminders();
  // Poll every 5 minutes
  setInterval(checkUpcomingExamsAndSendReminders, 5 * 60 * 1000);
};

module.exports = {
  initReminderScheduler,
  checkUpcomingExamsAndSendReminders,
};
