import { EnhancedDatabaseService, enhancedDatabaseService } from './core/enhancedDatabaseConnection.service';
import { DatabaseService as DatabaseAdministrationService, databaseService } from './features/databaseAdministration.service';
import { DatabaseOptimizationService, databaseOptimizationService } from './features/indexOptimization.service';
import { QueryOptimizationService, queryOptimizationService } from './features/queryOptimization.service';
import { AggregationOptimizationService, aggregationOptimizationService } from './features/aggregationOptimization.service';
import { databaseValidationService, DatabaseValidationService } from './validation/databaseValidation.service';

export {
  EnhancedDatabaseService,
  enhancedDatabaseService,
  DatabaseAdministrationService,
  databaseService,
  DatabaseOptimizationService,
  databaseOptimizationService,
  QueryOptimizationService,
  queryOptimizationService,
  AggregationOptimizationService,
  aggregationOptimizationService,
  DatabaseValidationService,
  databaseValidationService
};

export const databaseServices = {
  enhancedDatabaseService,
  databaseService,
  databaseOptimizationService,
  queryOptimizationService,
  aggregationOptimizationService,
  databaseValidationService
};

export type DatabaseServices = typeof databaseServices;
