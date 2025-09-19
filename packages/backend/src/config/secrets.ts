// src/config/secrets.ts
import { logger } from '../utils/logger';

export async function loadSecrets(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV;
  const isRender = process.env.RENDER;

  if (nodeEnv === 'development' || nodeEnv === 'test') {
    logger.info('🔧 Development mode - using local .env file');
    return;
  }

  if (isRender) {
    logger.info('🚀 Render platform detected - using Render environment variables');
    logger.info('   All secrets managed through Render dashboard');
    
    // Validate that critical environment variables are present
    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'FRONTEND_URL'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables in Render: ${missingVars.join(', ')}`);
    }

    logger.info('✅ All required environment variables are present');
    return;
  }

  // For other platforms, ensure critical variables are set
  logger.info('🌐 Using system environment variables');
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'FRONTEND_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}
