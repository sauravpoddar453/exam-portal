const Question = require('../models/Question');
const Subject = require('../models/Subject');
const { getDBStatus } = require('../config/db');

// In-memory mock database for fallback testing when MongoDB is disconnected
const MOCK_QUESTION_DATABASE = [
  {
    _id: '650000000000000000000301',
    questionText: 'What is the time complexity of searching an element in a balanced Binary Search Tree (BST)?',
    type: 'mcq-single',
    options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
    correctAnswer: 'O(log N)',
    marks: 2,
    negativeMarks: 0.5,
    difficulty: 'medium',
    subject: 'Computer Science',
    tags: ['Algorithms', 'Trees'],
    createdBy: '650000000000000000000002',
    createdAt: new Date().toISOString(),
  },
  {
    _id: '650000000000000000000302',
    questionText: 'Which of the following are valid React hook functions? (Select all that apply)',
    type: 'mcq-multiple',
    options: ['useState', 'useFormState', 'useEffect', 'useRender'],
    correctAnswer: ['useState', 'useEffect'],
    marks: 4,
    negativeMarks: 1,
    difficulty: 'easy',
    subject: 'Web Development',
    tags: ['React', 'Frontend'],
    createdBy: '650000000000000000000002',
    createdAt: new Date().toISOString(),
  },
  {
    _id: '650000000000000000000303',
    questionText: 'In MongoDB, collections are equivalent to tables in relational databases.',
    type: 'true-false',
    options: ['True', 'False'],
    correctAnswer: 'True',
    marks: 1,
    negativeMarks: 0,
    difficulty: 'easy',
    subject: 'Database Systems',
    tags: ['NoSQL', 'MongoDB'],
    createdBy: '650000000000000000000002',
    createdAt: new Date().toISOString(),
  },
  {
    _id: '650000000000000000000304',
    questionText: 'What HTTP status code represents "Internal Server Error"?',
    type: 'short-answer',
    options: [],
    correctAnswer: '500',
    marks: 2,
    negativeMarks: 0,
    difficulty: 'easy',
    subject: 'Web Development',
    tags: ['HTTP', 'REST'],
    createdBy: '650000000000000000000001',
    createdAt: new Date().toISOString(),
  },
  {
    _id: '650000000000000000000305',
    questionText: 'Explain the difference between SQL and NoSQL databases in terms of schema flexibility and scalability.',
    type: 'essay',
    options: [],
    correctAnswer: 'SQL databases are relational, structured, and use fixed schemas. NoSQL databases are non-relational, document/key-value based, and dynamically scalable.',
    marks: 10,
    negativeMarks: 0,
    difficulty: 'hard',
    subject: 'Database Systems',
    tags: ['Architecture', 'DBMS'],
    createdBy: '650000000000000000000002',
    createdAt: new Date().toISOString(),
  },
];

/**
 * @desc    Get all questions (with filters)
 * @route   GET /api/questions
 * @access  Private (Admin, Teacher)
 */
