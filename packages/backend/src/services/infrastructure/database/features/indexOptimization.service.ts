import mongoose from 'mongoose';
import { logger } from '../../../../utils/logger';

export interface IndexReportItem {
  collection: string;
  expectedIndexes: string[];
  missingIndexes: string[];
  existingIndexes: string[];
}

export interface IndexReport {
  generatedAt: string;
  items: IndexReportItem[];
}

const EXPECTED_INDEXES: Record<string, string[]> = {
  users: [
    'user_text_search',
    'user_active_recent',
    'user_email_verification',
    'user_voting_history',
    'user_brand_interactions'
  ],
  businesses: [
    'business_text_search',
    'business_subscription_plan',
    'business_status'
  ],
  manufacturers: [
    'manufacturer_text_search',
    'manufacturer_industry_status',
    'manufacturer_location',
    'manufacturer_active_recent'
  ],
  products: [
    'product_business_created',
    'product_business_category',
    'product_active_status',
    'product_text_search'
  ],
  votingrecords: [
    'votingrecord_business_timestamp',
    'votingrecord_business_proposal',
    'votingrecord_voter_business'
  ],
  brandsettings: [
    'brandsettings_business_unique',
    'brandsettings_vote_contract',
    'brandsettings_nft_contract'
  ],
  certificates: [
    'certificate_business_status',
    'certificate_token_lookup',
    'certificate_recipient_lookup'
  ],
  media: [
    'media_business_category',
    'media_manufacturer_category',
    'media_file_type'
  ]
};

export class DatabaseOptimizationService {
  async generateIndexReport(): Promise<IndexReport> {
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not available. Ensure MongoDB is connected before generating index report.');
    }
    
    // Verify we're using the correct database (not defaulting to 'test')
    const dbName = db.databaseName;
    if (dbName === 'test' && process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('/test')) {
      logger.warn(`Index inspection using 'test' database, but MONGODB_URI doesn't specify 'test'. Current database: ${dbName}`);
    }
    
    const items: IndexReportItem[] = [];

    for (const [collectionName, expectedIndexes] of Object.entries(EXPECTED_INDEXES)) {
      try {
        // Check if collection exists before trying to get indexes
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length === 0) {
          // Collection doesn't exist yet - this is fine, just log and continue
          logger.debug(`Collection ${collectionName} does not exist yet, skipping index inspection`);
          items.push({
            collection: collectionName,
            expectedIndexes,
            missingIndexes: expectedIndexes,
            existingIndexes: []
          });
          continue;
        }
        
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        const existingNames = indexes.map((idx) => idx.name);

        const missing = expectedIndexes.filter((name) => !existingNames.includes(name));

        items.push({
          collection: collectionName,
          expectedIndexes,
          missingIndexes: missing,
          existingIndexes: existingNames
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Only log as warning if it's not a "namespace doesn't exist" error (which is expected for new collections)
        if (!errorMessage.includes('ns does not exist')) {
          logger.warn(`Failed to inspect indexes for collection ${collectionName}`, {
            error: errorMessage
          });
        }

        items.push({
          collection: collectionName,
          expectedIndexes,
          missingIndexes: expectedIndexes,
          existingIndexes: []
        });
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      items
    };
  }

  logIndexReport(report: IndexReport): void {
    for (const item of report.items) {
      if (item.missingIndexes.length === 0) {
        logger.info(`Indexes verified for ${item.collection}`, {
          collection: item.collection,
          indexCount: item.existingIndexes.length
        });
      } else {
        logger.warn(`Missing indexes detected for ${item.collection}`, {
          collection: item.collection,
          missing: item.missingIndexes
        });
      }
    }
  }
}

export const databaseOptimizationService = new DatabaseOptimizationService();
