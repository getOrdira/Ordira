// src/services/utils/config.service.ts

import Joi from 'joi';
import { logger } from '../../utils/logger';

/**
 * Centralized configuration service for managing all environment variables and settings
 */
export class ConfigService {
  private static instance: ConfigService;
  private config: Record<string, any> = {};

  private constructor() {
    this.loadConfiguration();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Load and validate all configuration
   */
  private loadConfiguration(): void {
    this.validateEnvironment();
    this.setupConfiguration();
  }

  /**
   * Validate environment variables using Joi schema
   */
  private validateEnvironment(): void {
    const schema = Joi.object({
      // Core application settings
      NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
      PORT: Joi.number().default(4000),
      
      // Database configuration
      MONGODB_URI: Joi.string().uri().required(),
      REDIS_URL: Joi.string().uri().optional(),
      
      // Authentication & Security
      JWT_SECRET: Joi.string().min(32).required(),
      JWT_ISSUER: Joi.string().default('Ordira-api'),
      JWT_AUDIENCE: Joi.string().default('ordira-app'),
      
      // Blockchain configuration
      BASE_RPC_URL: Joi.string().uri().required(),
      PRIVATE_KEY: Joi.string().pattern(/^(0x)?[a-fA-F0-9]{64}$/).required(),
      TOKEN_CONTRACT_ADDRESS: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      BLOCKCHAIN_NETWORK: Joi.string().optional(),
      CHAIN_ID: Joi.number().optional(),
      RELAYER_WALLET_ADDRESS: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
      DEPLOYER_KEY: Joi.string().optional(),
      
      // Payment processing
      STRIPE_SECRET_KEY: Joi.string().required(),
      STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
      
      // Frontend & CORS
      FRONTEND_URL: Joi.string().uri().required(),
      BASE_DOMAIN: Joi.string().required(),
      
      // File upload configuration
      UPLOAD_DIR: Joi.string().default('uploads'),
      MAX_FILE_SIZE: Joi.number().default(15728640), // 15MB
      AWS_ACCESS_KEY_ID: Joi.string().optional(),
      AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
      AWS_S3_BUCKET: Joi.string().optional(),
      AWS_REGION: Joi.string().default('us-east-1'),
      
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
      
      // Monitoring and services
      SENTRY_DSN: Joi.string().uri().optional(),  
      CLOUDFLARE_API_TOKEN: Joi.string().optional(),
      
      // Platform detection
      RENDER: Joi.string().optional(),
    })
      .unknown() // Allow other environment variables
      .required();

    const { error, value } = schema.validate(process.env, { abortEarly: false });
    
    if (error) {
      logger.error('❌ Environment validation error:');
      error.details.forEach(detail => {
        logger.error(`  ${detail.path.join('.')}: ${detail.message}`);
      });
      process.exit(1);
    }

    // Store validated configuration
    this.config = value;
  }

  /**
   * Setup configuration with computed values
   */
  private setupConfiguration(): void {
    // Platform detection
    this.config.isDevelopment = this.config.NODE_ENV === 'development';
    this.config.isProduction = this.config.NODE_ENV === 'production';
    this.config.isRender = !!this.config.RENDER;

    // Database configuration
    this.config.database = {
      mongodb: {
        uri: this.config.MONGODB_URI,
        options: {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        }
      },
      redis: this.config.REDIS_URL ? {
        url: this.config.REDIS_URL,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      } : null
    };

    // Authentication configuration
    this.config.auth = {
      jwt: {
        secret: this.config.JWT_SECRET,
        issuer: this.config.JWT_ISSUER,
        audience: this.config.JWT_AUDIENCE,
        expiresIn: '24h',
        refreshExpiresIn: '7d',
        algorithm: 'HS256'
      },
      password: {
        saltRounds: 12,
        minLength: 8
      }
    };

    // Blockchain configuration
    this.config.blockchain = {
      rpcUrl: this.config.BASE_RPC_URL,
      privateKey: this.config.PRIVATE_KEY,
      tokenContract: this.config.TOKEN_CONTRACT_ADDRESS,
      network: this.config.BLOCKCHAIN_NETWORK || 'base',
      chainId: this.config.CHAIN_ID || 8453,
      relayerWallet: this.config.RELAYER_WALLET_ADDRESS,
      deployerKey: this.config.DEPLOYER_KEY
    };

    // Payment configuration
    this.config.payment = {
      stripe: {
        secretKey: this.config.STRIPE_SECRET_KEY,
        webhookSecret: this.config.STRIPE_WEBHOOK_SECRET
      }
    };

    // File upload configuration
    this.config.upload = {
      directory: this.config.UPLOAD_DIR,
      maxFileSize: this.config.MAX_FILE_SIZE,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
      s3: {
        accessKeyId: this.config.AWS_ACCESS_KEY_ID,
        secretAccessKey: this.config.AWS_SECRET_ACCESS_KEY,
        bucket: this.config.AWS_S3_BUCKET,
        region: this.config.AWS_REGION
      }
    };

    // CORS configuration
    this.config.cors = {
      origin: this.config.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };

    // Email configuration
    this.config.email = {
      postmark: this.config.POSTMARK_API_KEY ? {
        apiKey: this.config.POSTMARK_API_KEY
      } : null,
      smtp: (this.config.SMTP_HOST && this.config.SMTP_USER) ? {
        host: this.config.SMTP_HOST,
        port: this.config.SMTP_PORT || 587,
        user: this.config.SMTP_USER,
        pass: this.config.SMTP_PASS,
        secure: false
      } : null
    };

    // SMS configuration
    this.config.sms = (this.config.TWILIO_SID && this.config.TWILIO_TOKEN) ? {
      twilio: {
        sid: this.config.TWILIO_SID,
        token: this.config.TWILIO_TOKEN,
        from: this.config.TWILIO_FROM
      }
    } : null;

    // Monitoring configuration
    this.config.monitoring = {
      sentry: this.config.SENTRY_DSN ? {
        dsn: this.config.SENTRY_DSN
      } : null,
      cloudflare: this.config.CLOUDFLARE_API_TOKEN ? {
        apiToken: this.config.CLOUDFLARE_API_TOKEN
      } : null
    };

    // Rate limiting configuration
    this.config.rateLimit = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      planLimits: {
        basic: 100,
        premium: 500,
        enterprise: 2000
      }
    };

    // Security configuration
    this.config.security = {
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
      },
      cors: this.config.cors
    };
  }

  /**
   * Get configuration value by key
   */
  public get<T = any>(key: string): T {
    return this.config[key];
  }

  /**
   * Get nested configuration value using dot notation
   */
  public getNested<T = any>(path: string): T {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  /**
   * Check if configuration key exists
   */
  public has(key: string): boolean {
    return key in this.config;
  }

  /**
   * Get all configuration
   */
  public getAll(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Get database configuration
   */
  public getDatabase() {
    return this.config.database;
  }

  /**
   * Get authentication configuration
   */
  public getAuth() {
    return this.config.auth;
  }

  /**
   * Get blockchain configuration
   */
  public getBlockchain() {
    return this.config.blockchain;
  }

  /**
   * Get payment configuration
   */
  public getPayment() {
    return this.config.payment;
  }

  /**
   * Get upload configuration
   */
  public getUpload() {
    return this.config.upload;
  }

  /**
   * Get CORS configuration
   */
  public getCors() {
    return this.config.cors;
  }

  /**
   * Get email configuration
   */
  public getEmail() {
    return this.config.email;
  }

  /**
   * Get SMS configuration
   */
  public getSms() {
    return this.config.sms;
  }

  /**
   * Get monitoring configuration
   */
  public getMonitoring() {
    return this.config.monitoring;
  }

  /**
   * Get rate limiting configuration
   */
  public getRateLimit() {
    return this.config.rateLimit;
  }

  /**
   * Get security configuration
   */
  public getSecurity() {
    return this.config.security;
  }

  /**
   * Check if running in development mode
   */
  public isDevelopment(): boolean {
    return this.config.isDevelopment;
  }

  /**
   * Check if running in production mode
   */
  public isProduction(): boolean {
    return this.config.isProduction;
  }

  /**
   * Check if running on Render platform
   */
  public isRender(): boolean {
    return this.config.isRender;
  }

  /**
   * Validate configuration for specific service
   */
  public validateService(serviceName: string): boolean {
    const serviceValidators: Record<string, () => boolean> = {
      database: () => !!this.config.MONGODB_URI,
      auth: () => !!this.config.JWT_SECRET,
      blockchain: () => !!(this.config.BASE_RPC_URL && this.config.PRIVATE_KEY),
      payment: () => !!this.config.STRIPE_SECRET_KEY,
      upload: () => !!(this.config.AWS_ACCESS_KEY_ID && this.config.AWS_SECRET_ACCESS_KEY && this.config.AWS_S3_BUCKET),
      email: () => !!(this.config.POSTMARK_API_KEY || (this.config.SMTP_HOST && this.config.SMTP_USER)),
      sms: () => !!(this.config.TWILIO_SID && this.config.TWILIO_TOKEN)
    };

    const validator = serviceValidators[serviceName];
    return validator ? validator() : false;
  }

  /**
   * Get missing configuration for a service
   */
  public getMissingConfig(serviceName: string): string[] {
    const missingConfigs: Record<string, string[]> = {
      database: ['MONGODB_URI'],
      auth: ['JWT_SECRET'],
      blockchain: ['BASE_RPC_URL', 'PRIVATE_KEY'],
      payment: ['STRIPE_SECRET_KEY'],
      upload: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'],
      email: ['POSTMARK_API_KEY or SMTP configuration'],
      sms: ['TWILIO_SID', 'TWILIO_TOKEN']
    };

    return missingConfigs[serviceName] || [];
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();
