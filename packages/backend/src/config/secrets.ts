// src/config/secrets.ts
import { logger, logConfigSafe } from '../utils/logger';
import { sanitizeEnvironmentVariables } from '../utils/dataSanitizer';

export async function loadSecrets(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV;
  const isRender = process.env.RENDER;

  if (nodeEnv === 'development' || nodeEnv === 'test') {
    logConfigSafe('🔧 Development mode - using local .env file');
    return;
  }

  if (isRender) {
    logConfigSafe('🚀 Render platform detected - using Render environment variables', {
      platform: 'Render',
      secretsManagement: 'Render dashboard'
    });
    
    // Validate that critical environment variables are present
    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'FRONTEND_URL'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logConfigSafe('❌ Missing required environment variables', {
        missingVariables: missingVars,
        platform: 'Render'
      });
      throw new Error(`Missing required environment variables in Render: ${missingVars.join(', ')}`);
    }

    logConfigSafe('✅ All required environment variables are present', {
      requiredVariablesCount: requiredVars.length,
      platform: 'Render'
    });
    return;
  }

  // For other platforms, ensure critical variables are set
  logConfigSafe('🌐 Using system environment variables', {
    platform: 'System'
  });
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'FRONTEND_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logConfigSafe('❌ Missing required environment variables', {
      missingVariables: missingVars,
      platform: 'System'
    });
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  logConfigSafe('✅ All required environment variables are present', {
    requiredVariablesCount: requiredVars.length,
    platform: 'System'
  });
}
