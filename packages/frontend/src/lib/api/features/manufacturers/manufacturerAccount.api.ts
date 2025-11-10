import { api, manufacturerApi } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  IManufacturer,
  AccountActivity,
  NotificationPreferences,
  ProfilePictureUploadResult,
  SoftDeleteResult
} from '@/lib/types/features/manufacturers';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString,
  sanitizeOptionalArray,
  sanitizeNumber,
  sanitizeDate,
  sanitizeOptionalDate,
  sanitizeArray
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/account';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const createAccountLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'manufacturers',
  module: 'account',
  method,
  endpoint,
  ...context
});

const buildAccountPath = (manufacturerId: string, suffix: string = '') => {
  const sanitizedId = sanitizeObjectId(manufacturerId, 'manufacturerId');
  return `${BASE_PATH}/${sanitizedId}/account${suffix}`;
};

export interface ManufacturerAccountUpdateInput {
  name?: string;
  profilePictureUrl?: string;
  description?: string;
  servicesOffered?: string[];
  moq?: number;
  industry?: string;
  contactEmail?: string;
  socialUrls?: string[];
  businessLicense?: string;
  certifications?: Array<{
    name: string;
    issuer: string;
    issueDate: string | Date;
    expiryDate?: string | Date;
  }>;
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
  };
  preferredContactMethod?: 'email' | 'phone' | 'message';
  timezone?: string;
}

export interface AccountActivityQuery {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  severity?: 'low' | 'medium' | 'high';
}

export interface AccountActivityResult {
  activities: AccountActivity[];
  total: number;
}

const sanitizeAccountActivityQuery = (query?: AccountActivityQuery) => {
  if (!query) {
    return undefined;
  }

  const { page, limit, type, startDate, endDate, severity } = query;

  const sanitizedQuery = baseApi.sanitizeQueryParams({
    page: sanitizeOptionalNumber(page, 'page', { min: 1, integer: true }),
    limit: sanitizeOptionalNumber(limit, 'limit', { min: 1, max: 100, integer: true }),
    type: sanitizeOptionalString(type, 'type', { maxLength: 100 }),
    startDate: sanitizeOptionalDate(startDate, 'startDate')?.toISOString(),
    endDate: sanitizeOptionalDate(endDate, 'endDate')?.toISOString(),
    severity: sanitizeOptionalString(severity, 'severity', {
      allowedValues: ['low', 'medium', 'high'] as const
    })
  } as Record<string, unknown>);

  return sanitizedQuery;
};

const sanitizeAccountUpdatePayload = (payload: ManufacturerAccountUpdateInput) => {
  const sanitizedCertifications = payload.certifications
    ? sanitizeOptionalArray(
        payload.certifications,
        'certifications',
        (item, index) => {
          type CertificationInput = NonNullable<ManufacturerAccountUpdateInput['certifications']>[number];
          const certification = item as CertificationInput | undefined;

          return {
            name: sanitizeString(certification?.name, `certifications[${index}].name`, { maxLength: 200 }),
            issuer: sanitizeString(certification?.issuer, `certifications[${index}].issuer`, { maxLength: 200 }),
            issueDate: sanitizeDate(
              certification?.issueDate,
              `certifications[${index}].issueDate`
            ).toISOString(),
            expiryDate: sanitizeOptionalDate(
              certification?.expiryDate,
              `certifications[${index}].expiryDate`
            )?.toISOString()
          };
        },
        { maxLength: 50 }
      )
    : undefined;

  const sanitizedPayload = {
    name: sanitizeOptionalString(payload.name, 'name', { maxLength: 100 }),
    profilePictureUrl: sanitizeOptionalString(payload.profilePictureUrl, 'profilePictureUrl', {
      maxLength: 500
    }),
    description: sanitizeOptionalString(payload.description, 'description', { maxLength: 2000 }),
    servicesOffered: sanitizeOptionalArray(
      payload.servicesOffered,
      'servicesOffered',
      (service, index) =>
        sanitizeString(service, `servicesOffered[${index}]`, {
          maxLength: 100
        }),
      { maxLength: 50 }
    ),
    moq: sanitizeOptionalNumber(payload.moq, 'moq', { min: 1, integer: true }),
    industry: sanitizeOptionalString(payload.industry, 'industry', { maxLength: 100 }),
    contactEmail: sanitizeOptionalString(payload.contactEmail, 'contactEmail', { maxLength: 255 }),
    socialUrls: sanitizeOptionalArray(
      payload.socialUrls,
      'socialUrls',
      (url, index) =>
        sanitizeString(url, `socialUrls[${index}]`, {
          maxLength: 500
        }),
      { maxLength: 10 }
    ),
    businessLicense: sanitizeOptionalString(payload.businessLicense, 'businessLicense', {
      maxLength: 100
    }),
    certifications: sanitizedCertifications,
    establishedYear: sanitizeOptionalNumber(payload.establishedYear, 'establishedYear', {
      min: 1800,
      max: new Date().getFullYear(),
      integer: true
    }),
    employeeCount: sanitizeOptionalNumber(payload.employeeCount, 'employeeCount', {
      min: 1,
      integer: true
    }),
    headquarters: payload.headquarters
      ? baseApi.sanitizeRequestData({
          country: sanitizeOptionalString(payload.headquarters.country, 'headquarters.country', {
            maxLength: 100
          }),
          city: sanitizeOptionalString(payload.headquarters.city, 'headquarters.city', {
            maxLength: 100
          }),
          address: sanitizeOptionalString(payload.headquarters.address, 'headquarters.address', {
            maxLength: 500
          })
        })
      : undefined,
    preferredContactMethod: sanitizeOptionalString(
      payload.preferredContactMethod,
      'preferredContactMethod',
      {
        allowedValues: ['email', 'phone', 'message'] as const
      }
    ),
    timezone: sanitizeOptionalString(payload.timezone, 'timezone', { maxLength: 100 })
  };

  return baseApi.sanitizeRequestData(sanitizedPayload);
};

