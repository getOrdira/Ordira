import mongoose from 'mongoose';
import { logger } from '../../../../utils/logger';

export interface MaintenanceSummary {
  collectionsAnalyzed: number;
  indexesOptimized: number;
  indexesDropped: number;
  dataCleaned: number;
  statsUpdated: number;
  errors: number;
}

export interface MaintenanceRecommendations {
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  estimatedSpaceSavings: string;
}

export class MaintenanceRunner {
  async performMaintenance(): Promise<MaintenanceSummary> {
    logger.info('Starting database maintenance workflow...');

    const db = mongoose.connection.db;
    const maintenanceResults: MaintenanceSummary = {
      collectionsAnalyzed: 0,
      indexesOptimized: 0,
      indexesDropped: 0,
      dataCleaned: 0,
      statsUpdated: 0,
      errors: 0
    };

    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      if (collection.name.startsWith('system.')) {
        continue;
      }

      maintenanceResults.collectionsAnalyzed += 1;

      try {
        await db.command({ collStats: collection.name });
        maintenanceResults.statsUpdated += 1;
      } catch (error) {
        maintenanceResults.errors += 1;
        logger.warn(`Failed to collect stats for ${collection.name}`, error as Error);
        continue;
      }
    }

    logger.info('Database maintenance completed', maintenanceResults);
    return maintenanceResults;
  }

  async getMaintenanceRecommendations(): Promise<MaintenanceRecommendations> {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      const recommendations: string[] = [];
      let priority: MaintenanceRecommendations['priority'] = 'low';
      let estimatedSavings = 0;

      const collections = await db.listCollections().toArray();

      let unusedIndexes = 0;
      for (const collection of collections) {
        if (collection.name.startsWith('system.')) continue;

        try {
          const coll = db.collection(collection.name);
          const indexes = await coll.indexes();
          for (const index of indexes) {
            if (index.name === '_id_') continue;
            try {
              const indexStats = await coll.aggregate([
                { $indexStats: {} },
                { $match: { name: index.name } }
              ]).toArray();

              if (indexStats.length > 0 && indexStats[0].accesses?.ops === 0) {
                unusedIndexes++;
              }
            } catch {
              // ignore - requires profiling collect
            }
          }
        } catch (error) {
          logger.debug(`Skipping index analysis for ${collection.name}`, error as Error);
        }
      }

      if (unusedIndexes > 0) {
        recommendations.push(`Remove ${unusedIndexes} unused indexes to free up space`);
        estimatedSavings += unusedIndexes * 1_024 * 1_024;
        priority = 'medium';
      }

      const fragmentationRatio = stats.storageSize > 0 ? stats.dataSize / stats.storageSize : 1;
      if (fragmentationRatio < 0.8) {
        recommendations.push('Database fragmentation detected - run compact or resync maintenance job');
        priority = priority === 'low' ? 'medium' : priority;
      }

      if (stats.indexSize > stats.dataSize * 0.5) {
        recommendations.push('Index footprint is large relative to data size - review indexing strategy');
        priority = 'high';
      }

      if (recommendations.length === 0) {
        recommendations.push('Database is healthy - no immediate maintenance required');
      }

      return {
        priority,
        recommendations,
        estimatedSpaceSavings: `${Math.round(estimatedSavings / 1_024 / 1_024)}MB`
      };
    } catch (error) {
      logger.error('Failed to generate maintenance recommendations', error as Error);
      return {
        priority: 'medium',
        recommendations: ['Unable to gather statistics - schedule manual review'],
        estimatedSpaceSavings: 'Unknown'
      };
    }
  }
}

export const maintenanceRunner = new MaintenanceRunner();
