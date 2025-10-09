import Joi from 'joi';
import { ChannelPreferences } from '../core/preferenceData.service';

const channelSchema = Joi.object<ChannelPreferences>({
  email: Joi.boolean().optional(),
  webhook: Joi.boolean().optional(),
  inApp: Joi.boolean().optional(),
});

export class PreferenceValidationService {
  validateChannelPreferences(channel: ChannelPreferences): void {
    const { error } = channelSchema.validate(channel);
    if (error) {
      throw error;
    }
  }
}

export const preferenceValidationService = new PreferenceValidationService();
