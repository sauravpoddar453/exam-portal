const Subject = require('../models/Subject');
const Question = require('../models/Question');
const { getDBStatus } = require('../config/db');

// In-memory fallback mock database for subjects when MongoDB is disconnected
const MOCK_SUBJECT_DATABASE = [];

/**
 * @desc    Get all subjects for logged-in user
 * @route   GET /api/subjects
 * @access  Private (Teacher/Admin)
 */
const getSubjects = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    if (getDBStatus() === 'Connected') {
      const subjects = await Subject.find({ createdBy: userId }).sort({ name: 1 });

      // Count questions per subject for this teacher
      const questions = await Question.find({ createdBy: userId });
      const countsMap = {};
      questions.forEach(q => {
        const subName = q.subject || 'General';
        countsMap[subName] = (countsMap[subName] || 0) + 1;
      });

      const data = subjects.map(s => ({
        _id: s._id,
        name: s.name,
        questionCount: countsMap[s.name] || 0,
        createdAt: s.createdAt,
      }));

      // Also ensure standard default subjects are included if not present
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    }

    // Mock DB Fallback
    const userSubjects = MOCK_SUBJECT_DATABASE.filter(s => s.createdBy.toString() === userId.toString());
    return res.status(200).json({
      success: true,
      count: userSubjects.length,
      data: userSubjects,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new subject
 * @route   POST /api/subjects
 * @access  Private (Teacher/Admin)
 */
const createSubject = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user._id || req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject name is required',
      });
    }

    const cleanName = name.trim();

    if (getDBStatus() === 'Connected') {
      // Check case-insensitive duplicate for this teacher
      const existing = await Subject.findOne({
        createdBy: userId,
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Subject "${existing.name}" already exists`,
        });
      }

      const subject = await Subject.create({
        name: cleanName,
        createdBy: userId,
      });

      return res.status(201).json({
        success: true,
        data: subject,
        message: `Subject "${cleanName}" created successfully`,
      });
    }

    // Mock DB Fallback
    const mockDup = MOCK_SUBJECT_DATABASE.find(
      s => s.createdBy.toString() === userId.toString() && s.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (mockDup) {
      return res.status(400).json({
        success: false,
        message: `Subject "${mockDup.name}" already exists`,
      });
    }

    const newMockSubject = {
      _id: `subj-mock-${Date.now()}`,
      name: cleanName,
      createdBy: userId,
      questionCount: 0,
      createdAt: new Date().toISOString(),
    };
    MOCK_SUBJECT_DATABASE.push(newMockSubject);

    return res.status(201).json({
      success: true,
      data: newMockSubject,
      message: `Subject "${cleanName}" created successfully (Mock DB)`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a subject
 * @route   DELETE /api/subjects/:id
 * @access  Private (Teacher/Admin)
 */
const deleteSubject = async (req, res, next) => {
  try {
    const subjectId = req.params.id;
    const userId = req.user._id || req.user.id;
    const force = req.query.force === 'true';

    if (getDBStatus() === 'Connected') {
      const subject = await Subject.findOne({ _id: subjectId, createdBy: userId });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: 'Subject not found or unauthorized',
        });
      }

      // Check if any questions use this subject
      const questionsCount = await Question.countDocuments({
        createdBy: userId,
        subject: subject.name,
      });

      if (questionsCount > 0 && !force) {
        return res.status(400).json({
          success: false,
          requiresConfirmation: true,
          questionsCount,
          subjectName: subject.name,
          message: `Subject "${subject.name}" is currently assigned to ${questionsCount} question(s). Deleting it will reassign these questions to "General".`,
        });
      }

      // If questions exist and force=true, reassign questions to "General"
      if (questionsCount > 0) {
        await Question.updateMany(
          { createdBy: userId, subject: subject.name },
          { $set: { subject: 'General' } }
        );
      }

      await Subject.findByIdAndDelete(subjectId);

      return res.status(200).json({
        success: true,
        message: `Subject "${subject.name}" deleted successfully.${questionsCount > 0 ? ` ${questionsCount} question(s) reassigned to General.` : ''}`,
      });
    }

    // Mock DB Fallback
    const mockIndex = MOCK_SUBJECT_DATABASE.findIndex(
      s => s._id === subjectId && s.createdBy.toString() === userId.toString()
    );
    if (mockIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    const removed = MOCK_SUBJECT_DATABASE.splice(mockIndex, 1)[0];
    return res.status(200).json({
      success: true,
      message: `Subject "${removed.name}" deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubjects,
  createSubject,
  deleteSubject,
};
