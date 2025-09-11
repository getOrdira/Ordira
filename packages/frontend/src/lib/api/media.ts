// src/lib/api/media.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/errors'; // Shared error type from common types

export interface Media {
  _id: string;
  business: string; // Types.ObjectId as string
  url: string; // Stored URL (S3 or local path)
  type: 'image' | 'video' | 'pdf' | 'other'; // Assumed enum from model
  mimeType: string; // e.g., 'image/jpeg'
  size: number; // File size in bytes
  originalName: string;
  metadata?: any; // e.g., { width: number, height: number } for images
  uploadedAt: Date;
  uploadedBy?: string; // Types.ObjectId as string
  createdAt: Date;
  updatedAt: Date;
}

// Response interfaces matching backend structure
export interface MediaListResponse {
  success: boolean;
  message: string;
  data: {
    media: Media[];
    total: number;
    pagination?: {
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface MediaDetailsResponse {
  success: boolean;
  message: string;
  data: {
    media: Media;
    analytics?: any;
    relatedMedia?: Media[];
  };
}

export interface MediaUploadResponse {
  success: boolean;
  message: string;
  data: {
    media: Media;
    uploadedAt: string;
  };
}

export interface StorageAnalytics {
  totalSize: number;
  usedStorage: number;
  availableStorage: number;
  fileCount: number;
  breakdown: {
    images: number;
    videos: number;
    documents: number;
    other: number;
  };
}

/**
 * Fetches list of media for the business with filtering and pagination.
 * @param params - Optional query parameters
 * @returns Promise<MediaListResponse>
 */
export const getMediaList = async (params?: {
  business?: string;
  type?: 'image' | 'video' | 'pdf' | 'other';
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  page?: number;
  limit?: number;
  sortBy?: string;
}): Promise<MediaListResponse> => {
  try {
    const response = await apiClient.get<MediaListResponse>('/api/media', {
      params,
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch media list', 500);
  }
};

/**
 * Fetches a single media by ID with detailed information.
 * @param id - Media ID
 * @returns Promise<MediaDetailsResponse>
 */
export const getMedia = async (id: string): Promise<MediaDetailsResponse> => {
  try {
    const response = await apiClient.get<MediaDetailsResponse>(`/api/media/${id}`);
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch media', 500);
  }
};

/**
 * Gets media metadata.
 * @param id - Media ID
 * @param includeAnalytics - Whether to include analytics
 * @returns Promise<any>
 */
export const getMediaMetadata = async (id: string, includeAnalytics?: boolean): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/media/${id}/metadata`, {
      params: { includeAnalytics },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch media metadata', 500);
  }
};

/**
 * Gets media analytics.
 * @param id - Media ID
 * @param params - Analytics parameters
 * @returns Promise<any>
 */
export const getMediaAnalytics = async (id: string, params?: {
  startDate?: string;
  endDate?: string;
  breakdown?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/media/${id}/analytics`, {
      params,
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch media analytics', 500);
  }
};

/**
 * Uploads new media.
 * @param file - File to upload
 * @param metadata - Optional metadata
 * @returns Promise<MediaUploadResponse>
 */
export const uploadMedia = async (file: File, metadata?: any): Promise<MediaUploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await apiClient.post<MediaUploadResponse>('/api/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to upload media', 500);
  }
};

/**
 * Uploads multiple media files.
 * @param files - Files to upload
 * @param metadata - Optional metadata
 * @returns Promise<MediaUploadResponse>
 */
export const uploadMultipleMedia = async (files: File[], metadata?: any): Promise<MediaUploadResponse> => {
  try {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await apiClient.post<MediaUploadResponse>('/api/media/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to upload multiple media', 500);
  }
};

/**
 * Updates media metadata.
 * @param id - Media ID
 * @param data - Updated metadata
 * @returns Promise<Media>
 */
export const updateMediaMetadata = async (id: string, data: Partial<Media>): Promise<Media> => {
  try {
    const response = await apiClient.put<{success: boolean; data: {media: Media}}>(`/api/media/${id}`, data);
    return response.data.media;
  } catch (error) {
    throw new ApiError('Failed to update media metadata', 500);
  }
};

/**
 * Updates media title only.
 * @param id - Media ID
 * @param title - New title
 * @returns Promise<Media>
 */
export const updateMediaTitle = async (id: string, title: string): Promise<Media> => {
  try {
    const response = await apiClient.patch<{success: boolean; data: {media: Media}}>(`/api/media/${id}/update/title`, { title });
    return response.data.media;
  } catch (error) {
    throw new ApiError('Failed to update media title', 500);
  }
};

/**
 * Updates media description only.
 * @param id - Media ID
 * @param description - New description
 * @returns Promise<Media>
 */
export const updateMediaDescription = async (id: string, description: string): Promise<Media> => {
  try {
    const response = await apiClient.patch<{success: boolean; data: {media: Media}}>(`/api/media/${id}/update/description`, { description });
    return response.data.media;
  } catch (error) {
    throw new ApiError('Failed to update media description', 500);
  }
};

/**
 * Updates media tags.
 * @param id - Media ID
 * @param tags - New tags array
 * @returns Promise<Media>
 */
export const updateMediaTags = async (id: string, tags: string[]): Promise<Media> => {
  try {
    const response = await apiClient.patch<{success: boolean; data: {media: Media}}>(`/api/media/${id}/update/tags`, { tags });
    return response.data.media;
  } catch (error) {
    throw new ApiError('Failed to update media tags', 500);
  }
};

/**
 * Adds tags to media.
 * @param id - Media ID
 * @param tags - Tags to add
 * @returns Promise<Media>
 */
export const addMediaTags = async (id: string, tags: string[]): Promise<Media> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {media: Media}}>(`/api/media/${id}/update/tags/add`, { tags });
    return response.data.media;
  } catch (error) {
    throw new ApiError('Failed to add media tags', 500);
  }
};

