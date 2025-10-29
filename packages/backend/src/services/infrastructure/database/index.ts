import { EnhancedDatabaseService, enhancedDatabaseService } from './core/enhancedDatabaseConnection.service';
import { ConnectionManager, connectionManager } from './core/connectionManager.service';
import { TelemetryScheduler } from './core/telemetryScheduler.service';
import { MaintenanceRunner, maintenanceRunner } from './core/maintenanceRunner.service';
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
import { DatabaseHealthService } from './features/databaseHealth.service';
import { DatabasePlatformConfigService, databasePlatformConfigService } from './utils/databasePlatformConfig.service';
import { DatabaseOpsPlaybook, databaseOpsPlaybook } from './ops/databaseOpsPlaybook.service';
import { SchemaDriftDetectorService, schemaDriftDetectorService } from './utils/schemaDriftDetector.service';
import { AtlasBestPracticesService, atlasBestPracticesService } from './features/atlasBestPractices.service';
import { FilterGuardService, filterGuardService } from './utils/filterGuard.service';

export {
  EnhancedDatabaseService,
  enhancedDatabaseService,
  ConnectionManager,
  connectionManager,
  TelemetryScheduler,
  MaintenanceRunner,
  maintenanceRunner,
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
  databaseValidationService,
  DatabaseHealthService,
  DatabasePlatformConfigService,
  databasePlatformConfigService,
  DatabaseOpsPlaybook,
  databaseOpsPlaybook,
  SchemaDriftDetectorService,
  schemaDriftDetectorService,
  AtlasBestPracticesService,
  atlasBestPracticesService,
  FilterGuardService,
  filterGuardService
};

export const databaseServices = {
  enhancedDatabaseService,
  connectionManager,
  maintenanceRunner,
  readReplicaService,
  databaseService,
  databaseOptimizationService,
  queryOptimizationService,
  aggregationOptimizationService,
  databaseValidationService,
  databasePlatformConfigService,
  databaseOpsPlaybook,
  schemaDriftDetectorService,
  atlasBestPracticesService,
  filterGuardService
};

export type DatabaseServices = typeof databaseServices;

