import { logger } from '../../../../utils/logger';
import { databasePlatformConfigService } from '../utils/databasePlatformConfig.service';
import { ConnectionManager, connectionManager } from './connectionManager.service';
import { TelemetryScheduler } from './telemetryScheduler.service';
import { MaintenanceRunner, maintenanceRunner } from './maintenanceRunner.service';
import { DatabaseHealthService } from '../features/databaseHealth.service';

export class EnhancedDatabaseService {
  private readonly platformConfigService = databasePlatformConfigService;
  private readonly connectionManager: ConnectionManager = connectionManager;
  private readonly telemetryScheduler = new TelemetryScheduler(this.connectionManager);
  private readonly maintenanceRunner: MaintenanceRunner = maintenanceRunner;
  private readonly healthService = new DatabaseHealthService(this.connectionManager);

  async initializeConnection(): Promise<void> {
    const config = this.platformConfigService.build();
    await this.connectionManager.connect(config);
    this.telemetryScheduler.start();
    logger.info('Enhanced database service initialised');
  }

  async closeConnection(): Promise<void> {
    this.telemetryScheduler.stop();
    await this.connectionManager.disconnect();
    logger.info('Enhanced database service stopped');
  }

  getConnectionStats() {
    return this.connectionManager.getStats();
  }

  async performMaintenance() {
    return this.maintenanceRunner.performMaintenance();
  }

  async getMaintenanceRecommendations() {
    return this.maintenanceRunner.getMaintenanceRecommendations();
  }

  async collectHealthSnapshot() {
    const snapshot = await this.healthService.collectSnapshot();
    this.healthService.emitMetrics(snapshot);
    return snapshot;
  }
}

export const enhancedDatabaseService = new EnhancedDatabaseService();
