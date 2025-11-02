/**
 * Logging Configuration Service
 * 
 * Manages logging configuration for the application
 */

import { LogLevel } from '../../logging';

export interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  filePath?: string;
  remoteEndpoint?: string;
  maxFileSize: string;
  maxFiles: number;
  format: 'json' | 'pretty';
  includeStackTrace: boolean;
  sensitiveFields: string[];
}

export const loggingConfig: LoggingConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  enableConsole: process.env.LOG_CONSOLE !== 'false',
  enableFile: process.env.LOG_FILE === 'true',
  enableRemote: process.env.LOG_REMOTE === 'true',
  filePath: process.env.LOG_FILE_PATH || './logs/app.log',
  remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT,
  maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10MB',
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
  format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
  includeStackTrace: process.env.LOG_INCLUDE_STACK === 'true',
  sensitiveFields: [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'creditCard',
    'ssn',
    'socialSecurityNumber'
  ]
};

/**
 * Get environment-specific logging configuration
 */
export function getLoggingConfig(): LoggingConfig {
  const config = { ...loggingConfig };
  
  switch (process.env.NODE_ENV) {
    case 'development':
      config.level = LogLevel.DEBUG;
      config.format = 'pretty';
      config.includeStackTrace = true;
      break;
      
    case 'test':
      config.level = LogLevel.WARN;
      config.enableConsole = false;
      config.enableFile = false;
      break;
      
    case 'production':
      config.level = LogLevel.INFO;
      config.format = 'json';
      config.includeStackTrace = false;
      config.enableFile = true;
      break;
  }
  
  return config;
}

