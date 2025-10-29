import 'dotenv/config';
import { enhancedDatabaseService } from '../services/infrastructure/database/core/enhancedDatabaseConnection.service';
import { schemaDriftDetectorService } from '../services/infrastructure/database/utils/schemaDriftDetector.service';

async function main() {
  await enhancedDatabaseService.initializeConnection();

  try {
    await schemaDriftDetectorService.assertClean();
    console.log('Schema drift check passed: no missing indexes detected.');
  } finally {
    await enhancedDatabaseService.closeConnection();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
