// Deprecated location: src/services/external/read-replica.service.ts
// Re-export the modular read replica service.

export {
  ReadReplicaService,
  readReplicaService,
  type ReadReplicaConfig,
  type ReplicaStats,
  type QueryOptions,
  executeAnalyticsQuery,
  executeReportingQuery,
  executeReadOnlyQuery
} from '../infrastructure/database/core/readReplica.service';
