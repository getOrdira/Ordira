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
    const mongoUri = process.env.MONGODB_URI || '';
    
    // Extract database name from URI if present
    let expectedDbName: string | null = null;
    if (mongoUri) {
      // Try to extract database name from URI (format: mongodb://.../database? or mongodb+srv://.../database?)
      const uriMatch = mongoUri.match(/\/([^\/\?]+)(\?|$)/);
      if (uriMatch && uriMatch[1] && uriMatch[1] !== 'test') {
        expectedDbName = uriMatch[1];
      }
    }
    
    if (dbName === 'test' && expectedDbName && expectedDbName !== 'test') {
      logger.warn(`Index inspection using 'test' database, but MONGODB_URI specifies '${expectedDbName}'. This may indicate the database name is missing from the connection string. Current database: ${dbName}`);
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

  /**
   * Create missing indexes based on expected index definitions
   * This function creates the indexes that are detected as missing
   */
  async createMissingIndexes(): Promise<{ created: number; failed: number; details: Array<{ collection: string; index: string; status: 'created' | 'failed' | 'skipped'; error?: string }> }> {
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not available. Ensure MongoDB is connected before creating indexes.');
    }

    const report = await this.generateIndexReport();
    const results: Array<{ collection: string; index: string; status: 'created' | 'failed' | 'skipped'; error?: string }> = [];
    let created = 0;
    let failed = 0;

    // Index definitions mapped by collection and index name
    const indexDefinitions: Record<string, Record<string, any>> = {
      users: {
        user_text_search: {
          email: 'text',
          fullName: 'text',
          firstName: 'text',
          lastName: 'text'
        },
        user_active_recent: {
          isActive: 1,
          lastLoginAt: -1,
          createdAt: -1
        },
        user_email_verification: {
          isEmailVerified: 1,
          emailVerifiedAt: -1,
          isActive: 1
        },
        user_voting_history: {
          'votingHistory.businessId': 1,
          'votingHistory.votedAt': -1
        },
        user_brand_interactions: {
          'brandInteractions.businessId': 1,
          'brandInteractions.lastInteraction': -1
        }
      },
      businesses: {
        business_text_search: {
          businessName: 'text',
          description: 'text',
          industry: 'text',
          contactEmail: 'text'
        },
        business_subscription_plan: {
          'subscription.plan': 1,
          'subscription.status': 1,
          createdAt: -1
        },
        business_status: {
          isActive: 1,
          isVerified: 1,
          createdAt: -1
        }
      },
      manufacturers: {
        manufacturer_text_search: {
          name: 'text',
          industry: 'text',
          description: 'text',
          'location.country': 'text'
        },
        manufacturer_industry_status: {
          industry: 1,
          isVerified: 1,
          isActive: 1
        },
        manufacturer_location: {
          'location.country': 1,
          'location.city': 1,
          isActive: 1
        },
        manufacturer_active_recent: {
          isActive: 1,
          lastLoginAt: -1,
          createdAt: -1
        }
      },
      products: {
        product_business_created: {
          business: 1,
          createdAt: -1
        },
        product_business_category: {
          business: 1,
          category: 1,
          isActive: 1
        },
        product_active_status: {
          isActive: 1,
          createdAt: -1
        },
        product_text_search: {
          name: 'text',
          description: 'text',
          category: 'text'
        }
      },
      votingrecords: {
        votingrecord_business_timestamp: {
          business: 1,
          timestamp: -1
        },
        votingrecord_business_proposal: {
          business: 1,
          proposalId: 1
        },
        votingrecord_voter_business: {
          voterAddress: 1,
          business: 1
        }
      },
      brandsettings: {
        brandsettings_business_unique: {
          business: 1
        },
        brandsettings_vote_contract: {
          voteContractAddress: 1
        },
        brandsettings_nft_contract: {
          nftContractAddress: 1
        }
      },
      certificates: {
        certificate_business_status: {
          business: 1,
          status: 1,
          issuedAt: -1
        },
        certificate_token_lookup: {
          tokenId: 1,
          business: 1
        },
        certificate_recipient_lookup: {
          recipient: 1,
          business: 1
        }
      },
      media: {
        media_business_category: {
          business: 1,
          category: 1,
          uploadedAt: -1
        },
        media_manufacturer_category: {
          manufacturer: 1,
          category: 1,
          uploadedAt: -1
        },
        media_file_type: {
          fileType: 1,
          business: 1
        }
      }
    };

    // Index options for specific indexes
    const indexOptions: Record<string, Record<string, any>> = {
      users: {
        user_text_search: {
          weights: {
            email: 10,
            fullName: 5,
            firstName: 3,
            lastName: 3
          }
        },
        user_active_recent: {
          partialFilterExpression: { isActive: true }
        },
        user_voting_history: {
          sparse: true
        },
        user_brand_interactions: {
          sparse: true
        }
      },
      businesses: {
        business_text_search: {
          weights: {
            businessName: 10,
            industry: 5,
            description: 3,
            contactEmail: 2
          }
        }
      },
      manufacturers: {
        manufacturer_text_search: {
          weights: {
            name: 10,
            industry: 5,
            description: 3
          }
        }
      },
      products: {
        product_text_search: {
          weights: {
            name: 10,
            description: 5,
            category: 3
          }
        }
      },
      brandsettings: {
        brandsettings_business_unique: {
          unique: true,
          sparse: true
        }
      }
    };

    for (const item of report.items) {
      if (item.missingIndexes.length === 0) {
        continue; // Skip collections with no missing indexes
      }

      const collection = db.collection(item.collection);
      const definitions = indexDefinitions[item.collection] || {};
      const options = indexOptions[item.collection] || {};

      for (const indexName of item.missingIndexes) {
        try {
          const indexDef = definitions[indexName];
          if (!indexDef) {
            logger.warn(`Index definition not found for ${item.collection}.${indexName}, skipping`);
            results.push({
              collection: item.collection,
              index: indexName,
              status: 'skipped',
              error: 'Index definition not found'
            });
            continue;
          }

          const indexOpts = options[indexName] || {};
          
          // Create the index
          await collection.createIndex(indexDef, {
            name: indexName,
            background: true, // Create in background to avoid blocking
            ...indexOpts
          });

          logger.info(`✅ Created index ${indexName} on collection ${item.collection}`);
          results.push({
            collection: item.collection,
            index: indexName,
            status: 'created'
          });
          created++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          // Check if index already exists (race condition)
          if (errorMessage.includes('already exists') || errorMessage.includes('duplicate key')) {
            logger.debug(`Index ${indexName} already exists on ${item.collection}, skipping`);
            results.push({
              collection: item.collection,
              index: indexName,
              status: 'skipped',
              error: 'Index already exists'
            });
          } else {
            logger.error(`Failed to create index ${indexName} on ${item.collection}:`, { error: errorMessage });
            results.push({
              collection: item.collection,
              index: indexName,
              status: 'failed',
              error: errorMessage
            });
            failed++;
          }
        }
      }
    }

    return { created, failed, details: results };
  }
}

export const databaseOptimizationService = new DatabaseOptimizationService();
