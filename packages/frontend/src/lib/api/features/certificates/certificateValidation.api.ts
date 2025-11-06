// src/lib/api/features/certificates/certificateValidation.api.ts
// Certificate validation API aligned with backend routes/features/certificates/certificateValidation.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import {
  ensureNonEmptyObject,
  logDebug,
  logError,
  sanitizeBoolean,
  sanitizeContactMethod,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeQuery,
  sanitizeRecipientByContactMethod,
  sanitizeString,
  sanitizeEthereumAddress,
} from './utils';

const BASE_PATH = '/certificates/validation';

export const certificateValidationApi = {
  /**
   * Check for duplicate certificate.
   * POST /certificates/validation/check-duplicate
   */
  async checkDuplicateCertificate(productId: string, recipient: string): Promise<{ certificate: unknown | null }> {
    const id = sanitizeObjectId(productId, 'productId');
    const sanitizedRecipient = sanitizeString(recipient, { fieldName: 'recipient', maxLength: 320 });

    try {
      logDebug('validation', 'Checking duplicate certificate', { productId: id });
      const response = await api.post<ApiResponse<{ certificate: unknown | null }>>(
        `${BASE_PATH}/check-duplicate`,
        {
          productId: id,
          recipient: sanitizedRecipient,
        },
      );

      return baseApi.handleResponse(response, 'Failed to check duplicate certificate', 500);
    } catch (error) {
      logError('validation', 'Duplicate certificate request failed', error);
      throw error;
    }
  },

  /**
   * Validate product ownership.
   * POST /certificates/validation/validate-product-ownership
   */
  async validateProductOwnership(productId: string): Promise<{ isValid: boolean }> {
    const id = sanitizeObjectId(productId, 'productId');

    try {
      logDebug('validation', 'Validating product ownership', { productId: id });
      const response = await api.post<ApiResponse<{ isValid: boolean }>>(
        `${BASE_PATH}/validate-product-ownership`,
        { productId: id },
      );

      return baseApi.handleResponse(response, 'Failed to validate product ownership', 500);
    } catch (error) {
      logError('validation', 'Product ownership validation failed', error);
      throw error;
    }
  },

  /**
   * Validate transfer parameters.
   * POST /certificates/validation/validate-transfer-parameters
   */
  async validateTransferParameters(params: { contractAddress: string; tokenId: string; brandWallet: string }): Promise<{ valid: boolean; error?: string }> {
    const contractAddress = sanitizeEthereumAddress(params.contractAddress, 'contractAddress');
    const brandWallet = sanitizeEthereumAddress(params.brandWallet, 'brandWallet');
    const tokenId = sanitizeString(params.tokenId, { fieldName: 'tokenId', maxLength: 100 });

    try {
      logDebug('validation', 'Validating transfer parameters');
      const response = await api.post<ApiResponse<{ valid: boolean; error?: string }>>(
        `${BASE_PATH}/validate-transfer-parameters`,
        { contractAddress, tokenId, brandWallet },
      );

      return baseApi.handleResponse(response, 'Failed to validate transfer parameters', 500);
    } catch (error) {
      logError('validation', 'Transfer parameters validation failed', error);
      throw error;
    }
  },

  /**
   * Validate wallet address.
   * POST /certificates/validation/validate-wallet-address
   */
  async validateWalletAddress(address: string): Promise<{ valid: boolean; error?: string }> {
    const sanitizedAddress = sanitizeEthereumAddress(address, 'address');

    try {
      logDebug('validation', 'Validating wallet address');
      const response = await api.post<ApiResponse<{ valid: boolean; error?: string }>>(
        `${BASE_PATH}/validate-wallet-address`,
        { address: sanitizedAddress },
      );

      return baseApi.handleResponse(response, 'Failed to validate wallet address', 500);
    } catch (error) {
      logError('validation', 'Wallet address validation failed', error);
      throw error;
    }
  },

  /**
   * Validate relayer wallet configuration.
   * GET /certificates/validation/validate-relayer-wallet
   */
  async validateRelayerWallet(options?: { checkConfiguration?: boolean }): Promise<{ valid: boolean; address?: string; error?: string }> {
    const params = sanitizeQuery({
      checkConfiguration: sanitizeOptionalBoolean(options?.checkConfiguration, 'checkConfiguration'),
    });

    try {
      logDebug('validation', 'Validating relayer wallet', params);
      const response = await api.get<ApiResponse<{ valid: boolean; address?: string; error?: string }>>(
        `${BASE_PATH}/validate-relayer-wallet`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to validate relayer wallet', 500);
    } catch (error) {
      logError('validation', 'Relayer wallet validation failed', error);
      throw error;
    }
  },

  /**
   * Validate certificate metadata.
   * POST /certificates/validation/validate-metadata
   */
  async validateCertificateMetadata(metadata: Record<string, unknown>): Promise<{ valid: boolean; errors: string[] }> {
    const body = ensureNonEmptyObject(metadata, 'metadata');

    try {
      logDebug('validation', 'Validating certificate metadata');
      const response = await api.post<ApiResponse<{ valid: boolean; errors: string[] }>>(
        `${BASE_PATH}/validate-metadata`,
        { metadata: body },
      );

      return baseApi.handleResponse(response, 'Failed to validate certificate metadata', 500);
    } catch (error) {
      logError('validation', 'Metadata validation failed', error);
      throw error;
    }
  },

  /**
   * Validate batch inputs.
   * POST /certificates/validation/validate-batch-inputs
   */
  async validateBatchInputs(inputs: Array<{ productId: string; recipient: string; contactMethod: 'email' | 'sms' | 'wallet'; metadata?: Record<string, unknown> }>): Promise<{ valid: boolean; errors: Array<{ index: number; error: string }> }> {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw new Error('inputs must be a non-empty array');
    }

    if (inputs.length > 500) {
      throw new Error('inputs cannot exceed 500 items');
    }

    const sanitizedInputs = inputs.map((input, index) => {
      const productId = sanitizeObjectId(input.productId, `inputs[${index}].productId`);
      const contactMethod = sanitizeContactMethod(input.contactMethod);
      const recipient = sanitizeRecipientByContactMethod(input.recipient, contactMethod);
      const metadata = input.metadata ? ensureNonEmptyObject(input.metadata, `inputs[${index}].metadata`) : undefined;

      return sanitizeQuery({
        productId,
        recipient,
        contactMethod,
        metadata,
      });
    });

    try {
      logDebug('validation', 'Validating batch inputs', { count: sanitizedInputs.length });
      const response = await api.post<ApiResponse<{ valid: boolean; errors: Array<{ index: number; error: string }> }>>(
        `${BASE_PATH}/validate-batch-inputs`,
        { inputs: sanitizedInputs },
      );

      return baseApi.handleResponse(response, 'Failed to validate batch inputs', 500);
    } catch (error) {
      logError('validation', 'Batch inputs validation failed', error);
      throw error;
    }
  },

  /**
   * Validate certificate ownership.
   * GET /certificates/validation/:certificateId/validate-ownership
   */
  async validateCertificateOwnership(certificateId: string): Promise<{ certificate: unknown }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');

    try {
      logDebug('validation', 'Validating certificate ownership', { certificateId: id });
      const response = await api.get<ApiResponse<{ certificate: unknown }>>(
        `${BASE_PATH}/${id}/validate-ownership`,
      );

      return baseApi.handleResponse(response, 'Failed to validate certificate ownership', 404);
    } catch (error) {
      logError('validation', 'Certificate ownership validation failed', error);
      throw error;
    }
  },

  /**
   * Validate certificate transferable state.
   * GET /certificates/validation/:certificateId/validate-transferable
   */
  async validateCertificateTransferable(certificateId: string): Promise<{ valid: boolean; error?: string }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');

    try {
      logDebug('validation', 'Validating certificate transferable', { certificateId: id });
      const response = await api.get<ApiResponse<{ valid: boolean; error?: string }>>(
        `${BASE_PATH}/${id}/validate-transferable`,
      );

      return baseApi.handleResponse(response, 'Failed to validate certificate transferable state', 404);
    } catch (error) {
      logError('validation', 'Certificate transferable validation failed', error);
      throw error;
    }
  },
};

export default certificateValidationApi;

