import Joi from 'joi';
import { JobData, JobResult, JobStats, JobExecutionContext, JobType } from '../services/infrastructure/resilience/utils/types';

/**
 * Validation schema for job types
 */
export const jobTypeSchema = Joi.string().valid(
  JobType.ANALYTICS_GENERATION,
  JobType.DATA_EXPORT,
  JobType.EMAIL_NOTIFICATION,
  JobType.BULK_UPDATE,
  JobType.CACHE_WARMUP,
  JobType.DATABASE_MAINTENANCE,
  JobType.REPORT_GENERATION,
  JobType.IMAGE_PROCESSING,
  JobType.BACKUP_CREATION
).required().description('Type of job to be processed');

/**
 * Validation schema for job data
 */
export const jobDataSchema = Joi.object<JobData>({
  type: jobTypeSchema,
  
  payload: Joi.object().required()
    .description('Job payload data'),
  
  userId: Joi.string().min(1).max(100).optional()
    .description('User ID associated with the job'),
  
  businessId: Joi.string().min(1).max(100).optional()
    .description('Business ID associated with the job'),
  
  priority: Joi.number().integer().min(0).max(10).optional()
    .description('Job priority (0 = highest, 10 = lowest)'),
  
  delay: Joi.number().integer().min(0).max(86400000).optional()
    .description('Delay in milliseconds before job execution'),
  
  attempts: Joi.number().integer().min(1).max(10).optional()
    .description('Maximum number of retry attempts')
});

/**
 * Validation schema for job result
 */
export const jobResultSchema = Joi.object<JobResult>({
  success: Joi.boolean().required()
    .description('Whether the job completed successfully'),
  
  data: Joi.object().optional()
    .description('Result data from job execution'),
  
  error: Joi.string().max(1000).optional()
    .description('Error message if job failed'),
  
  duration: Joi.number().integer().min(0).required()
    .description('Job execution duration in milliseconds')
});

/**
 * Validation schema for job statistics
 */
export const jobStatsSchema = Joi.object<JobStats>({
  total: Joi.number().integer().min(0).required()
    .description('Total number of jobs'),
  
  active: Joi.number().integer().min(0).required()
    .description('Number of active jobs'),
  
  waiting: Joi.number().integer().min(0).required()
    .description('Number of waiting jobs'),
  
  completed: Joi.number().integer().min(0).required()
    .description('Number of completed jobs'),
  
  failed: Joi.number().integer().min(0).required()
    .description('Number of failed jobs'),
  
  processing: Joi.object().pattern(
    Joi.string(),
    Joi.number().integer().min(0)
  ).required().description('Processing breakdown by job type')
});

/**
 * Validation schema for job execution context
 */
export const jobExecutionContextSchema = Joi.object<JobExecutionContext>({
  id: Joi.string().min(1).max(100).required()
    .description('Unique job execution ID'),
  
  data: jobDataSchema.required(),
  
  attemptsMade: Joi.number().integer().min(0).max(10).required()
    .description('Number of attempts made so far'),
  
  progress: Joi.function().required()
    .description('Progress callback function'),
  
  createdAt: Joi.date().required()
    .description('Job creation timestamp')
});

/**
 * Validation schema for job queue configuration
 */
export const jobQueueConfigSchema = Joi.object({
  concurrency: Joi.number().integer().min(1).max(50).optional()
    .description('Maximum number of concurrent jobs'),
  
  retryDelay: Joi.number().integer().min(1000).max(300000).optional()
    .description('Delay between retry attempts in milliseconds'),
  
  maxRetries: Joi.number().integer().min(0).max(10).optional()
    .description('Maximum number of retry attempts'),
  
  removeOnComplete: Joi.number().integer().min(1).max(1000).optional()
    .description('Number of completed jobs to keep'),
  
  removeOnFail: Joi.number().integer().min(1).max(1000).optional()
    .description('Number of failed jobs to keep')
});

/**
 * Validation schema for job processor registration
 */
export const jobProcessorRegistrationSchema = Joi.object({
  jobType: jobTypeSchema,
  
  processor: Joi.function().required()
    .description('Job processor function'),
  
  concurrency: Joi.number().integer().min(1).max(10).optional()
    .description('Concurrency limit for this processor'),
  
  priority: Joi.number().integer().min(0).max(10).optional()
    .description('Processor priority')
});

/**
 * Validation schema for job scheduling options
 */
export const jobSchedulingSchema = Joi.object({
  delay: Joi.number().integer().min(0).max(86400000).optional()
    .description('Delay in milliseconds before execution'),
  
  priority: Joi.number().integer().min(0).max(10).optional()
    .description('Job priority'),
  
  attempts: Joi.number().integer().min(1).max(10).optional()
    .description('Maximum retry attempts'),
  
  backoff: Joi.object({
    type: Joi.string().valid('fixed', 'exponential').required(),
    delay: Joi.number().integer().min(1000).required()
  }).optional().description('Backoff strategy for retries')
});

/**
 * Job Queue Validation Service
 */
export class JobQueueValidationService {
  /**
   * Validate job data
   */
  validateJobData(data: unknown): JobData {
    const { error, value } = jobDataSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid job data: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate job result
   */
  validateJobResult(result: unknown): JobResult {
    const { error, value } = jobResultSchema.validate(result, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid job result: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate job statistics
   */
  validateJobStats(stats: unknown): JobStats {
    const { error, value } = jobStatsSchema.validate(stats, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid job stats: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate job execution context
   */
  validateExecutionContext(context: unknown): JobExecutionContext {
    const { error, value } = jobExecutionContextSchema.validate(context, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid job execution context: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate job queue configuration
   */
  validateQueueConfig(config: unknown): { concurrency?: number; retryDelay?: number; maxRetries?: number; removeOnComplete?: number; removeOnFail?: number } {
    const { error, value } = jobQueueConfigSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid job queue configuration: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate job processor registration
   */
  validateProcessorRegistration(options: unknown): { jobType: JobType; processor: Function; concurrency?: number; priority?: number } {
    const { error, value } = jobProcessorRegistrationSchema.validate(options, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid job processor registration: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate job scheduling options
   */
  validateScheduling(options: unknown): { delay?: number; priority?: number; attempts?: number; backoff?: { type: string; delay: number } } {
    const { error, value } = jobSchedulingSchema.validate(options, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid job scheduling options: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate job type
   */
  validateJobType(jobType: unknown): JobType {
    const { error, value } = jobTypeSchema.validate(jobType, {
      abortEarly: false
    });

    if (error) {
      throw new Error(`Invalid job type: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }
}

export const jobQueueValidationService = new JobQueueValidationService();
