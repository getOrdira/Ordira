import { maintenanceRunner } from '../core/maintenanceRunner.service';
import { databaseOptimizationService } from '../features/indexOptimization.service';
import { databaseService } from '../features/databaseAdministration.service';
import { enhancedDatabaseService } from '../core/enhancedDatabaseConnection.service';
import { schemaDriftDetectorService } from '../utils/schemaDriftDetector.service';

export class DatabaseOpsPlaybook {
  async runMaintenance() {
    return maintenanceRunner.performMaintenance();
  }

  async getMaintenanceRecommendations() {
    return maintenanceRunner.getMaintenanceRecommendations();
  }

  async generateIndexReport() {
    const report = await databaseOptimizationService.generateIndexReport();
    databaseOptimizationService.logIndexReport(report);
    return report;
  }

  async analyzeSlowQueries() {
    const slowQueries = await databaseService.getSlowQueries();
    return slowQueries;
  }

  async collectHealthSnapshot() {
    return enhancedDatabaseService.collectHealthSnapshot();
  }

  async runSchemaDriftCheck() {
    await schemaDriftDetectorService.assertClean();
  }
}

export const databaseOpsPlaybook = new DatabaseOpsPlaybook();

