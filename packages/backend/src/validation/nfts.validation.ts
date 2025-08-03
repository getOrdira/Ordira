// src/validation/nfts.validation.ts

import Joi from 'joi';

export const deployNftSchema = Joi.object({
  name:    Joi.string().required(),
  symbol:  Joi.string().required(),
  baseUri: Joi.string().uri().required()
});

// ← Add this: ──────────────────────────────────────────────────────────
export const mintNftSchema = Joi.object({
  productId: Joi.string().required(),
  recipient: Joi.string()
    // must be a 0x-prefixed 42-hex-char address
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
});
