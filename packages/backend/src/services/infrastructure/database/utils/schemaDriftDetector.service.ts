import { databaseOptimizationService } from '../features/indexOptimization.service';
import { logger } from '../../../../utils/logger';
import mongoose from 'mongoose';
import { monitoringService } from '../../../external/monitoring.service';

export interface SchemaDriftSummary {
  missingIndexes: number;
  extraIndexes: number;
  affectedCollections: Array<{
    collection: string;
    missingIndexes: string[];
    extraIndexes: string[];
    schemaVersion?: string;
    liveVersion?: string;
    versionDrift?: boolean;
  }>;
  schemaVersionDrift: boolean;
  totalDriftIssues: number;
}

export interface IndexDriftDetails {
  collection: string;
  expectedIndexes: Array<{
    name: string;
    keys: Record<string, number>;
    options: Record<string, any>;
  }>;
  liveIndexes: Array<{
    name: string;
    keys: Record<string, number>;
    options: Record<string, any>;
  }>;
  missingIndexes: string[];
  extraIndexes: string[];
  mismatchedIndexes: Array<{
    name: string;
    expected: any;
    actual: any;
  }>;
}

export interface SchemaVersionInfo {
  collection: string;
  mongooseSchemaVersion: string;
  liveSchemaVersion: string | null;
  versionMatch: boolean;
  lastUpdated: Date;
}

export class SchemaDriftDetectorService {
  private readonly SCHEMA_VERSION_COLLECTION = 'schema_versions';
  private readonly DRIFT_THRESHOLD_WARNING = 5;
  private readonly DRIFT_THRESHOLD_CRITICAL = 10;

  async detectIndexDrift(): Promise<SchemaDriftSummary> {
    try {
      const report = await databaseOptimizationService.generateIndexReport();
      const schemaVersions = await this.getSchemaVersions();
      
      const affectedCollections = report.items
        .map((item) => {
          const schemaVersion = schemaVersions.find(sv => sv.collection === item.collection);
          const liveVersion = schemaVersion?.liveSchemaVersion;
          const mongooseVersion = schemaVersion?.mongooseSchemaVersion;

          return {
            collection: item.collection,
            missingIndexes: item.missingIndexes || [],
            extraIndexes: [], // extraIndexes not available in current report structure
            schemaVersion: mongooseVersion,
            liveVersion: liveVersion || 'unknown',
            versionDrift: schemaVersion ? !schemaVersion.versionMatch : false
          };
        })
        .filter((item) => 
          item.missingIndexes.length > 0 || 
          item.extraIndexes.length > 0 || 
          (schemaVersions.find(sv => sv.collection === item.collection) ? !schemaVersions.find(sv => sv.collection === item.collection)!.versionMatch : false)
        );

      const missingIndexes = affectedCollections.reduce((sum, item) => sum + item.missingIndexes.length, 0);
      const extraIndexes = affectedCollections.reduce((sum, item) => sum + item.extraIndexes.length, 0);
      const schemaVersionDrift = affectedCollections.some(item => item.versionDrift);
      const totalDriftIssues = missingIndexes + extraIndexes + (schemaVersionDrift ? 1 : 0);

      const summary: SchemaDriftSummary = {
        missingIndexes,
        extraIndexes,
        affectedCollections,
        schemaVersionDrift,
        totalDriftIssues
      };

      // Record metrics
      this.recordDriftMetrics(summary);

      return summary;

    } catch (error) {
      logger.error('Failed to detect schema drift:', error);
      
      monitoringService.recordMetric({
        name: 'schema_drift_detection_error',
        value: 1,
        tags: { error: error instanceof Error ? error.message : 'unknown' }
      });

      throw error;
    }
  }

  async detectDetailedIndexDrift(collectionName: string): Promise<IndexDriftDetails> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const collection = db.collection(collectionName);
      const liveIndexes = await collection.indexes() as Array<{
        name: string;
        key: Record<string, number>;
        [key: string]: any;
      }>;
      
      // Get expected indexes from Mongoose model
      const expectedIndexes = this.getExpectedIndexes(collectionName);
      
      const missingIndexes: string[] = [];
      const extraIndexes: string[] = [];
      const mismatchedIndexes: Array<{ name: string; expected: any; actual: any }> = [];

      // Check for missing indexes
      for (const expectedIndex of expectedIndexes) {
        const liveIndex = liveIndexes.find(idx => idx.name === expectedIndex.name);
        if (!liveIndex) {
          missingIndexes.push(expectedIndex.name);
        } else {
          // Check for mismatches
          if (!this.compareIndexes(expectedIndex, liveIndex)) {
            mismatchedIndexes.push({
              name: expectedIndex.name,
              expected: expectedIndex,
              actual: liveIndex
            });
          }
        }
      }

      // Check for extra indexes
      for (const liveIndex of liveIndexes) {
        const expectedIndex = expectedIndexes.find(idx => idx.name === liveIndex.name);
        if (!expectedIndex) {
          extraIndexes.push(liveIndex.name);
        }
      }