const sanitizeServicesArray = (services: string[]) =>
  sanitizeArray(
    services,
    'servicesOffered',
    (service, index) =>
      sanitizeString(service, `servicesOffered[${index}]`, {
        maxLength: 100
      }),
    { minLength: 1, maxLength: 50 }
  );

export interface ContactInfoPayload {
  contactEmail: string;
}

export interface ServicesOfferedPayload {
  servicesOffered: string[];
}

export interface MinimumOrderQuantityPayload {
  moq: number;
}

export const manufacturerAccountApi = {
  async getAccount(manufacturerId: string): Promise<IManufacturer> {
    const endpoint = buildAccountPath(manufacturerId);
    try {
      const response = await manufacturerApi.get<
        ApiResponse<{ account: IManufacturer }>
      >(endpoint);
      const { account } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer account',
        500
      );
      return account;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async updateAccount(
    manufacturerId: string,
    payload: ManufacturerAccountUpdateInput
  ): Promise<IManufacturer> {
    const endpoint = buildAccountPath(manufacturerId);
    try {
      const sanitized = sanitizeAccountUpdatePayload(payload);
      const response = await manufacturerApi.put<
        ApiResponse<{ account: IManufacturer }>
      >(endpoint, sanitized);
      const { account } = baseApi.handleResponse(
        response,
        'Failed to update manufacturer account',
        400
      );
      return account;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('PUT', endpoint, {
          manufacturerId,
          fields: Object.keys(payload ?? {})
        })
      );
    }
  },

  async softDeleteAccount(manufacturerId: string): Promise<SoftDeleteResult> {
    const endpoint = buildAccountPath(manufacturerId);
    try {
      const response = await manufacturerApi.delete<
        ApiResponse<{ deleteResult: SoftDeleteResult }>
      >(endpoint);
      const { deleteResult } = baseApi.handleResponse(
        response,
        'Failed to delete manufacturer account',
        400
      );
      return deleteResult;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('DELETE', endpoint, { manufacturerId })
      );
    }
  },

  async getAccountActivity(
    manufacturerId: string,
    query?: AccountActivityQuery
  ): Promise<AccountActivityResult> {
    const endpoint = buildAccountPath(manufacturerId, '/activity');
    try {
      const response = await manufacturerApi.get<
        ApiResponse<AccountActivityResult>
      >(endpoint, {
        params: sanitizeAccountActivityQuery(query)
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch account activity',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', endpoint, {
          manufacturerId,
          query
        })
      );
    }
  },

  async updateNotificationPreferences(
    manufacturerId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const endpoint = buildAccountPath(manufacturerId, '/notifications');
    try {
      const response = await manufacturerApi.put<
        ApiResponse<{ preferences: NotificationPreferences }>
      >(endpoint, baseApi.sanitizeRequestData(preferences));
      const { preferences: updated } = baseApi.handleResponse(
        response,
        'Failed to update notification preferences',
        400
      );
      return updated;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('PUT', endpoint, { manufacturerId })
      );
    }
  },

  async getStats(
    manufacturerId: string
  ): Promise<{ profileCompleteness: number; accountAge: number; lastUpdated: string | Date }> {
    const endpoint = buildAccountPath(manufacturerId, '/stats');
    try {
      const response = await manufacturerApi.get<
        ApiResponse<{
          stats: { profileCompleteness: number; accountAge: number; lastUpdated: string | Date };
        }>
      >(endpoint);
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer stats',
        500
      );
      return stats;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async validateOwnership(manufacturerId: string): Promise<boolean> {
    const endpoint = buildAccountPath(manufacturerId, '/validate-ownership');
    try {
      const response = await manufacturerApi.get<ApiResponse<{ isValid: boolean }>>(endpoint);
      const { isValid } = baseApi.handleResponse(
        response,
        'Failed to validate manufacturer ownership',
        500
      );
      return isValid;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async deactivateAccount(manufacturerId: string): Promise<string> {
    const endpoint = buildAccountPath(manufacturerId, '/deactivate');
    try {
      const response = await manufacturerApi.post<ApiResponse<{ message?: string }>>(endpoint);
      const { message } = baseApi.handleResponse(
        response,
        'Failed to deactivate account',
        400,
        { requireData: false }
      );
      return message ?? 'Account deactivated successfully';
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('POST', endpoint, { manufacturerId })
      );
    }
  },

  async reactivateAccount(manufacturerId: string): Promise<string> {
    const endpoint = buildAccountPath(manufacturerId, '/reactivate');
    try {
      const response = await manufacturerApi.post<ApiResponse<{ message?: string }>>(endpoint);
      const { message } = baseApi.handleResponse(
        response,
        'Failed to reactivate account',
        400,
        { requireData: false }
      );
      return message ?? 'Account reactivated successfully';
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('POST', endpoint, { manufacturerId })
      );
    }
  },

  async getBasicInfo(
    manufacturerId: string
  ): Promise<Pick<IManufacturer, 'name' | 'profilePictureUrl' | 'industry'>> {
    const endpoint = buildAccountPath(manufacturerId, '/basic-info');
    try {
      const response = await manufacturerApi.get<
        ApiResponse<{ basicInfo: Pick<IManufacturer, 'name' | 'profilePictureUrl' | 'industry'> }>
      >(endpoint);
      const { basicInfo } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer basic info',
        500
      );
      return basicInfo;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async updateContactInfo(
    manufacturerId: string,
    payload: ContactInfoPayload
  ): Promise<IManufacturer> {
    const endpoint = buildAccountPath(manufacturerId, '/contact-info');
    try {
      const sanitizedPayload = baseApi.sanitizeRequestData({
        contactEmail: sanitizeString(payload.contactEmail, 'contactEmail', { maxLength: 255 })
      });
      const response = await manufacturerApi.put<
        ApiResponse<{ account: IManufacturer }>
      >(endpoint, sanitizedPayload);
      const { account } = baseApi.handleResponse(
        response,
        'Failed to update contact info',
        400
      );
      return account;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('PUT', endpoint, { manufacturerId })
      );
    }
  },

  async updateServicesOffered(
    manufacturerId: string,
    payload: ServicesOfferedPayload
  ): Promise<IManufacturer> {
    const endpoint = buildAccountPath(manufacturerId, '/services');
    try {
      const sanitizedPayload = baseApi.sanitizeRequestData({
        servicesOffered: sanitizeServicesArray(payload.servicesOffered)
      });
      const response = await manufacturerApi.put<
        ApiResponse<{ account: IManufacturer }>
      >(endpoint, sanitizedPayload);
      const { account } = baseApi.handleResponse(
        response,
        'Failed to update services offered',
        400
      );
      return account;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('PUT', endpoint, { manufacturerId })
      );
    }
  },

  async updateMinimumOrderQuantity(
    manufacturerId: string,
    payload: MinimumOrderQuantityPayload
  ): Promise<IManufacturer> {
    const endpoint = buildAccountPath(manufacturerId, '/moq');
    try {
      const sanitizedPayload = baseApi.sanitizeRequestData({
        moq: sanitizeNumber(payload.moq, 'moq', { min: 1, integer: true })
      });
      const response = await manufacturerApi.put<
        ApiResponse<{ account: IManufacturer }>
      >(endpoint, sanitizedPayload);
      const { account } = baseApi.handleResponse(
        response,
        'Failed to update minimum order quantity',
        400
      );
      return account;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('PUT', endpoint, { manufacturerId })
      );
    }
  },

  async uploadProfilePicture(
    manufacturerId: string,
    file: File
  ): Promise<ProfilePictureUploadResult> {
    const endpoint = `${BASE_PATH}/${sanitizeObjectId(manufacturerId, 'manufacturerId')}/picture`;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.postFormData<
        ApiResponse<{ uploadResult: ProfilePictureUploadResult }>
      >(`/manufacturer${endpoint}`, formData);
      const { uploadResult } = baseApi.handleResponse(
        response,
        'Failed to upload profile picture',
        400
      );
      return uploadResult;
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('POST', endpoint, { manufacturerId })
      );
    }
  },

  async removeProfilePicture(manufacturerId: string): Promise<string> {
    const endpoint = `${BASE_PATH}/${sanitizeObjectId(manufacturerId, 'manufacturerId')}/picture`;
    try {
      const response = await manufacturerApi.delete<ApiResponse<{ message?: string }>>(endpoint);
      const { message } = baseApi.handleResponse(
        response,
        'Failed to remove profile picture',
        400,
        { requireData: false }
      );
      return message ?? 'Profile picture removed';
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('DELETE', endpoint, { manufacturerId })
      );
    }
  }
};

export default manufacturerAccountApi;
