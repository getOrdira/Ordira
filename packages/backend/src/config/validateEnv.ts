// src/config/validateEnv.ts
import Joi from 'joi';

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
  PORT: Joi.number().default(4000),
  
  // Database - MongoDB URI required
  MONGODB_URI: Joi.string().uri().required(),
  
  // Blockchain configuration
  BASE_RPC_URL: Joi.string().uri().required(),
  PRIVATE_KEY: Joi.string().length(66).required(),
  TOKEN_CONTRACT_ADDRESS: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  // Factory addresses are stored in database, not environment variables
  
  // Authentication
  JWT_SECRET: Joi.string().min(32).required(),
  
  // Payment processing
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  
  // Frontend URL for CORS
  FRONTEND_URL: Joi.string().uri().required(),
  
  // Google Cloud Platform - Not used (using Render environment variables)
  
  // Optional monitoring and services
  SENTRY_DSN: Joi.string().uri().optional(),
  REDIS_URL: Joi.string().uri().optional(),
  CLOUDFLARE_API_TOKEN: Joi.string().optional(),
  
  // Email services
  POSTMARK_API_KEY: Joi.string().optional(),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  
  // SMS services
  TWILIO_SID: Joi.string().optional(),
  TWILIO_TOKEN: Joi.string().optional(),
  TWILIO_FROM: Joi.string().optional(),
  
  // File upload configuration
  UPLOAD_DIR: Joi.string().default('uploads'),
  MAX_FILE_SIZE: Joi.number().default(15728640), // 15MB
  
  // Platform detection
  RENDER: Joi.string().optional(), // Render sets this automatically
  
  // Additional blockchain config
  BLOCKCHAIN_NETWORK: Joi.string().optional(),
  CHAIN_ID: Joi.number().optional(),
  RELAYER_WALLET_ADDRESS: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  DEPLOYER_KEY: Joi.string().optional()
})
  .unknown() // Allow other environment variables
  .required();

export function validateEnv() {
  const { error, value } = schema.validate(process.env, { abortEarly: false });
  
  if (error) {
    console.error('Environment validation error:');
    error.details.forEach(detail => {
      console.error(`  ${detail.path.join('.')}: ${detail.message}`);
    });
    process.exit(1);
  }
  
  // Log platform detection
  if (process.env.RENDER) {
    console.log('Render platform detected');
  }
  
  // No GCP validation needed - using Render environment variables
  
  Object.assign(process.env, value);
}

