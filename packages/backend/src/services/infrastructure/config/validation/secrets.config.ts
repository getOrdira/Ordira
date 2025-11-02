/**
 * Secrets Validation Configuration Service
 * 
 * Manages required environment variables and secrets validation
 */

import { logConfigSafe } from '../../logging/core/logger.service';

/**
 * List of required environment variables that must be present in all environments
 */
const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'FRONTEND_URL'
] as const;

/**
 * Validates that all required environment variables are present.
 * This function is platform-agnostic and works for any deployment environment.
 * 
 * @throws {Error} If any required environment variables are missing
 */
export function validateRequiredSecrets(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // In development/test, we allow missing vars to provide better error messages
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    logConfigSafe('🔧 Development/test mode - validating environment variables');
  }

  // Check for missing required variables
  const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logConfigSafe('❌ Missing required environment variables', {
      missingVariables: missingVars,
      environment: nodeEnv,
      requiredCount: REQUIRED_ENV_VARS.length,
      missingCount: missingVars.length
    });
    
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      `Please ensure all required secrets are configured for the ${nodeEnv} environment.`
    );
  }

  logConfigSafe('✅ All required environment variables are present', {
    requiredVariablesCount: REQUIRED_ENV_VARS.length,
    environment: nodeEnv
  });
}

/**
 * Async wrapper for loadSecrets to maintain backward compatibility.
 * This function is deprecated in favor of validateRequiredSecrets().
 * 
 * @deprecated Use validateRequiredSecrets() instead
 */
export async function loadSecrets(): Promise<void> {
  validateRequiredSecrets();
}

