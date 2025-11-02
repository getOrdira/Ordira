import { IMedia } from '../../../models/media/media.model';

export interface MediaUploadOptions {
  allowedTypes?: string[];
  maxFileSize?: number;
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  description?: string;
  tags?: string[];
  resourceId?: string;
  isPublic?: boolean;
  compress?: boolean;
}

export interface MediaListOptions {
  page?: number;
  limit?: number;
  offset?: number;
  type?: 'image' | 'video' | 'gif' | 'document';
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  tags?: string[];
  search?: string;
  isPublic?: boolean;
  sortBy?: 'createdAt' | 'filename' | 'size' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface MediaStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  storageUsed: string;
  averageFileSize?: string;
  largestFile?: {
    filename: string;
    size: string;
    uploadDate: Date;
  };
}

export interface CategoryStats {
  category: string;
  totalFiles: number;
  totalSize: string;
  averageFileSize: string;
  mostRecentUpload?: Date;
  fileTypes: Record<string, number>;
}

export interface BatchUploadResult {
  successful: BatchUploadSuccess[];
  failed: BatchUploadFailure[];
}

export interface BatchUploadSuccess {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  s3Key?: string;
}

export interface BatchUploadFailure {
  filename: string;
  error: string;
}

export interface DownloadResult {
  mimeType: string;
  filename: string;
  fileSize: number;
  stream: NodeJS.ReadableStream;
  signedUrl?: string;
}

export interface MediaLeanDocument {
  _id: any;
  url: string;
  s3Key?: string;
  s3Bucket?: string;
  s3ETag?: string;
  type: 'image' | 'video' | 'gif' | 'document';
  uploadedBy: any;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  resourceId?: string;
  downloadCount?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
  etag?: string;
  location?: string;
}

export interface MediaListResult {
  media: MediaLeanDocument[];
  total: number;
  page: number;
  totalPages: number;
}

export interface MediaSearchResult {
  media: MediaLeanDocument[];
  total: number;
}

export type MediaDocument = IMedia;


