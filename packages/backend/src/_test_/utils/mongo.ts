/**
 * MongoDB Test Utilities
 * 
 * Provides MongoDB Memory Server for isolated test databases.
 * Each test file gets its own in-memory MongoDB instance.
 */

import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

/**
 * Starts a MongoDB Memory Server instance
 * 
 * @returns Promise<void>
 */
export async function startMongoMemoryServer(): Promise<void> {
  if (mongoServer) {
    return; // Already started
  }
  
  try {
    mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '6.0.0', // Match your MongoDB version
      },
      instance: {
        dbName: 'test-db',
      },
    });
    
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    
    console.log('✅ MongoDB Memory Server started');
  } catch (error) {
    console.error('❌ Failed to start MongoDB Memory Server:', error);
    throw error;
  }
}

/**
 * Stops the MongoDB Memory Server and closes connections
 * 
 * @returns Promise<void>
 */
export async function stopMongoMemoryServer(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
    console.log('✅ MongoDB Memory Server stopped');
  }
}

/**
 * Clears all collections in the test database
 * Useful for cleaning up between tests
 * 
 * @returns Promise<void>
 */
export async function clearDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return; // Not connected
  }
  
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  
  console.log('✅ Database cleared');
}

/**
 * Drops all collections in the test database
 * More aggressive than clearDatabase - removes indexes too
 * 
 * @returns Promise<void>
 */
export async function dropDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return; // Not connected
  }
  
  await mongoose.connection.db.dropDatabase();
  console.log('✅ Database dropped');
}

/**
 * Gets the MongoDB connection for direct access if needed
 * 
 * @returns Connection
 */
export function getMongoConnection(): Connection {
  return mongoose.connection;
}

/**
 * Gets the MongoDB Memory Server instance
 * 
 * @returns MongoMemoryServer | null
 */
export function getMongoServer(): MongoMemoryServer | null {
  return mongoServer;
}

