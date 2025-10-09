import Joi from 'joi';
import { NotificationFilters } from '../types/notificationFilters';

const filtersSchema = Joi.object<NotificationFilters>({
  businessId: Joi.string().optional(),
  manufacturerId: Joi.string().optional(),
  type: Joi.string().optional(),
  category: Joi.string().optional(),
  priority: Joi.string().optional(),
  read: Joi.boolean().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  limit: Joi.number().min(1).max(200).optional(),
  offset: Joi.number().min(0).optional(),
});

export class NotificationValidationService {
  validateFilters(filters: NotificationFilters): void {
    const { error } = filtersSchema.validate(filters);
    if (error) {
      throw error;
    }
  }
}

export const notificationValidationService = new NotificationValidationService();
