/**
 * Helper utilities for media operations
 */

/**
 * Determine media type from MIME type
 */
export function determineMediaType(mimeType: string): 'image' | 'video' | 'gif' | 'document' {
  if (!mimeType) return 'document';

  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  if (bytes < 0) return 'Invalid size';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate cache keys for media operations
 */
export const CacheKeys = {
  media: (mediaId: string, uploaderId?: string) => 
    `media:${mediaId}:${uploaderId || 'public'}`,
  
  mediaList: (uploaderId: string, options: any) => 
    `media_list:${uploaderId}:${JSON.stringify(options)}`,
  
  mediaSearch: (uploaderId: string, query: string, options: any) => 
    `media_search:${uploaderId}:${query}:${JSON.stringify(options)}`,
  
  mediaCategory: (uploaderId: string, category: string) => 
    `media_category:${uploaderId}:${category}`,
  
  storageStats: (uploaderId: string) => 
    `storage_stats:${uploaderId}`,
  
  recentMedia: (uploaderId: string, limit: number) => 
    `recent_media:${uploaderId}:${limit}`
};

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Validate input strings
 */
export function validateString(value: string | undefined, fieldName: string): { valid: boolean; error?: string } {
  if (!value?.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

