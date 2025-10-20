import Joi from 'joi';

export const captchaVerifySchema = Joi.object({
  token: Joi.string().max(4096).required(),
  action: Joi.string().max(128).allow(null, ''),
  bypassToken: Joi.string().max(512).allow(null, ''),
  failureCount: Joi.number().integer().min(0).max(100).default(0),
  metadata: Joi.object().unknown(true).optional()
});

export const captchaHeadersSchema = Joi.object({
  'x-captcha-token': Joi.string().max(4096)
}).unknown(true);

export const captchaStatusQuerySchema = Joi.object({
  includeConfig: Joi.boolean().default(false)
});