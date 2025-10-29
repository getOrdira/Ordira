// src/controllers/features/notifications/notificationsTemplate.controller.ts
// Controller providing template resolution and rendering endpoints

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { NotificationsBaseController } from './notificationsBase.controller';
import { TemplateContext } from '../../../services/notifications';

interface ResolveTemplateRequest extends BaseRequest {
  validatedParams: {
    templateKey: string;
  };
}

interface RenderTemplateRequest extends ResolveTemplateRequest {
  validatedBody: {
    context: TemplateContext;
  };
}

/**
 * NotificationsTemplateController enables API-driven template discovery and previews.
 */
export class NotificationsTemplateController extends NotificationsBaseController {
  private templateService = this.notificationsServices.features.templateService;

  /**
   * Resolve a template definition from the registry.
   */
  async resolveTemplate(req: ResolveTemplateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'RESOLVE_NOTIFICATION_TEMPLATE');

      const template = this.templateService.resolve(req.validatedParams.templateKey);

      if (!template) {
        throw { statusCode: 404, message: `Template ${req.validatedParams.templateKey} not found` };
      }

      this.logAction(req, 'RESOLVE_NOTIFICATION_TEMPLATE_SUCCESS', {
        templateKey: req.validatedParams.templateKey,
      });

      return { template: { metadata: template.metadata } };
    }, res, 'Notification template resolved', this.getRequestMeta(req));
  }

  /**
   * Render a template preview with provided context data.
   */
  async renderTemplate(req: RenderTemplateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'RENDER_NOTIFICATION_TEMPLATE');

      const rendered = this.templateService.render(
        req.validatedParams.templateKey,
        req.validatedBody.context,
      );

      if (!rendered) {
        throw { statusCode: 404, message: `Template ${req.validatedParams.templateKey} not found` };
      }

      this.logAction(req, 'RENDER_NOTIFICATION_TEMPLATE_SUCCESS', {
        templateKey: req.validatedParams.templateKey,
      });

      return { rendered };
    }, res, 'Notification template rendered', this.getRequestMeta(req));
  }
}

export const notificationsTemplateController = new NotificationsTemplateController();
