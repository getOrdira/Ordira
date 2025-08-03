// src/services/media.service.ts

import path from 'path';
import { Media, IMedia } from '../models/media.model';

const UPLOAD_URL_PREFIX = process.env.UPLOAD_URL_PREFIX || '/uploads';

/**
 * Save an uploaded media file record.
 * @param file     The multer file object
 * @param uploaderId  ID of the user or business who uploaded
 */
export async function saveMedia(
  file: Express.Multer.File | undefined,
  uploaderId: string
): Promise<IMedia> {
  if (!file) {
    throw { statusCode: 400, message: 'No file provided' };
  }

  // Determine type from MIME
  const mime = file.mimetype;
  const type =
    mime.startsWith('video/') ? 'video'
    : mime === 'image/gif'     ? 'gif'
    : 'image';

  // Build a URL. If you later host on S3/Cloudfront, just change UPLOAD_URL_PREFIX
  const url = `${UPLOAD_URL_PREFIX}/${file.filename}`;

  const media = new Media({
    url,
    type,
    uploadedBy: uploaderId
  });

  return media.save();
}

/**
 * List media uploaded by a given user/business, with optional paging and type filter.
 * @param uploaderId  ID to filter by
 * @param options     Optional pagination & filtering
 */
export async function listMediaByUser(
  uploaderId: string,
  options?: {
    page?: number;
    limit?: number;
    type?: 'image' | 'video' | 'gif';
  }
): Promise<IMedia[]> {
  const page  = options?.page  && options.page > 0 ? options.page : 1;
  const limit = options?.limit && options.limit > 0 && options.limit <= 200 ? options.limit : 50;

  // build filter
  const filter: Record<string, any> = { uploadedBy: uploaderId };
  if (options?.type) filter.type = options.type;

  return Media
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
}
