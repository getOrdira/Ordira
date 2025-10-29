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
    const items: IndexReportItem[] = [];

    for (const [collectionName, expectedIndexes] of Object.entries(EXPECTED_INDEXES)) {
      try {
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
        logger.warn(`Failed to inspect indexes for collection ${collectionName}`, {
          error: error instanceof Error ? error.message : error
        });

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
