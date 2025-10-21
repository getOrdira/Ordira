import { EnhancedDatabaseService, enhancedDatabaseService } from './core/enhancedDatabaseConnection.service';
import {
  ReadReplicaService,
  readReplicaService,
  executeAnalyticsQuery,
  executeReportingQuery,
  executeReadOnlyQuery
} from './core/readReplica.service';
import { DatabaseService as DatabaseAdministrationService, databaseService } from './features/databaseAdministration.service';
import { DatabaseOptimizationService, databaseOptimizationService } from './features/indexOptimization.service';
import { QueryOptimizationService, queryOptimizationService } from './features/queryOptimization.service';
import { AggregationOptimizationService, aggregationOptimizationService } from './features/aggregationOptimization.service';
import { databaseValidationService, DatabaseValidationService } from './validation/databaseValidation.service';

export {
  EnhancedDatabaseService,
  enhancedDatabaseService,
  ReadReplicaService,
  readReplicaService,
  executeAnalyticsQuery,
  executeReportingQuery,
  executeReadOnlyQuery,
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
  readReplicaService,
  databaseService,
  databaseOptimizationService,
  queryOptimizationService,
  aggregationOptimizationService,
  databaseValidationService
};

export type DatabaseServices = typeof databaseServices;
