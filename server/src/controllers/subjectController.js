const Subject = require('../models/Subject');
const Question = require('../models/Question');
const { getDBStatus } = require('../config/db');

// In-memory fallback mock DB for subjects when MongoDB is offline
const MOCK_SUBJECTS = [];

/**
 * @desc    Get subjects created by the logged-in user
 * @route   GET /api/subjects
 * @access  Private
 */
const getSubjects = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    if (getDBStatus() === 'Connected') {
      const subjects = await Subject.find({ createdBy: userId }).sort({ name: 1 });
      return res.status(200).json({
        success: true,
        count: subjects.length,
        data: subjects,
      });
    }

    // Mock DB Fallback
    const userSubjects = MOCK_SUBJECTS.filter(s => s.createdBy.toString() === userId.toString());
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
 * @access  Private
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
      try {
        const subject = await Subject.create({
          name: cleanName,
          createdBy: userId,
        });

        return res.status(201).json({
          success: true,
          data: subject,
          message: `Subject "${cleanName}" created successfully`,
        });
      } catch (err) {
        // Handle MongoDB duplicate key error (code 11000)
        if (err.code === 11000) {
          return res.status(400).json({
            success: false,
            message: `Subject "${cleanName}" already exists for your account`,
          });
        }
        throw err;
      }
    }

    // Mock DB Fallback
    const duplicate = MOCK_SUBJECTS.find(
      s => s.createdBy.toString() === userId.toString() && s.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Subject "${cleanName}" already exists for your account`,
      });
    }

    const newMockSubject = {
      _id: `subj-mock-${Date.now()}`,
      name: cleanName,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_SUBJECTS.push(newMockSubject);

    return res.status(201).json({
      success: true,
      data: newMockSubject,
      message: `Subject "${cleanName}" created successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a subject by ID (only if createdBy matches logged-in user)
 * @route   DELETE /api/subjects/:id
 * @access  Private
 */
const deleteSubject = async (req, res, next) => {
  try {
    const subjectId = req.params.id;
    const userId = req.user._id || req.user.id;

    if (getDBStatus() === 'Connected') {
      const subject = await Subject.findOne({ _id: subjectId, createdBy: userId });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: 'Subject not found or unauthorized',
        });
      }

      await Subject.deleteOne({ _id: subjectId });

      return res.status(200).json({
        success: true,
        message: `Subject "${subject.name}" deleted successfully`,
      });
    }

    // Mock DB Fallback
    const index = MOCK_SUBJECTS.findIndex(
      s => s._id === subjectId && s.createdBy.toString() === userId.toString()
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found or unauthorized',
      });
    }

    const [deleted] = MOCK_SUBJECTS.splice(index, 1);

    return res.status(200).json({
      success: true,
      message: `Subject "${deleted.name}" deleted successfully`,
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
