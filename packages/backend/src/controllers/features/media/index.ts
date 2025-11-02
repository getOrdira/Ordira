// src/controllers/features/media/index.ts
// Export all media feature controllers

export * from './mediaBase.controller';
export * from './mediaData.controller';
export * from './mediaUpload.controller';
export * from './mediaSearch.controller';
export * from './mediaAnalytics.controller';
export * from './mediaDeletion.controller';

// Export controller instances
export { mediaDataController } from './mediaData.controller';
export { mediaUploadController } from './mediaUpload.controller';
export { mediaSearchController } from './mediaSearch.controller';
export { mediaAnalyticsController } from './mediaAnalytics.controller';
export { mediaDeletionController } from './mediaDeletion.controller';

