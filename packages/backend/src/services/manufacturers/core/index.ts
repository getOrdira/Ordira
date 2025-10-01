// src/services/manufacturers/core/index.ts

export {
  ManufacturerDataService,
  manufacturerDataCoreService
} from './manufacturerData.service';

export {
  ManufacturerAccountService,
  manufacturerAccountCoreService
} from './manufacturerAccount.service';

export {
  ManufacturerProfileService,
  manufacturerProfileCoreService
} from './manufacturerProfile.service';

// Export types from core services
export type {
  ManufacturerSearchParams,
  RegisterManufacturerData,
  UpdateManufacturerData
} from './manufacturerData.service';

export type {
  AccountActivity,
  NotificationPreferences,
  DataExportResult,
  ProfilePictureUploadResult,
  SoftDeleteResult,
  ActivityFilters
} from './manufacturerAccount.service';

export type {
  ManufacturerProfile,
  ManufacturerSearchResult,
  SearchOptions,
  SearchResult,
  ProfileContext
} from './manufacturerProfile.service';