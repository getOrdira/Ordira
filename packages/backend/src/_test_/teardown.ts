/**
 * Test Teardown File
 * 
 * Global cleanup after all tests complete.
 * This runs once after all test suites finish.
 */

import mongoose from 'mongoose';

/**
 * Global teardown function
 * Cleans up resources after all tests
 */
export default async function globalTeardown(): Promise<void> {
  // Close MongoDB connection if open
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
  
  // Force exit to prevent hanging processes
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

