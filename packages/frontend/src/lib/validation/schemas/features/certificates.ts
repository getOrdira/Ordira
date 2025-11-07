// src/lib/validation/schemas/features/certificates.ts
// Frontend validation schemas for certificate issuance, transfers, and recipients.

import Joi from 'joi';

import { commonSchemas } from '../commonSchemas';

const REQUIRED_EMAIL_MESSAGE = 'Email is required';
const REQUIRED_PHONE_MESSAGE = 'Phone number is required';
const REQUIRED_WALLET_MESSAGE = 'Wallet address is required';

const emailRecipientSchema = Joi.string()
  .trim()
  .lowercase()
  .required()
  .email({ tlds: { allow: false } })
  .max(254)
  .custom((value, helpers) => {
    const [localPart] = value.split('@');
    if (localPart.length > 64) {
      return helpers.error('any.invalid', { message: 'Email local part is too long' });
    }

    return value;
  })
  .messages({
    'any.required': REQUIRED_EMAIL_MESSAGE,
    'string.empty': REQUIRED_EMAIL_MESSAGE,
    'string.email': 'Invalid email format',
    'string.max': 'Email address is too long',
    'any.invalid': '{{#message}}'
  });

const phoneRecipientSchema = Joi.string()
  .trim()
  .required()
  .custom((value, helpers) => {
    const cleaned = value.replace(/[\s\-()]/g, '');
    if (!/^\+?[1-9]\d{1,14}$/.test(cleaned)) {
      return helpers.error('any.invalid', {
        message: 'Invalid phone number format. Use E.164 format: +1234567890'
      });
    }

    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  })
  .messages({
    'any.required': REQUIRED_PHONE_MESSAGE,
    'string.empty': REQUIRED_PHONE_MESSAGE,
    'any.invalid': '{{#message}}'
  });

const walletRecipientSchema = Joi.string()
  .trim()
  .required()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .messages({
    'any.required': REQUIRED_WALLET_MESSAGE,
    'string.empty': REQUIRED_WALLET_MESSAGE,
    'string.pattern.base': 'Invalid wallet address format. Must be a 42-character Ethereum address starting with 0x'
  });

const contactMethodSchema = Joi.string()
  .valid('email', 'sms', 'wallet')
  .required()
  .messages({
    'any.only': 'Contact method must be one of: email, sms, wallet',
    'any.required': 'Contact method is required'
  });

const certificateDuplicateCheckSchema: Joi.ObjectSchema<{ businessId: string; productId: string; recipient: string }> = Joi.object({
  businessId: commonSchemas.mongoId
    .required()
    .messages({
      'any.required': 'businessId is required',
      'string.empty': 'businessId is required'
    }),
  productId: commonSchemas.mongoId
    .required()
    .messages({
      'any.required': 'productId is required',
      'string.empty': 'productId is required'
    }),
  recipient: Joi.string().trim().required().messages({
    'string.empty': 'Recipient is required',
    'any.required': 'Recipient is required'
  })
});

const certificateOwnershipSchema: Joi.ObjectSchema<{ certificateId: string; businessId: string }> = Joi.object({
  certificateId: commonSchemas.mongoId
    .required()
    .messages({
      'any.required': 'certificateId is required',
      'string.empty': 'certificateId is required'
    }),
  businessId: commonSchemas.mongoId
    .required()
    .messages({
      'any.required': 'businessId is required',
      'string.empty': 'businessId is required'
    })
});

const transferParametersSchema: Joi.ObjectSchema<{
  contractAddress: string;
  tokenId: string | number;
  brandWallet: string;
}> = Joi.object({
  contractAddress: Joi.string()
    .trim()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid contract address format',
      'string.empty': 'Contract address is required',
      'any.required': 'Contract address is required'
    }),
  tokenId: Joi.alternatives()
    .try(
      Joi.string().trim().min(1),
      Joi.number().integer().min(0)
    )
    .required()
    .messages({
      'any.required': 'Token ID is required',
      'string.empty': 'Token ID is required',
      'alternatives.match': 'Token ID must be a non-empty string or a non-negative integer'
    }),
  brandWallet: Joi.string()
    .trim()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid brand wallet address format',
      'string.empty': 'Brand wallet address is required',
      'any.required': 'Brand wallet address is required'
    })
});

const recipientValidationSchema = Joi.object({
  recipient: Joi.string().required().messages({
    'any.required': 'Recipient is required',
    'string.empty': 'Recipient is required'
  }),
  contactMethod: contactMethodSchema
})
  .custom((value, helpers) => {
    const { contactMethod, recipient } = value;

    if (contactMethod === 'email') {
      const validation = emailRecipientSchema.validate(recipient);
      if (validation.error) {
        return helpers.error('any.invalid', { message: validation.error.message });
      }

      return {
        contactMethod,
        recipient: validation.value
      };
    }

    if (contactMethod === 'sms') {
      const validation = phoneRecipientSchema.validate(recipient);
      if (validation.error) {
        return helpers.error('any.invalid', { message: validation.error.message });
      }

      return {
        contactMethod,
        recipient: validation.value
      };
    }

    if (contactMethod === 'wallet') {
      const validation = walletRecipientSchema.validate(recipient);
      if (validation.error) {
        return helpers.error('any.invalid', { message: validation.error.message });
      }

      return {
        contactMethod,
        recipient: validation.value
      };
    }

    return helpers.error('any.invalid', { message: `Invalid contact method: ${contactMethod}` });
  })
  .messages({
    'any.invalid': '{{#message}}'
  });

const recipientListSchema = Joi.array()
  .items(
    Joi.object({
      address: Joi.string().required(),
      contactMethod: contactMethodSchema
    })
      .custom((value, helpers) => {
        const { contactMethod, address } = value;
        let sanitized: string;

        if (contactMethod === 'email') {
          const validation = emailRecipientSchema.validate(address);
          if (validation.error) {
            return helpers.error('any.invalid', { message: validation.error.message });
          }
          sanitized = validation.value as string;
        } else if (contactMethod === 'sms') {
          const validation = phoneRecipientSchema.validate(address);
          if (validation.error) {
            return helpers.error('any.invalid', { message: validation.error.message });
          }
          sanitized = validation.value as string;
        } else {
          const validation = walletRecipientSchema.validate(address);
          if (validation.error) {
            return helpers.error('any.invalid', { message: validation.error.message });
          }
          sanitized = validation.value as string;
        }

        return {
          contactMethod,
          address: sanitized
        };
      })
  )
  .max(500)
  .custom((recipients, helpers) => {
    const seen = new Set<string>();
    for (const entry of recipients) {
      const key = `${entry.contactMethod}:${entry.address.toLowerCase()}`;
      if (seen.has(key)) {
        return helpers.error('any.invalid', {
          message: 'Duplicate recipients detected in batch payload'
        });
      }
      seen.add(key);
    }

    return recipients;
  })
  .messages({
    'any.invalid': '{{#message}}'
  });

/**
 * Certificate feature specific Joi schemas mirroring backend validation behaviour.
 */
export const certificatesFeatureSchemas = {
  duplicateCheck: certificateDuplicateCheckSchema,
  ownership: certificateOwnershipSchema,
  transferParameters: transferParametersSchema,
  recipient: recipientValidationSchema,
  recipientList: recipientListSchema,
  emailRecipient: emailRecipientSchema,
  phoneRecipient: phoneRecipientSchema,
  walletRecipient: walletRecipientSchema
} as const;
