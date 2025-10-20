// src/services/users/index.ts

import { userDataService } from './core/userData.service';
import { userAuthService } from './features/auth.service';
import { userProfileService } from './features/profile.service';
import { userSearchService } from './features/search.service';
import { userAnalyticsService } from './features/analytics.service';
import { userCacheService } from './utils/cache.service';
import { userProfileFormatterService } from './utils/profileFormatter.service';
import { userValidationService } from './validation/userValidation.service';

export { userDataService, UserDataService } from './core/userData.service';

export {
  userAuthService,
  UserAuthService
} from './features/auth.service';

export {
  userProfileService,
  UserProfileService
} from './features/profile.service';

export {
  userSearchService,
  UserSearchService
} from './features/search.service';

export {
  userAnalyticsService,
  UserAnalyticsService
} from './features/analytics.service';

export {
  userCacheService,
  UserCacheService
} from './utils/cache.service';

export {
  userProfileFormatterService,
  UserProfileFormatterService
} from './utils/profileFormatter.service';

export {
  userValidationService,
  UserValidationService
} from './validation/userValidation.service';

export type {
  CreateUserData,
  UpdateUserData,
  UserSearchParams,
  UserProfile,
  UserAnalytics,
  UserPreferences,
  UserAddress
} from './utils/types';

export const userServices = {
  auth: userAuthService,
  profile: userProfileService,
  search: userSearchService,
  analytics: userAnalyticsService,
  data: userDataService,
  cache: userCacheService,
  formatter: userProfileFormatterService,
  validation: userValidationService
};
