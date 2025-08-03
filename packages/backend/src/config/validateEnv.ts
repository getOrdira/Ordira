// src/config/validateEnv.ts
import Joi from 'joi';

const schema = Joi.object({
  NODE_ENV:               Joi.string().valid('development','staging','production').required(),
  PORT:                   Joi.number().default(3000),
  MONGODB_URI:            Joi.string().uri().required(),                
  BASE_RPC_URL:           Joi.string().uri().required(),
  PRIVATE_KEY:            Joi.string().length(66).required(),           
  JWT_SECRET:             Joi.string().min(32).required(),
  STRIPE_SECRET_KEY:      Joi.string().required(),
  TOKEN_CONTRACT_ADDRESS: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  VOTING_FACTORY_ADDRESS: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  NFT_FACTORY_ADDRESS:    Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  FRONTEND_URL:           Joi.string().uri().required(),
  SENTRY_DSN:             Joi.string().uri().optional(),               
  GCP_PROJECT_ID:         Joi.string().required(),
  GCP_SECRET_NAME:        Joi.string().required()
})
  .unknown()  // allow other vars (e.g. UPLOAD_DIR, webhook secrets)
  .required();

export function validateEnv() {
  const { error, value } = schema.validate(process.env, { abortEarly: false });
  if (error) {
    console.error(
      '❌ Environment validation error:',
      error.details.map(d => d.message).join('; ')
    );
    process.exit(1);
  }
  Object.assign(process.env, value);
}

