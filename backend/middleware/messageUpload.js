const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadPath = path.resolve(process.env.UPLOAD_PATH || './uploads', 'messages');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `message-attachment-${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = new Set([
    '.pdf', '.jpg', '.jpeg', '.png',
    '.txt', '.csv', '.json', '.zip',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  ]);
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.has(ext)) {
    return cb(new Error('Unsupported attachment type.'));
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024 },
});

module.exports = upload;