      return {
        collection: collectionName,
        expectedIndexes,
        liveIndexes: liveIndexes.map(idx => ({
          name: idx.name,
          keys: idx.key,
          options: Object.fromEntries(
            Object.entries(idx).filter(([k]) => k !== 'name' && k !== 'key')
          )
        })),
        missingIndexes,
        extraIndexes,
        mismatchedIndexes
      };

    } catch (error) {
      logger.error(`Failed to detect detailed index drift for collection ${collectionName}:`, error);
      throw error;
    }
  }

  async assertClean(): Promise<void> {
    const summary = await this.detectIndexDrift();

    if (summary.totalDriftIssues > this.DRIFT_THRESHOLD_CRITICAL) {
      const details = summary.affectedCollections
        .map((item) => {
          const issues = [];
          if (item.missingIndexes.length > 0) {
            issues.push(`missing: ${item.missingIndexes.join(', ')}`);
          }
          if (item.extraIndexes.length > 0) {
            issues.push(`extra: ${item.extraIndexes.join(', ')}`);
          }
          if (item.versionDrift) {
            issues.push(`version drift: ${item.schemaVersion} vs ${item.liveVersion}`);
          }
          return `${item.collection}: ${issues.join('; ')}`;
        })
        .join('; ');

      throw new Error(
        `Critical schema drift detected. ${summary.totalDriftIssues} issues across ${summary.affectedCollections.length} collections. Details: ${details}`
      );
    }

    if (summary.totalDriftIssues > this.DRIFT_THRESHOLD_WARNING) {
      logger.warn(`Schema drift warning: ${summary.totalDriftIssues} issues detected`, {
        missingIndexes: summary.missingIndexes,
        extraIndexes: summary.extraIndexes,
        schemaVersionDrift: summary.schemaVersionDrift,
        affectedCollections: summary.affectedCollections.length
      });
    }
  }

  async updateSchemaVersion(collectionName: string, version: string): Promise<void> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const schemaVersionsCollection = db.collection(this.SCHEMA_VERSION_COLLECTION);
      
      await schemaVersionsCollection.updateOne(
        { collection: collectionName },
        {
          $set: {
            collection: collectionName,
            mongooseSchemaVersion: version,
            lastUpdated: new Date()
          }
        },
        { upsert: true }
      );

      logger.info(`Updated schema version for collection ${collectionName} to ${version}`);

    } catch (error) {
      logger.error(`Failed to update schema version for collection ${collectionName}:`, error);
      throw error;
    }
  }

  async getSchemaVersions(): Promise<SchemaVersionInfo[]> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        return [];
      }

      const schemaVersionsCollection = db.collection(this.SCHEMA_VERSION_COLLECTION);
      const versions = await schemaVersionsCollection.find({}).toArray();

      return versions.map(version => ({
        collection: version.collection,
        mongooseSchemaVersion: version.mongooseSchemaVersion,
        liveSchemaVersion: version.liveSchemaVersion || null,
        versionMatch: version.mongooseSchemaVersion === version.liveSchemaVersion,
        lastUpdated: version.lastUpdated
      }));

    } catch (error) {
      logger.error('Failed to get schema versions:', error);
      return [];
    }
  }

  async validateSchemaConsistency(): Promise<boolean> {
    try {
      const summary = await this.detectIndexDrift();
      
      // Check if there are any critical issues
      const hasCriticalIssues = summary.totalDriftIssues > this.DRIFT_THRESHOLD_CRITICAL;
      
      if (hasCriticalIssues) {
        logger.error('Schema consistency validation failed - critical drift detected', {
          totalIssues: summary.totalDriftIssues,
          affectedCollections: summary.affectedCollections.length
        });
        
        monitoringService.recordMetric({
          name: 'schema_consistency_validation',
          value: 0,
          tags: { status: 'failed', reason: 'critical_drift' }
        });
        
        return false;
      }

      logger.info('Schema consistency validation passed', {
        totalIssues: summary.totalDriftIssues,
        affectedCollections: summary.affectedCollections.length
      });

      monitoringService.recordMetric({
        name: 'schema_consistency_validation',
        value: 1,
        tags: { status: 'passed' }
      });

      return true;

    } catch (error) {
      logger.error('Schema consistency validation failed:', error);
      
      monitoringService.recordMetric({
        name: 'schema_consistency_validation',
        value: 0,
        tags: { status: 'failed', reason: 'error' }
      });

      return false;
    }
  }

  private getExpectedIndexes(collectionName: string): Array<{ name: string; keys: Record<string, number>; options: Record<string, any> }> {
    // This would typically get indexes from Mongoose models
    // For now, return empty array - this should be implemented based on your models
    return [];
  }

  private compareIndexes(expected: any, actual: any): boolean {
    // Compare index keys
    const expectedKeys = JSON.stringify(expected.keys);
    const actualKeys = JSON.stringify(actual.key);
    
    if (expectedKeys !== actualKeys) {
      return false;
    }

    // Compare critical options
    const criticalOptions = ['unique', 'sparse', 'background', 'expireAfterSeconds'];
    
    for (const option of criticalOptions) {
      if (expected.options[option] !== actual[option]) {
        return false;
      }
    }

    return true;
  }


  private recordDriftMetrics(summary: SchemaDriftSummary): void {
    monitoringService.recordMetric({
      name: 'schema_drift_missing_indexes',
      value: summary.missingIndexes,
      tags: {}
    });

    monitoringService.recordMetric({
      name: 'schema_drift_extra_indexes',
      value: summary.extraIndexes,
      tags: {}
    });

    monitoringService.recordMetric({
      name: 'schema_drift_total_issues',
      value: summary.totalDriftIssues,
      tags: {}
    });

    monitoringService.recordMetric({
      name: 'schema_drift_affected_collections',
      value: summary.affectedCollections.length,
      tags: {}
    });

    monitoringService.recordMetric({
      name: 'schema_version_drift',
      value: summary.schemaVersionDrift ? 1 : 0,
      tags: {}
    });
  }
}

export const schemaDriftDetectorService = new SchemaDriftDetectorService();
