// src/lib/api/features/notifications/notificationsTemplate.api.ts
// Notifications template API aligned with backend routes/features/notifications/notificationsTemplate.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { TemplateContext } from '@/lib/types/features/notifications';
import type { TemplateOutput } from '@backend/services/notifications/templates/templateTypes';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeString, sanitizeOptionalJsonObject } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/notifications/template';

type HttpMethod = 'GET' | 'POST';

const createNotificationsTemplateLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'notifications',
  module: 'template',
  method,
  endpoint,
  ...context
});

export interface NotificationTemplateMetadataResponse {
  metadata: TemplateOutput['metadata'];
}

export interface NotificationTemplateRenderResponse {
  rendered: TemplateOutput;
}

const sanitizeTemplateKey = (templateKey: string) => {
  return sanitizeString(templateKey, 'templateKey', { maxLength: 200 });
};

const sanitizeTemplateContext = (context: TemplateContext) => {
  const payload = sanitizeOptionalJsonObject<Record<string, unknown>>(context?.payload, 'context.payload') ?? {};
  return { payload };
};

export const notificationsTemplateApi = {
  /**
   * Resolve template metadata.
   * GET /api/notifications/template/:templateKey
   */
  async resolveTemplate(templateKey: string): Promise<NotificationTemplateMetadataResponse> {
    const sanitizedKey = sanitizeTemplateKey(templateKey);
    const endpoint = `${BASE_PATH}/${encodeURIComponent(sanitizedKey)}`;

    try {
      const response = await api.get<ApiResponse<{ template: NotificationTemplateMetadataResponse }>>(endpoint);
      const { template } = baseApi.handleResponse(
        response,
        'Failed to resolve notification template',
        404
      );
      return template;
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsTemplateLogContext('GET', endpoint, { templateKey: sanitizedKey })
      );
    }
  },

  /**
   * Render template with provided context.
   * POST /api/notifications/template/:templateKey/render
   */
  async renderTemplate(templateKey: string, context: TemplateContext): Promise<NotificationTemplateRenderResponse> {
    const sanitizedKey = sanitizeTemplateKey(templateKey);
    const sanitizedContext = sanitizeTemplateContext(context);
    const endpoint = `${BASE_PATH}/${encodeURIComponent(sanitizedKey)}/render`;

    try {
      const response = await api.post<ApiResponse<NotificationTemplateRenderResponse>>(endpoint, {
        context: sanitizedContext
      });
      return baseApi.handleResponse(
        response,
        'Failed to render notification template',
        404
      );
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsTemplateLogContext('POST', endpoint, { templateKey: sanitizedKey })
      );
    }
  }
};

export default notificationsTemplateApi;
