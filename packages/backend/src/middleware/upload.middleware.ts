// src/middlewares/upload.middleware.ts
import multer from 'multer';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const uploadPath = path.resolve(__dirname, '../../', UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPath),
  filename:   (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

function fileFilter(
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  // only allow images, gifs and videos
  const allowed = ['image/', 'video/'];
  if (allowed.some(type => file.mimetype.startsWith(type))) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'));
  }
}

export const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 15 * 1024 * 1024  // 15 MB limit
    }
  });
