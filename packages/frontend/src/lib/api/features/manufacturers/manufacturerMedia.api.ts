import { api, manufacturerApi } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  FileUploadOptions,
  UploadedFile,
  QRCodeOptions,
  QRCodeResult,
  MediaGallery,
  BrandAssets,
  MediaAnalytics,
  ImageProcessingOptions
} from '@/lib/types/features/manufacturers';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalArray,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString,
  sanitizeOptionalBoolean,
  sanitizeArray
} from '@/lib/validation/sanitizers/primitives';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

const BASE_PATH = '/media';

const createMediaLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'manufacturers',
  module: 'media',
  method,
  endpoint,
  ...context
});

const buildMediaPath = (manufacturerId: string, suffix: string = '') => {
  const sanitizedId = sanitizeObjectId(manufacturerId, 'manufacturerId');
  return `${BASE_PATH}/${sanitizedId}${suffix}`;
};

const appendUploadOptionsToFormData = (formData: FormData, options?: FileUploadOptions) => {
  if (!options) {
    return;
  }

  if (options.allowedTypes) {
    const sanitizedTypes = sanitizeOptionalArray(
      options.allowedTypes,
      'allowedTypes',
      (type, index) =>
        sanitizeString(type, `allowedTypes[${index}]`, {
          maxLength: 50
        }),
      { maxLength: 10 }
    );
    sanitizedTypes?.forEach((type) => formData.append('allowedTypes[]', type));
  }

  if (options.maxSizeInMB !== undefined) {
    const maxSize = sanitizeOptionalNumber(options.maxSizeInMB, 'maxSizeInMB', {
      min: 1,
      max: 100,
      integer: true
    });
    if (maxSize !== undefined) {
      formData.append('maxSizeInMB', String(maxSize));
    }
  }

  if (options.destination) {
    formData.append(
      'destination',
      sanitizeString(options.destination, 'destination', { maxLength: 200 })
    );
  }

  if (options.generateThumbnail !== undefined) {
    formData.append(
      'generateThumbnail',
      String(sanitizeOptionalBoolean(options.generateThumbnail, 'generateThumbnail') ?? false)
    );
  }

  if (options.watermark !== undefined) {
    formData.append(
      'watermark',
      String(sanitizeOptionalBoolean(options.watermark, 'watermark') ?? false)
    );
  }
};

const sanitizeImageProcessingOptions = (options: ImageProcessingOptions) => {
  const sanitizedOptions = {
    resize: options.resize
      ? baseApi.sanitizeRequestData({
          width: sanitizeOptionalNumber(options.resize.width, 'resize.width', {
            min: 1,
            max: 5000,
            integer: true
          }),
          height: sanitizeOptionalNumber(options.resize.height, 'resize.height', {
            min: 1,
            max: 5000,
            integer: true
          }),
          fit: sanitizeOptionalString(options.resize.fit, 'resize.fit', {
            allowedValues: ['cover', 'contain', 'fill'] as const
          })
        })
      : undefined,
    quality: sanitizeOptionalNumber(options.quality, 'quality', { min: 1, max: 100, integer: true }),
    format: sanitizeOptionalString(options.format, 'format', {
      allowedValues: ['jpeg', 'png', 'webp', 'avif'] as const
    }),
    watermark: options.watermark
      ? baseApi.sanitizeRequestData({
          text: sanitizeOptionalString(options.watermark.text, 'watermark.text', { maxLength: 200 }),
          image: sanitizeOptionalString(options.watermark.image, 'watermark.image', { maxLength: 200 }),
          position: sanitizeOptionalString(options.watermark.position, 'watermark.position', {
            allowedValues: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as const
          }),
          opacity: sanitizeOptionalNumber(options.watermark.opacity, 'watermark.opacity', {
            min: 0,
            max: 1
          })
        })
      : undefined,
    filters: options.filters
      ? baseApi.sanitizeRequestData({
          blur: sanitizeOptionalNumber(options.filters.blur, 'filters.blur', { min: 0, max: 10 }),
          sharpen: sanitizeOptionalNumber(options.filters.sharpen, 'filters.sharpen', { min: 0, max: 10 }),
          brightness: sanitizeOptionalNumber(options.filters.brightness, 'filters.brightness', {
            min: -1,
            max: 1
          }),
          contrast: sanitizeOptionalNumber(options.filters.contrast, 'filters.contrast', {
            min: -1,
            max: 1
          }),
          saturation: sanitizeOptionalNumber(options.filters.saturation, 'filters.saturation', {
            min: -1,
            max: 1
          })
        })
      : undefined
  };

  return baseApi.sanitizeRequestData(sanitizedOptions);
};

const sanitizeQrCodeOptions = (options: QRCodeOptions = {}) => {
  return baseApi.sanitizeRequestData({
    format: sanitizeOptionalString(options.format, 'format', {
      allowedValues: ['png', 'svg', 'pdf'] as const
    }),
    size: sanitizeOptionalString(options.size, 'size', {
      allowedValues: ['small', 'medium', 'large', 'custom'] as const
    }),
    customSize: sanitizeOptionalNumber(options.customSize, 'customSize', { min: 50, max: 2000, integer: true }),
    errorCorrectionLevel: sanitizeOptionalString(
      options.errorCorrectionLevel,
      'errorCorrectionLevel',
      { allowedValues: ['L', 'M', 'Q', 'H'] as const }
    ),
    margin: sanitizeOptionalNumber(options.margin, 'margin', { min: 0, max: 10, integer: true }),
    color: options.color
      ? baseApi.sanitizeRequestData({
          dark: sanitizeOptionalString(options.color.dark, 'color.dark', { maxLength: 7 }),
          light: sanitizeOptionalString(options.color.light, 'color.light', { maxLength: 7 })
        })
      : undefined,
    logo: options.logo
      ? baseApi.sanitizeRequestData({
          path: sanitizeString(options.logo.path, 'logo.path', { maxLength: 500 }),
          size: sanitizeOptionalNumber(options.logo.size, 'logo.size', { min: 1, max: 100, integer: true })
        })
      : undefined
  });
};

