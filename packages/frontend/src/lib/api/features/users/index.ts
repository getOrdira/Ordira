// src/lib/api/features/users/index.ts
// Users API barrel export

import usersAnalyticsApi from './usersAnalytics.api';
import usersAuthApi from './usersAuth.api';
import usersDataApi from './usersData.api';
import usersProfileApi from './usersProfile.api';
import usersCacheApi from './usersCache.api';
import usersSearchApi from './usersSearch.api';
import usersValidationApi from './usersValidation.api';

export * from './usersAnalytics.api';
export * from './usersAuth.api';
export * from './usersData.api';
export * from './usersProfile.api';
export * from './usersCache.api';
export * from './usersSearch.api';
export * from './usersValidation.api';

export {
  usersAnalyticsApi,
  usersAuthApi,
  usersDataApi,
  usersProfileApi,
  usersCacheApi,
  usersSearchApi,
  usersValidationApi
};

export const usersApi = {
  analytics: usersAnalyticsApi,
  auth: usersAuthApi,
  data: usersDataApi,
  profile: usersProfileApi,
  cache: usersCacheApi,
  search: usersSearchApi,
  validation: usersValidationApi
};

export default usersApi;
