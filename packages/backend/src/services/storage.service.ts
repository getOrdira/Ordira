// src/services/storage.service.ts

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// This should match what you used in index.ts for express.static('/uploads')
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

/**
 * Writes the given metadata JSON to a file under /uploads/{businessId}/{resourceId}/
 * and returns the public URL where it can be fetched.
 */
export async function uploadJsonToStorage(
  businessId: string,
  resourceId: string,
  metadata: any
): Promise<string> {
  // Resolve to e.g. /path/to/packages/backend/uploads/{businessId}/{resourceId}
  const targetDir = path.resolve(__dirname, '../../', UPLOAD_DIR, businessId, resourceId);
  await fs.mkdir(targetDir, { recursive: true });

  // Write a file like 3f2a1b4c-....json
  const fileName = `${uuidv4()}.json`;
  const filePath = path.join(targetDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf-8');

  // Return the URL path; Express will serve this under /uploads
  return `/uploads/${businessId}/${resourceId}/${fileName}`;
}
