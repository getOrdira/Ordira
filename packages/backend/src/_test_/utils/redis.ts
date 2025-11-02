/**
 * Redis Test Utilities
 * 
 * Provides in-memory Redis mock using ioredis-mock for isolated tests.
 * Each test file can use a fresh Redis instance.
 */

import Redis from 'ioredis-mock';
import { Redis as RedisType } from 'ioredis';

let redisClient: RedisType | null = null;

/**
 * Creates a new Redis mock client for testing
 * 
 * @returns RedisType In-memory Redis client
 */
export function createRedisMock(): RedisType {
  // Create a new mock Redis instance
  const client = new Redis({
    // Mock Redis doesn't need connection options
    // but we include them for consistency
    lazyConnect: false,
  });
  
  return client;
}

/**
 * Gets or creates a singleton Redis mock client
 * Useful for tests that need to share state across multiple operations
 * 
 * @returns RedisType Redis client
 */
export function getRedisMock(): RedisType {
  if (!redisClient) {
    redisClient = createRedisMock();
  }
  
  return redisClient;
}

/**
 * Clears all data from the Redis mock
 * Useful for cleaning up between tests
 * 
 * @param client Optional Redis client, uses singleton if not provided
 * @returns Promise<void>
 */
export async function clearRedis(client?: RedisType): Promise<void> {
  const redis = client || redisClient;
  
  if (redis) {
    await redis.flushall();
    console.log('✅ Redis cleared');
  }
}

/**
 * Closes the Redis mock connection
 * 
 * @param client Optional Redis client, uses singleton if not provided
 * @returns Promise<void>
 */
export async function closeRedis(client?: RedisType): Promise<void> {
  const redis = client || redisClient;
  
  if (redis) {
    await redis.quit();
    console.log('✅ Redis connection closed');
  }
  
  if (client === redisClient) {
    redisClient = null;
  }
}

/**
 * Resets the singleton Redis client
 * Useful for test isolation
 */
export function resetRedisMock(): void {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
}

/**
 * Creates a Redis mock that can be injected into services
 * This allows dependency injection of Redis for testing
 * 
 * @returns RedisType Mock Redis client ready for DI
 */
export function createTestRedis(): RedisType {
  return createRedisMock();
}

