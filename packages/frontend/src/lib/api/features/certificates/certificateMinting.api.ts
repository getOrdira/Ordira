// src/lib/api/features/certificates/certificateMinting.api.ts
// Certificate minting API aligned with backend routes/features/certificates/certificateMinting.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { CertificateDisplay } from '@/lib/types/features/certificates';
import type { CreateCertInput } from '@backend/services/certificates/features';
import {
  ensureNonEmptyObject,
  logDebug,
  logError,
  sanitizeBoolean,
  sanitizeContactMethod,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizePositiveInteger,
  sanitizeQuery,
  sanitizeRecipientByContactMethod,
  sanitizeString,
  sanitizePriority,
  sanitizeDateInput,
} from './utils';

const BASE_PATH = '/certificates/minting';

type FrontendCertificateImage = File | Blob;

export type CreateCertificateRequest = Omit<CreateCertInput, 'certificateImage'> & {
  certificateImage?: FrontendCertificateImage;
};

export interface BatchCreateCertificatesRequest {
  certificates: CreateCertificateRequest[];
}

interface SanitizedMetadata {
  customMessage?: string;
  attributes?: Array<{ trait_type: string; value: string | number; display_type?: string }>;
  certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
  expirationDate?: string;
  imageUrl?: string;
  templateId?: string;
}

const sanitizeAttributes = (
  attributes?: Array<{ trait_type: string; value: string | number; display_type?: string }>,
): SanitizedMetadata['attributes'] => {
  if (attributes === undefined) {
    return undefined;
  }

  if (!Array.isArray(attributes)) {
    throw new Error('metadata.attributes must be an array');
  }

  if (attributes.length > 25) {
    throw new Error('metadata.attributes cannot contain more than 25 items');
  }

  return attributes.map((attribute, index) => {
    const traitType = sanitizeString(attribute.trait_type, { fieldName: `metadata.attributes[${index}].trait_type`, maxLength: 100 });
    const displayType = attribute.display_type
      ? sanitizeString(attribute.display_type, { fieldName: `metadata.attributes[${index}].display_type`, maxLength: 50 })
      : undefined;

    if (typeof attribute.value !== 'string' && typeof attribute.value !== 'number') {
      throw new Error(`metadata.attributes[${index}].value must be a string or number`);
    }

    const value = typeof attribute.value === 'string'
      ? sanitizeString(attribute.value, { fieldName: `metadata.attributes[${index}].value`, maxLength: 200 })
      : attribute.value;

    return {
      trait_type: traitType,
      value,
      display_type: displayType,
    };
  });
};

const sanitizeMetadata = (metadata?: CreateCertificateRequest['metadata']): SanitizedMetadata | undefined => {
  if (!metadata) {
    return undefined;
  }

  const sanitizedLevel = metadata.certificateLevel
    ? sanitizeString(metadata.certificateLevel, { fieldName: 'metadata.certificateLevel', maxLength: 20 })
    : undefined;

  if (sanitizedLevel && !['bronze', 'silver', 'gold', 'platinum'].includes(sanitizedLevel)) {
    throw new Error('metadata.certificateLevel must be one of bronze, silver, gold, or platinum');
  }

  return sanitizeQuery({
    customMessage: metadata.customMessage
      ? sanitizeString(metadata.customMessage, { fieldName: 'metadata.customMessage', maxLength: 1000 })
      : undefined,
    attributes: sanitizeAttributes(metadata.attributes),
    certificateLevel: sanitizedLevel,
    expirationDate: sanitizeDateInput(metadata.expirationDate, 'metadata.expirationDate'),
    imageUrl: metadata.imageUrl
      ? sanitizeString(metadata.imageUrl, { fieldName: 'metadata.imageUrl', maxLength: 2048 })
      : undefined,
    templateId: metadata.templateId
      ? sanitizeString(metadata.templateId, { fieldName: 'metadata.templateId', maxLength: 64 })
      : undefined,
  }) as SanitizedMetadata;
};

const sanitizeDeliveryOptions = (
  options?: CreateCertificateRequest['deliveryOptions']
): CreateCertificateRequest['deliveryOptions'] | undefined => {
  if (!options) {
    return undefined;
  }

  const sanitized = sanitizeQuery({
    scheduleDate: sanitizeDateInput(options.scheduleDate, 'deliveryOptions.scheduleDate'),
    priority: sanitizePriority(options.priority),
    notifyRecipient: options.notifyRecipient !== undefined ? sanitizeBoolean(options.notifyRecipient, 'deliveryOptions.notifyRecipient') : undefined,
  });

  return Object.keys(sanitized).length > 0 ? (sanitized as CreateCertificateRequest['deliveryOptions']) : undefined;
};

