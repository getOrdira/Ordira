/**
 * Media Types
 * 
 * Re-exports backend media types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  MediaUploadOptions,
  MediaListOptions,
  MediaStats,
  CategoryStats,
  BatchUploadResult,
  BatchUploadSuccess,
  BatchUploadFailure,
  DownloadResult,
  MediaLeanDocument,
  S3UploadResult,
  MediaListResult,
  MediaSearchResult,
  MediaDocument
} from '@backend/services/media/utils/types';

// Re-export all backend types
export type {
  MediaUploadOptions,
  MediaListOptions,
  MediaStats,
  CategoryStats,
  BatchUploadResult,
  BatchUploadSuccess,
  BatchUploadFailure,
  DownloadResult,
  MediaLeanDocument,
  S3UploadResult,
  MediaListResult,
  MediaSearchResult,
  MediaDocument
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Media display type with enhanced UI fields
 */
export interface MediaDisplay extends MediaLeanDocument {
  _ui?: {
    formattedSize?: string;
    formattedUploadDate?: string;
    relativeTime?: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    downloadUrl?: string;
    isImage?: boolean;
    isVideo?: boolean;
    isDocument?: boolean;
    dimensions?: {
      width?: number;
      height?: number;
    };
  };
}

/**
 * Media upload form data
 */
export interface MediaUploadFormData {
  files: File[];
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  description?: string;
  tags?: string[];
  resourceId?: string;
  isPublic?: boolean;
  compress?: boolean;
  _ui?: {
    validationErrors?: Record<string, string>;
    uploadProgress?: Record<string, number>;
    uploadStatus?: Record<string, 'pending' | 'uploading' | 'success' | 'error'>;
  };
}

/**
 * Media list view options
 */
export interface MediaListViewOptions {
  viewMode?: 'grid' | 'list';
  sortBy?: 'createdAt' | 'filename' | 'size' | 'category';
  sortOrder?: 'asc' | 'desc';
  filters?: MediaListOptions;
  page?: number;
  limit?: number;
}