const getQuestions = async (req, res, next) => {
  try {
    const { subject, difficulty, type, search } = req.query;

    if (getDBStatus() === 'Connected') {
      let query = {};

      if (subject && subject !== 'All') {
        query.subject = subject;
      }

      if (difficulty && difficulty !== 'All') {
        query.difficulty = difficulty;
      }

      if (type && type !== 'All') {
        query.type = type;
      }

      if (search) {
        query.questionText = { $regex: search, $options: 'i' };
      }

      const questions = await Question.find(query).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: questions.length,
        source: 'database',
        data: questions,
      });
    }

    // Mock fallback when DB is disconnected
    let filtered = [...MOCK_QUESTION_DATABASE];

    if (subject && subject !== 'All') {
      filtered = filtered.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
    }

    if (difficulty && difficulty !== 'All') {
      filtered = filtered.filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    if (type && type !== 'All') {
      filtered = filtered.filter(q => q.type.toLowerCase() === type.toLowerCase());
    }

    if (search) {
      filtered = filtered.filter(q => q.questionText.toLowerCase().includes(search.toLowerCase()));
    }

    return res.status(200).json({
      success: true,
      count: filtered.length,
      source: 'mock',
      notice: 'MongoDB is disconnected. Returning mock questions.',
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single question by ID
 * @route   GET /api/questions/:id
 * @access  Private (Admin, Teacher)
 */
const getQuestionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (getDBStatus() === 'Connected') {
      const question = await Question.findById(id);
      if (!question) {
        return res.status(404).json({ success: false, message: 'Question not found' });
      }
      return res.status(200).json({ success: true, data: question });
    }

    const mockQuestion = MOCK_QUESTION_DATABASE.find(q => q._id === id);
    if (!mockQuestion) {
      return res.status(404).json({ success: false, message: 'Question not found in mock store' });
    }
    return res.status(200).json({ success: true, data: mockQuestion });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new question
 * @route   POST /api/questions
 * @access  Private (Admin, Teacher)
 */
const createQuestion = async (req, res, next) => {
  try {
    const {
      questionText,
      type,
      options,
      correctAnswer,
      marks,
      negativeMarks,
      difficulty,
      subject,
      tags,
      explanation,
    } = req.body;

    if (!questionText || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Question text and subject are required.',
      });
    }

    if (getDBStatus() === 'Connected') {
      const cleanSubj = (subject || 'General').trim();
      if (req.user && cleanSubj && cleanSubj.toLowerCase() !== 'general') {
        const existingSubj = await Subject.findOne({
          createdBy: req.user._id,
          name: { $regex: new RegExp(`^${cleanSubj}$`, 'i') },
        });
        if (!existingSubj) {
          await Subject.create({ name: cleanSubj, createdBy: req.user._id }).catch(() => {});
        }
      }

      const question = await Question.create({
        questionText,
        type: type || 'mcq-single',
        options: options || [],
        correctAnswer: correctAnswer || '',
        marks: marks !== undefined ? Number(marks) : 1,
        negativeMarks: negativeMarks !== undefined ? Number(negativeMarks) : 0,
        difficulty: difficulty || 'medium',
        subject: cleanSubj,
        tags: tags || [],
        explanation: explanation || '',
        createdBy: req.user ? req.user._id : null,
      });

      return res.status(201).json({
        success: true,
        message: 'Question created successfully.',
        data: question,
      });
    }

    // Mock fallback when DB is disconnected
    const newMockQuestion = {
      _id: `q-mock-${Date.now()}`,
      questionText,
      type: type || 'mcq-single',
      options: options || [],
      correctAnswer: correctAnswer || '',
      marks: marks !== undefined ? Number(marks) : 1,
      negativeMarks: negativeMarks !== undefined ? Number(negativeMarks) : 0,
      difficulty: difficulty || 'medium',
      subject: subject || 'General',
      tags: tags || [],
      createdBy: req.user ? (req.user._id || req.user.id) : null,
      createdAt: new Date().toISOString(),
    };

    MOCK_QUESTION_DATABASE.unshift(newMockQuestion);

    return res.status(201).json({
      success: true,
      message: 'Question created (Mock DB).',
      data: newMockQuestion,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing question
 * @route   PUT /api/questions/:id
 * @access  Private (Admin, Teacher)
 */
const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (getDBStatus() === 'Connected') {
      let question = await Question.findById(id);
      if (!question) {
        return res.status(404).json({ success: false, message: 'Question not found' });
      }

      question = await Question.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });

      return res.status(200).json({
        success: true,
        message: 'Question updated successfully.',
        data: question,
      });
    }

    // Mock fallback
    const index = MOCK_QUESTION_DATABASE.findIndex(q => q._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Question not found in mock store' });
    }

    MOCK_QUESTION_DATABASE[index] = {
      ...MOCK_QUESTION_DATABASE[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      message: 'Question updated (Mock DB).',
      data: MOCK_QUESTION_DATABASE[index],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a question
 * @route   DELETE /api/questions/:id
 * @access  Private (Admin, Teacher)
 */
const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (getDBStatus() === 'Connected') {
      const question = await Question.findById(id);
      if (!question) {
        return res.status(404).json({ success: false, message: 'Question not found' });
      }

      await question.deleteOne();

      return res.status(200).json({
        success: true,
        message: 'Question deleted successfully.',
      });
    }

    // Mock fallback
    const index = MOCK_QUESTION_DATABASE.findIndex(q => q._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Question not found in mock store' });
    }

    MOCK_QUESTION_DATABASE.splice(index, 1);

    return res.status(200).json({
      success: true,
      message: 'Question deleted (Mock DB).',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk upload questions (Array of items parsed from CSV)
 * @route   POST /api/questions/bulk
 * @access  Private (Admin, Teacher)
 */
const bulkUploadQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty array of questions for bulk upload.',
      });
    }

    // Format & validate each item
    const formattedQuestions = questions.map((item) => ({
      questionText: item.questionText || item.question || 'Untitled Question',
      type: item.type || 'mcq-single',
      options: Array.isArray(item.options)
        ? item.options
        : typeof item.options === 'string'
        ? item.options.split('|').map(s => s.trim())
        : [],
      correctAnswer: item.correctAnswer || '',
      marks: Number(item.marks) || 1,
      negativeMarks: Number(item.negativeMarks) || 0,
      difficulty: item.difficulty || 'medium',
      subject: item.subject || 'General',
      explanation: item.explanation || '',
      createdBy: req.user ? req.user._id : null,
    }));

    if (getDBStatus() === 'Connected') {
      if (req.user) {
        const uniqueSubjs = [...new Set(formattedQuestions.map(q => (q.subject || 'General').trim()).filter(s => s && s.toLowerCase() !== 'general'))];
        for (const subName of uniqueSubjs) {
          const existingSub = await Subject.findOne({
            createdBy: req.user._id,
            name: { $regex: new RegExp(`^${subName}$`, 'i') },
          });
          if (!existingSub) {
            await Subject.create({ name: subName, createdBy: req.user._id }).catch(() => {});
          }
        }
      }

      const inserted = await Question.insertMany(formattedQuestions);
      return res.status(201).json({
        success: true,
        count: inserted.length,
        message: `Successfully bulk uploaded ${inserted.length} questions.`,
        data: inserted,
      });
    }

    // Mock fallback
    const mockInserted = formattedQuestions.map((q, idx) => ({
      _id: `q-mock-bulk-${Date.now()}-${idx}`,
      ...q,
      createdAt: new Date().toISOString(),
    }));

    MOCK_QUESTION_DATABASE.unshift(...mockInserted);

    return res.status(201).json({
      success: true,
      count: mockInserted.length,
      message: `Bulk uploaded ${mockInserted.length} questions (Mock DB).`,
      data: mockInserted,
    });
  } catch (error) {
    next(error);
  }
};

const PDFDocument = require('pdfkit');
const { parseDocumentQuestions } = require('../services/pdfParserService');

/**
 * @desc    Extract and parse questions from PDF or Word (.docx) file upload
 * @route   POST /api/questions/import-document (also POST /api/questions/import-pdf)
 * @access  Private (Admin, Teacher)
 */
const importDocumentQuestions = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a valid PDF (.pdf) or Word (.docx) file.',
      });
    }

    const result = await parseDocumentQuestions(
      req.file.buffer,
      req.file.originalname || '',
      req.file.mimetype || ''
    );

    return res.status(200).json({
      success: true,
      count: result.totalParsed,
      parseMethod: result.parseMethod,
      documentType: result.documentType,
      message: `Extracted ${result.totalParsed} question(s) from ${result.documentType.toUpperCase()} document.`,
      data: result.questions,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Download Fixed Template file for PDF / Word question creation
 * @route   GET /api/questions/template (and /api/questions/pdf-template)
 * @access  Public / Private
 */
const downloadDocumentTemplate = (req, res) => {
  const format = (req.query.format || 'txt').toLowerCase();

  const templateContent = `EXAM PORTAL - FIXED QUESTION TEMPLATE FORMAT
==================================================
Instructions:
1. Use '---' (three dashes) on a new line to separate questions.
2. Mandatory markers: Q:, TYPE:, ANSWER: (and choices A), B), C), D) for MCQ).
3. TYPE options: MCQ, TRUEFALSE, SHORTANSWER.
4. Optional markers: MARKS:, NEGATIVE:, DIFFICULTY:, TOPIC:, EXPLANATION:

--------------------------------------------------
SAMPLES / TEMPLATE COPY:

Q: What is the time complexity of binary search?
TYPE: MCQ
A) O(n)
B) O(log n)
C) O(n^2)
D) O(1)
ANSWER: B
MARKS: 2
NEGATIVE: 0.5
DIFFICULTY: medium
TOPIC: Algorithms
EXPLANATION: Binary search divides the search interval in half at each step.
---
Q: The sky is blue.
TYPE: TRUEFALSE
ANSWER: TRUE
MARKS: 1
---
Q: Explain the concept of recursion.
TYPE: SHORTANSWER
MARKS: 5
EXPLANATION: Recursion occurs when a function calls itself.
`;

  if (format === 'pdf') {
    try {
      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Question_Import_Template.pdf"');
      doc.pipe(res);

      doc.fontSize(16).fillColor('#dc2626').text('EXAM PORTAL - FIXED QUESTION TEMPLATE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#374151').text('Instructions:', { underline: true });
      doc.fontSize(9).fillColor('#4b5563')
         .text('1. Use "---" (three dashes) on a new line to separate questions.')
         .text('2. Mandatory markers: Q:, TYPE:, ANSWER: (and choices A), B), C), D) for MCQ).')
         .text('3. Supported TYPEs: MCQ, TRUEFALSE, SHORTANSWER.')
         .text('4. Optional markers: MARKS:, NEGATIVE:, DIFFICULTY:, TOPIC:, EXPLANATION:')
         .moveDown(1);

      doc.fontSize(10).fillColor('#111827').text('TEMPLATE EXAMPLES:', { underline: true }).moveDown(0.5);
      doc.font('Courier').fontSize(9).fillColor('#1e293b').text(templateContent);
      doc.end();
      return;
    } catch (err) {
      console.error('[downloadDocumentTemplate] PDFKit error:', err);
    }
  } else if (format === 'docx' || format === 'doc') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="Question_Import_Template.docx"');
    return res.send(Buffer.from(templateContent, 'utf-8'));
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="Question_Import_Template.txt"');
  return res.send(templateContent);
};

module.exports = {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  importDocumentQuestions,
  importPdfQuestions: importDocumentQuestions,
  downloadDocumentTemplate,
  downloadPdfTemplate: downloadDocumentTemplate,
};