const sanitizeGalleryPayload = (payload: {
  name: string;
  fileIds: string[];
  description?: string;
  isPublic?: boolean;
  tags?: string[];
  coverImageId?: string;
}) => {
  const sanitizedFileIds = sanitizeArray(
    payload.fileIds,
    'fileIds',
    (id, index) => sanitizeObjectId(id as string, `fileIds[${index}]`),
    { minLength: 1, maxLength: 100 }
  );

  const sanitizedTags = sanitizeOptionalArray(
    payload.tags,
    'tags',
    (tag, index) =>
      sanitizeString(tag, `tags[${index}]`, {
        maxLength: 100
      }),
    { maxLength: 50 }
  );

  return baseApi.sanitizeRequestData({
    name: sanitizeString(payload.name, 'name', { maxLength: 200 }),
    fileIds: sanitizedFileIds,
    description: sanitizeOptionalString(payload.description, 'description', { maxLength: 2000 }),
    isPublic: sanitizeOptionalBoolean(payload.isPublic, 'isPublic'),
    tags: sanitizedTags,
    coverImageId: payload.coverImageId
      ? sanitizeObjectId(payload.coverImageId, 'coverImageId')
      : undefined
  });
};

export const manufacturerMediaApi = {
  async uploadFile(
    manufacturerId: string,
    file: File,
    options?: FileUploadOptions
  ): Promise<UploadedFile> {
    const endpoint = `${buildMediaPath(manufacturerId)}/upload`;
    try {
      const formData = new FormData();
      formData.append('file', file);
      appendUploadOptionsToFormData(formData, options);

      const response = await api.postFormData<ApiResponse<{ uploadedFile: UploadedFile }>>(
        `/manufacturer${endpoint}`,
        formData
      );
      const { uploadedFile } = baseApi.handleResponse(
        response,
        'Failed to upload file',
        400
      );
      return uploadedFile;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaLogContext('POST', endpoint, { manufacturerId, options })
      );
    }
  },

  async processImage(
    manufacturerId: string,
    fileId: string,
    options: ImageProcessingOptions
  ): Promise<UploadedFile> {
    const endpoint = `${buildMediaPath(manufacturerId, `/${sanitizeObjectId(fileId, 'fileId')}`)}/process`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ processedFile: UploadedFile }>>(
        endpoint,
        sanitizeImageProcessingOptions(options)
      );
      const { processedFile } = baseApi.handleResponse(
        response,
        'Failed to process image',
        400
      );
      return processedFile;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaLogContext('POST', endpoint, { manufacturerId, fileId })
      );
    }
  },

  async generateQrCode(
    manufacturerId: string,
    data: string,
    options?: QRCodeOptions
  ): Promise<QRCodeResult> {
    const endpoint = `${buildMediaPath(manufacturerId)}/qr-code`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ qrResult: QRCodeResult }>>(
        endpoint,
        baseApi.sanitizeRequestData({
          data: sanitizeString(data, 'data', { maxLength: 2000 }),
          ...sanitizeQrCodeOptions(options)
        })
      );
      const { qrResult } = baseApi.handleResponse(
        response,
        'Failed to generate QR code',
        400
      );
      return qrResult;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaLogContext('POST', endpoint, { manufacturerId })
      );
    }
  },

  async createGallery(
    manufacturerId: string,
    payload: {
      name: string;
      fileIds: string[];
      description?: string;
      isPublic?: boolean;
      tags?: string[];
      coverImageId?: string;
    }
  ): Promise<MediaGallery> {
    const endpoint = `${buildMediaPath(manufacturerId)}/gallery`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ gallery: MediaGallery }>>(
        endpoint,
        sanitizeGalleryPayload(payload)
      );
      const { gallery } = baseApi.handleResponse(
        response,
        'Failed to create media gallery',
        400
      );
      return gallery;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaLogContext('POST', endpoint, { manufacturerId, name: payload.name })
      );
    }
  },

  async getBrandAssets(manufacturerId: string): Promise<BrandAssets> {
    const endpoint = `${buildMediaPath(manufacturerId)}/brand-assets`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ brandAssets: BrandAssets }>>(endpoint);
      const { brandAssets } = baseApi.handleResponse(
        response,
        'Failed to fetch brand assets',
        500
      );
      return brandAssets;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async getMediaAnalytics(manufacturerId: string): Promise<MediaAnalytics> {
    const endpoint = `${buildMediaPath(manufacturerId)}/media-analytics`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ analytics: MediaAnalytics }>>(endpoint);
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch media analytics',
        500
      );
      return analytics;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async deleteFile(manufacturerId: string, fileId: string): Promise<string> {
    const endpoint = `${buildMediaPath(manufacturerId, `/${sanitizeObjectId(fileId, 'fileId')}`)}`;
    try {
      const response = await manufacturerApi.delete<ApiResponse<{ message?: string }>>(endpoint);
      const { message } = baseApi.handleResponse(
        response,
        'Failed to delete media file',
        400,
        { requireData: false }
      );
      return message ?? 'File deleted successfully';
    } catch (error) {
      throw handleApiError(
        error,
        createMediaLogContext('DELETE', endpoint, { manufacturerId, fileId })
      );
    }
  }
};

export default manufacturerMediaApi;