/**
 * Removes tags from media.
 * @param id - Media ID
 * @param tags - Tags to remove
 * @returns Promise<Media>
 */
export const removeMediaTags = async (id: string, tags: string[]): Promise<Media> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {media: Media}}>(`/api/media/${id}/update/tags/remove`, { tags });
    return response.data.media;
  } catch (error) {
    throw new ApiError('Failed to remove media tags', 500);
  }
};

/**
 * Updates media category.
 * @param id - Media ID
 * @param category - New category
 * @returns Promise<Media>
 */
export const updateMediaCategory = async (id: string, category: 'profile' | 'product' | 'banner' | 'certificate' | 'document'): Promise<Media> => {
  try {
    const response = await apiClient.patch<{success: boolean; data: {media: Media}}>(`/api/media/${id}/update/category`, { category });
    return response.data.media;
  } catch (error) {
    throw new ApiError('Failed to update media category', 500);
  }
};

/**
 * Updates media visibility.
 * @param id - Media ID
 * @param isPublic - Whether media is public
 * @returns Promise<Media>
 */
export const updateMediaVisibility = async (id: string, isPublic: boolean): Promise<Media> => {
  try {
    const response = await apiClient.patch<{success: boolean; data: {media: Media}}>(`/api/media/${id}/update/visibility`, { isPublic });
    return response.data.media;
  } catch (error) {
    throw new ApiError('Failed to update media visibility', 500);
  }
};

/**
 * Fetches media by category.
 * @param category - Media category
 * @param params - Optional parameters
 * @returns Promise<MediaListResponse>
 */
export const getMediaByCategory = async (
  category: 'profile' | 'product' | 'banner' | 'certificate' | 'document',
  params?: { limit?: number; sortBy?: string }
): Promise<MediaListResponse> => {
  try {
    const response = await apiClient.get<MediaListResponse>(`/api/media/category/${category}`, {
      params,
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch media by category', 500);
  }
};

/**
 * Downloads a media file.
 * @param id - Media ID
 * @returns Promise<Blob>
 */
export const downloadMedia = async (id: string): Promise<Blob> => {
  try {
    const response = await apiClient.get<Blob>(`/api/media/${id}/download`, {
      responseType: 'blob',
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to download media', 500);
  }
};

/**
 * Searches for media.
 * @param query - Search query
 * @param filters - Search filters
 * @returns Promise<MediaListResponse>
 */
export const searchMedia = async (
  query: string,
  filters?: {
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    type?: 'image' | 'video' | 'pdf' | 'other';
    limit?: number;
  }
): Promise<MediaListResponse> => {
  try {
    const response = await apiClient.get<MediaListResponse>('/api/media/search', {
      params: {
        q: query,
        ...filters,
      },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to search media', 500);
  }
};

/**
 * Fetches recent uploads.
 * @param limit - Number of recent items to fetch
 * @returns Promise<MediaListResponse>
 */
export const getRecentMedia = async (limit?: number): Promise<MediaListResponse> => {
  try {
    const response = await apiClient.get<MediaListResponse>('/api/media/recent', {
      params: { limit },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch recent media', 500);
  }
};

/**
 * Gets storage analytics.
 * @returns Promise<StorageAnalytics>
 */
export const getStorageAnalytics = async (): Promise<StorageAnalytics> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {storage: StorageAnalytics}}>('/api/media/analytics/storage');
    return response.data.storage;
  } catch (error) {
    throw new ApiError('Failed to fetch storage analytics', 500);
  }
};

/**
 * Deletes a media by ID.
 * @param id - Media ID
 * @returns Promise<{ success: boolean }>
 */
export const deleteMedia = async (id: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: {deleted: boolean; mediaId: string}}>(`/api/media/${id}`);
    return { success: response.success };
  } catch (error) {
    throw new ApiError('Failed to delete media', 500);
  }
};

/**
 * Bulk deletes multiple media files.
 * @param mediaIds - Array of media IDs to delete
 * @returns Promise<{ success: boolean; deleted: number; failed: number }>
 */
export const bulkDeleteMedia = async (mediaIds: string[]): Promise<{ success: boolean; deleted: number; failed: number }> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: {deleted: number; failed: number}}>('/api/media/bulk', {
      data: { mediaIds },
    });
    return {
      success: response.success,
      deleted: response.data.deleted,
      failed: response.data.failed,
    };
  } catch (error) {
    throw new ApiError('Failed to bulk delete media', 500);
  }
};