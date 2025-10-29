import 'dotenv/config';
import { enhancedDatabaseService } from '../services/infrastructure/database/core/enhancedDatabaseConnection.service';
import { databaseOpsPlaybook } from '../services/infrastructure/database/ops/databaseOpsPlaybook.service';

type SupportedAction = 'maintenance' | 'recommendations' | 'index-report' | 'health' | 'slow-queries' | 'schema-drift';

async function main() {
  const action = (process.argv[2] as SupportedAction) ?? 'health';

  await enhancedDatabaseService.initializeConnection();

  try {
    switch (action) {
      case 'maintenance': {
        const summary = await databaseOpsPlaybook.runMaintenance();
        console.log(JSON.stringify(summary, null, 2));
        break;
      }
      case 'recommendations': {
        const recs = await databaseOpsPlaybook.getMaintenanceRecommendations();
        console.log(JSON.stringify(recs, null, 2));
        break;
      }
      case 'index-report': {
        const report = await databaseOpsPlaybook.generateIndexReport();
        console.log(JSON.stringify(report, null, 2));
        break;
      }
      case 'slow-queries': {
        const slowQueries = await databaseOpsPlaybook.analyzeSlowQueries();
        console.log(JSON.stringify(slowQueries, null, 2));
        break;
      }
      case 'schema-drift': {
        await databaseOpsPlaybook.generateIndexReport();
        await databaseOpsPlaybook.runSchemaDriftCheck();
        console.log('Schema drift check passed.');
        break;
      }
      case 'health':
      default: {
        const snapshot = await databaseOpsPlaybook.collectHealthSnapshot();
        console.log(JSON.stringify(snapshot, null, 2));
        break;
      }
    }
  } finally {
    await enhancedDatabaseService.closeConnection();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