const sanitizeWeb3Options = (
  options?: CreateCertificateRequest['web3Options']
): CreateCertificateRequest['web3Options'] | undefined => {
  if (!options) {
    return undefined;
  }

  const sanitized = sanitizeQuery({
    autoTransfer: options.autoTransfer !== undefined ? sanitizeBoolean(options.autoTransfer, 'web3Options.autoTransfer') : undefined,
    transferDelay: options.transferDelay !== undefined
      ? sanitizePositiveInteger(options.transferDelay, { fieldName: 'web3Options.transferDelay', min: 0, max: 604_800 })
      : undefined,
    brandWallet: options.brandWallet
      ? sanitizeString(options.brandWallet, { fieldName: 'web3Options.brandWallet', maxLength: 128 })
      : undefined,
    requireCustomerConfirmation: options.requireCustomerConfirmation !== undefined
      ? sanitizeBoolean(options.requireCustomerConfirmation, 'web3Options.requireCustomerConfirmation')
      : undefined,
    gasOptimization: options.gasOptimization !== undefined ? sanitizeBoolean(options.gasOptimization, 'web3Options.gasOptimization') : undefined,
  });

  return Object.keys(sanitized).length > 0 ? (sanitized as CreateCertificateRequest['web3Options']) : undefined;
};

const sanitizeCreatePayload = (payload: CreateCertificateRequest): Record<string, unknown> => {
  const productId = sanitizeObjectId(payload.productId, 'productId');
  const contactMethod = sanitizeContactMethod(payload.contactMethod);
  const recipient = sanitizeRecipientByContactMethod(payload.recipient, contactMethod);

  return sanitizeQuery({
    productId,
    recipient,
    contactMethod,
    metadata: sanitizeMetadata(payload.metadata),
    deliveryOptions: sanitizeDeliveryOptions(payload.deliveryOptions),
    web3Options: sanitizeWeb3Options(payload.web3Options),
  });
};

const sanitizeBatchCreatePayload = (
  payload: BatchCreateCertificatesRequest,
): { certificates: Record<string, unknown>[] } => {
  if (!Array.isArray(payload.certificates) || payload.certificates.length === 0) {
    throw new Error('certificates must be a non-empty array');
  }

  if (payload.certificates.length > 100) {
    throw new Error('certificates array cannot exceed 100 items');
  }

  return {
    certificates: payload.certificates.map((certificate) => sanitizeCreatePayload(certificate)),
  };
};

export const certificateMintingApi = {
  /**
   * Create certificate.
   * POST /certificates/minting/create
   */
  async createCertificate(payload: CreateCertificateRequest): Promise<{ certificate: CertificateDisplay }> {
    const body = sanitizeCreatePayload(payload);

    try {
      logDebug('minting', 'Creating certificate', { productId: body.productId, contactMethod: body.contactMethod });
      const response = await api.post<ApiResponse<{ certificate: CertificateDisplay }>>(
        `${BASE_PATH}/create`,
        body,
      );

      return baseApi.handleResponse(response, 'Failed to create certificate', 500);
    } catch (error) {
      logError('minting', 'Create certificate request failed', error);
      throw error;
    }
  },

  /**
   * Batch create certificates.
   * POST /certificates/minting/batch-create
   */
  async createBatchCertificates(payload: BatchCreateCertificatesRequest): Promise<{ result: { successful: CertificateDisplay[]; failed: Array<{ input: unknown; error: string }> } }> {
    const sanitizedPayload = sanitizeBatchCreatePayload(payload);

    try {
      logDebug('minting', 'Batch creating certificates', { count: sanitizedPayload.certificates.length });
      const response = await api.post<ApiResponse<{ result: { successful: CertificateDisplay[]; failed: Array<{ input: unknown; error: string }> } }>>(
        `${BASE_PATH}/batch-create`,
        sanitizedPayload,
      );

      return baseApi.handleResponse(response, 'Failed to batch create certificates', 500);
    } catch (error) {
      logError('minting', 'Batch create certificates request failed', error);
      throw error;
    }
  },

  /**
   * Update certificate image.
   * PUT /certificates/minting/:certificateId/image
   */
  async updateCertificateImage(certificateId: string, file: FrontendCertificateImage, fileName = 'certificate-image'): Promise<{ result: { success: boolean; imageUrl?: string } }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');

    if (!(file instanceof Blob)) {
      throw new Error('certificate image must be a File or Blob');
    }

    const formData = new FormData();
    formData.append('certificateImage', file, 'name' in file ? file.name : fileName);

    try {
      logDebug('minting', 'Updating certificate image', { certificateId: id });
      const response = await api.put<ApiResponse<{ result: { success: boolean; imageUrl?: string } }>>(
        `${BASE_PATH}/${id}/image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return baseApi.handleResponse(response, 'Failed to update certificate image', 500);
    } catch (error) {
      logError('minting', 'Update certificate image request failed', error);
      throw error;
    }
  },

  /**
   * Delete certificate assets.
   * DELETE /certificates/minting/:certificateId/assets
   */
  async deleteCertificateAssets(certificateId: string): Promise<{ message: string }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');

    try {
      logDebug('minting', 'Deleting certificate assets', { certificateId: id });
      const response = await api.delete<ApiResponse<{ message: string }>>(
        `${BASE_PATH}/${id}/assets`,
      );

      return baseApi.handleResponse(response, 'Failed to delete certificate assets', 500);
    } catch (error) {
      logError('minting', 'Delete certificate assets request failed', error);
      throw error;
    }
  },
};

export default certificateMintingApi;

