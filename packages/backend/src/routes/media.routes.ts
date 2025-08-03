// src/routes/media.routes.ts
import { Router } from 'express';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { uploadMedia, listMedia } from '../controllers/media.controller';

const router = Router();

// Upload a single media file
router.post(
  '/upload',
  uploadMiddleware.single('file'),
  uploadMedia
);

// List all media for the authenticated business
router.get(
  '/',
  listMedia
);

export default router;
