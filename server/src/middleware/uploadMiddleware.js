const multer = require('multer');

// Configure multer memory storage
const storage = multer.memoryStorage();

// File filter for PDF (.pdf) and Word (.docx) files
const fileFilter = (req, file, cb) => {
  const name = file.originalname.toLowerCase();
  const isPdf = file.mimetype === 'application/pdf' || name.endsWith('.pdf');
  const isDocx =
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimetype === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc');

  if (isPdf || isDocx) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF (.pdf) and Word (.docx) files are allowed.'), false);
  }
};

const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit
  },
  fileFilter,
});

module.exports = {
  uploadDocument,
  uploadPdf: uploadDocument,
};
